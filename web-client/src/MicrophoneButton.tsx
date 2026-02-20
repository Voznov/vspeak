import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api } from './api';
import type { ProducerId } from '../../libs/api/entities';

type MicrophoneButtonProps = {
  sendTransport: Transport | null;
  onLog: (entry: string) => void;
};

export function MicrophoneButton({ sendTransport, onLog }: MicrophoneButtonProps) {
  const [active, setActive] = useState(false);
  const producerRef = useRef<Producer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = async () => {
    if (producerRef.current) {
      await api.closeProducer({ producerId: producerRef.current.id as ProducerId });
      producerRef.current.close();
      producerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  const start = async () => {
    if (!sendTransport) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;
      const audioTrack = stream.getAudioTracks()[0];
      const producer = await sendTransport.produce({ track: audioTrack, appData: { source: 'user' } });
      producerRef.current = producer;
      setActive(true);
    } catch (error) {
      onLog(`❌ Error: ${error}`);
    }
  };

  // Release mic track on unmount (channel switch or leave)
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      producerRef.current?.close();
      producerRef.current = null;
    };
  }, []);

  return (
    <button
      onClick={active ? () => void stop() : () => void start()}
      disabled={!sendTransport}
      style={{
        padding: '6px 12px',
        background: active ? '#e53935' : undefined,
        color: active ? '#fff' : undefined,
      }}
    >
      {active ? '⏹ Stop Microphone' : '🎤 Start Microphone'}
    </button>
  );
}
