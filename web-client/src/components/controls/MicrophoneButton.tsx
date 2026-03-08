import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api } from '../../api';
import {
  deafEnabledStorage,
  micDeviceStorage,
  micEnabledStorage,
  noiseCancelStorage,
  useStorageItemState,
} from '../../storage';
import type { ProducerId } from '../../../../libs/api/entities';
import MicIcon from '../../assets/mic.svg?react';
import MicOffIcon from '../../assets/mic-off.svg?react';
import { ControlButton } from './ControlButton';
import { sounds } from '../../sounds';

type MicrophoneButtonProps = {
  sendTransport: Transport | null;
  onLog: (entry: string) => void;
};

export function MicrophoneButton({ sendTransport, onLog }: MicrophoneButtonProps) {
  const [active, setActive] = useState(false);
  const [noiseEnabled, setNoiseEnabled] = useStorageItemState(noiseCancelStorage);
  const [isDeaf, setIsDeaf] = useStorageItemState(deafEnabledStorage);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useStorageItemState(micDeviceStorage);
  const producerRef = useRef<Producer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawTrackRef = useRef<MediaStreamTrack | null>(null); // original getUserMedia track for instant mute
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const noiseNodeRef = useRef<AudioWorkletNode | null>(null);
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const wasActiveBeforeDeafRef = useRef(false);
  const prevDeafRef = useRef(isDeaf);

  const loadDevices = async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((d) => d.kind === 'audioinput'));
  };

  const onUndeafen = () => {
    setIsDeaf(false);
    sounds.undeafen();
    void api.Voice.setDeaf({ isDeaf: false });
  };

  const teardownAudio = async () => {
    noiseNodeRef.current?.port.postMessage('destroy');
    noiseNodeRef.current = null;
    sourceNodeRef.current = null;
    destNodeRef.current = null;
    rawTrackRef.current = null;
    await audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Closes server producer and tears down audio pipeline.
  // Called on unmount or device switch, not on regular mute/unmute.
  const fullStop = async () => {
    if (producerRef.current) {
      await api.Voice.closeProducer({ producerId: producerRef.current.id as ProducerId });
      producerRef.current.close();
      producerRef.current = null;
    }
    await teardownAudio();
  };

  // Disables the raw mic track so the pipeline sends silence.
  const mute = (silent = false, preserveStorage = false) => {
    if (rawTrackRef.current) rawTrackRef.current.enabled = false;
    if (!preserveStorage) micEnabledStorage.set(false);
    setActive(false);
    if (!silent) sounds.mute();
  };

  // Re-enables the raw mic track, or calls init() on first use.
  const unmute = (deviceId?: string, silent = false) => {
    if (rawTrackRef.current) {
      rawTrackRef.current.enabled = true;
      micEnabledStorage.set(true);
      setActive(true);
      if (!silent) sounds.unmute();
    } else {
      void init(deviceId, silent);
    }
  };

  const init = async (deviceId?: string, silent = false) => {
    if (!sendTransport || sendTransport.closed) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;
      rawTrackRef.current = stream.getAudioTracks()[0];

      // Detect which device was actually used and refresh labels
      const actualDeviceId = rawTrackRef.current.getSettings().deviceId;
      if (actualDeviceId) setSelectedDeviceId(actualDeviceId);
      void loadDevices();

      // Route mic through RNNoise AudioWorklet for neural noise suppression.
      // noiseSuppression is disabled in getUserMedia above to avoid double-processing.
      const audioCtx = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioCtx;
      await audioCtx.audioWorklet.addModule('/noise-worklet.js');
      const source = audioCtx.createMediaStreamSource(stream);
      const noiseNode = new AudioWorkletNode(audioCtx, 'noise-processor');
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(noiseNode).connect(dest);
      sourceNodeRef.current = source;
      noiseNodeRef.current = noiseNode;
      destNodeRef.current = dest;
      setNoiseEnabled(true);

      const audioTrack = dest.stream.getAudioTracks()[0];
      const producer = await sendTransport.produce({ track: audioTrack, appData: { source: 'user' } });
      producerRef.current = producer;
      micEnabledStorage.set(true);
      setActive(true);
      if (!silent) sounds.unmute();
    } catch (error) {
      await teardownAudio();
      onLog(`❌ Error: ${error}`);
    }
  };

  // Reconnect audio graph when noise setting changes
  useEffect(() => {
    const source = sourceNodeRef.current;
    const noiseNode = noiseNodeRef.current;
    const dest = destNodeRef.current;
    if (!source || !noiseNode || !dest) return;

    if (noiseEnabled) {
      source.disconnect(dest);
      source.connect(noiseNode);
      noiseNode.connect(dest);
    } else {
      source.disconnect(noiseNode);
      noiseNode.disconnect(dest);
      source.connect(dest);
    }
  }, [noiseEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (active) {
      await fullStop();
      await init(deviceId, true);
    }
  };

  // React to deaf state transitions: auto-mute on deafen, restore on undeafen
  useEffect(() => {
    if (!prevDeafRef.current && isDeaf) {
      wasActiveBeforeDeafRef.current = active;
      if (active) mute(true, true);
    } else if (prevDeafRef.current && !isDeaf) {
      if (wasActiveBeforeDeafRef.current) unmute(selectedDeviceId, true);
      wasActiveBeforeDeafRef.current = false;
    }
    prevDeafRef.current = isDeaf;
  }, [isDeaf]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start mic when transport is ready if it was enabled in the previous session
  useEffect(() => {
    if (sendTransport && micEnabledStorage.get()) {
      if (isDeaf) {
        wasActiveBeforeDeafRef.current = true;
      } else {
        unmute(selectedDeviceId, true);
      }
    }
  }, [sendTransport]); // eslint-disable-line react-hooks/exhaustive-deps

  // Release mic track on unmount (channel switch or leave)
  useEffect(() => {
    return () => {
      void fullStop();
    };
  }, []);

  return (
    <ControlButton
      icon={active ? <MicIcon width={20} height={20} /> : <MicOffIcon width={20} height={20} />}
      variant={active ? 'green' : 'default'}
      onClick={
        isDeaf
          ? () => {
              wasActiveBeforeDeafRef.current = true;
              onUndeafen();
            }
          : active
            ? () => mute()
            : () => unmute(selectedDeviceId)
      }
      disabled={!sendTransport}
      title={active ? 'Mute microphone' : 'Unmute microphone'}
      picker={{
        items: devices.map((d) => ({ key: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 8)}` })),
        selected: selectedDeviceId,
        onSelect: (key) => void selectDevice(key),
        onOpen: () => void loadDevices(),
        emptyListTitle: 'No microphones found',
      }}
    />
  );
}
