import type { Producer, Transport } from 'mediasoup-client/types';
import type { ProducerId } from '../../../../libs/api/entities';
import { api } from '../../api';

export type MicPipelineState = {
  active: boolean;
};

type MicPipelineCallbacks = {
  onStateChange: (state: MicPipelineState) => void;
  onDeviceDetected: (deviceId: string) => void;
  onError: (msg: string) => void;
};

/**
 * Manages the microphone audio pipeline: getUserMedia → RNNoise AudioWorklet → mediasoup producer.
 *
 * All operations are serialized via a promise queue so that rapid start/stop/mute sequences
 * never run concurrently.
 */
export class MicPipeline {
  private queue: Promise<void> = Promise.resolve();

  private stream: MediaStream | null = null;
  private rawTrack: MediaStreamTrack | null = null;
  private audioCtx: AudioContext | null = null;
  private producer: Producer | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private noiseNode: AudioWorkletNode | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private noiseEnabled = true;

  get active(): boolean {
    return this.rawTrack?.enabled ?? false;
  }

  constructor(private readonly callbacks: MicPipelineCallbacks) {}

  // Schedules a full pipeline start.
  start(transport: Transport, deviceId?: string): void {
    this.queue = this.queue.then(async () => this.runStart(transport, deviceId)).catch((e) => console.error('[MicPipeline] start error:', e));
  }

  // Schedules a full stop.
  stop(): void {
    this.queue = this.queue.then(async () => this.teardown()).catch((e) => console.error('[MicPipeline] stop error:', e));
  }

  // Disables the raw mic track so the pipeline sends silence (no server round-trip).
  mute(): void {
    this.queue = this.queue
      .then(async () => {
        if (this.rawTrack) this.rawTrack.enabled = false;
        if (this.producer) await api.WebRtc.pauseProducer({ producerId: this.producer.id as ProducerId });
        this.callbacks.onStateChange({ active: false });
      })
      .catch((e) => console.error('[MicPipeline] mute error:', e));
  }

  // Re-enables the raw mic track, or starts the pipeline if it isn't running yet.
  unmute(transport: Transport, deviceId?: string): void {
    this.queue = this.queue
      .then(async () => {
        if (this.rawTrack) {
          this.rawTrack.enabled = true;
          if (this.producer) await api.WebRtc.resumeProducer({ producerId: this.producer.id as ProducerId });
          this.callbacks.onStateChange({ active: true });
        } else {
          await this.runStart(transport, deviceId);
        }
      })
      .catch((e) => console.error('[MicPipeline] unmute error:', e));
  }

  // Rewires the audio graph to enable or disable RNNoise processing.
  setNoiseEnabled(enabled: boolean): void {
    this.queue = this.queue
      .then(() => {
        this.noiseEnabled = enabled;
        const { source, noiseNode, dest } = this;
        if (!source || !noiseNode || !dest) return;
        if (enabled) {
          source.disconnect(dest);
          source.connect(noiseNode).connect(dest);
        } else {
          source.disconnect(noiseNode);
          noiseNode.disconnect(dest);
          source.connect(dest);
        }
      })
      .catch((e) => console.error('[MicPipeline] setNoiseEnabled error:', e));
  }

  private async runStart(transport: Transport, deviceId?: string): Promise<void> {
    await this.teardown();

    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });

      const rawTrack = stream.getAudioTracks()[0];
      const actualDeviceId = rawTrack.getSettings().deviceId;
      if (actualDeviceId) this.callbacks.onDeviceDetected(actualDeviceId);

      audioCtx = new AudioContext({ sampleRate: 48000 });
      await audioCtx.audioWorklet.addModule('/noise-worklet.js');

      const source = audioCtx.createMediaStreamSource(stream);
      const noiseNode = new AudioWorkletNode(audioCtx, 'noise-processor');
      const dest = audioCtx.createMediaStreamDestination();
      if (this.noiseEnabled) {
        source.connect(noiseNode).connect(dest);
      } else {
        source.connect(dest);
      }

      const producer = await transport.produce({ track: dest.stream.getAudioTracks()[0], appData: { source: 'user' } });

      this.stream = stream;
      this.rawTrack = rawTrack;
      this.audioCtx = audioCtx;
      this.producer = producer;
      this.source = source;
      this.noiseNode = noiseNode;
      this.dest = dest;

      this.callbacks.onStateChange({ active: true });
    } catch (error) {
      stream?.getTracks().forEach((t) => t.stop());
      await audioCtx?.close();
      this.callbacks.onError(`❌ Error: ${error}`);
    }
  }

  private async teardown(): Promise<void> {
    if (this.producer) {
      const { producer } = this;
      this.producer = null;

      await api.WebRtc.closeProducer({ producerId: producer.id as ProducerId }).catch((e) => console.error('[MicPipeline] closeProducer error:', e));
      producer.close();
    }

    void this.audioCtx?.close();
    this.audioCtx = null;
    this.source = null;
    this.noiseNode = null;
    this.dest = null;
    this.rawTrack = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
