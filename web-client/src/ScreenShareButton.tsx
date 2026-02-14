import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api } from './api';
import type { ProducerId } from '../../libs/api/entities';

type ScreenShareButtonProps = {
  sendTransport: Transport | null;
  onLog: (entry: string) => void;
};

export function ScreenShareButton({ sendTransport, onLog }: ScreenShareButtonProps) {
  const [active, setActive] = useState(false);
  const videoProducerRef = useRef<Producer | null>(null);
  const audioProducerRef = useRef<Producer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = async () => {
    if (videoProducerRef.current) {
      await api.closeProducer({ producerId: videoProducerRef.current.id as ProducerId });
      videoProducerRef.current.close();
      videoProducerRef.current = null;
    }
    if (audioProducerRef.current) {
      await api.closeProducer({ producerId: audioProducerRef.current.id as ProducerId });
      audioProducerRef.current.close();
      audioProducerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  const start = async () => {
    if (!sendTransport) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const videoProducer = await sendTransport.produce({ track: videoTrack, appData: { source: 'display' } });
        videoProducerRef.current = videoProducer;
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const audioProducer = await sendTransport.produce({ track: audioTrack, appData: { source: 'display' } });
        audioProducerRef.current = audioProducer;
      }

      setActive(true);
    } catch (error) {
      onLog(`❌ Error: ${error}`);
    }
  };

  // Release screen share tracks on unmount (channel switch or leave)
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      videoProducerRef.current?.close();
      videoProducerRef.current = null;
      audioProducerRef.current?.close();
      audioProducerRef.current = null;
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
      {active ? '⏹ Stop Screen Share' : '🖥️ Start Screen Share'}
    </button>
  );
}
