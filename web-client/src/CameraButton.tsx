import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api } from './api';
import type { ProducerId } from '../../libs/api/entities';

type CameraButtonProps = {
  sendTransport: Transport | null;
  onLog: (entry: string) => void;
};

export function CameraButton({ sendTransport, onLog }: CameraButtonProps) {
  const [active, setActive] = useState(false);
  const producerRef = useRef<Producer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stop = async () => {
    if (producerRef.current) {
      await api.closeProducer({ producerId: producerRef.current.id as ProducerId });
      producerRef.current.close();
      producerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  };

  const start = async () => {
    if (!sendTransport) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      const producer = await sendTransport.produce({ track: videoTrack, appData: { source: 'user' } });
      producerRef.current = producer;
      setActive(true);
    } catch (error) {
      onLog(`❌ Error: ${error}`);
    }
  };

  // Release camera track on unmount (channel switch or leave)
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      producerRef.current?.close();
      producerRef.current = null;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={active ? () => void stop() : () => void start()}
        disabled={!sendTransport}
        style={{
          padding: '6px 12px',
          background: active ? '#e53935' : undefined,
          color: active ? '#fff' : undefined,
        }}
      >
        {active ? '⏹ Stop Camera' : '📹 Start Camera'}
      </button>
      {/* <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '8px',
          marginTop: '8px',
          display: active ? 'block' : 'none',
        }}
      /> */}
    </div>
  );
}
