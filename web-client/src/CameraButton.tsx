import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api } from './api';
import type { ProducerId } from '../../libs/api/entities';
import VideoIcon from './assets/video.svg?react';
import VideoOffIcon from './assets/video-off.svg?react';

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
        },
      });
      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      const producer = await sendTransport.produce({
        track: videoTrack,
        appData: { source: 'user' },
        encodings: [{ maxBitrate: 10_000_000 }],
      });
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
    <button
      onClick={active ? () => void stop() : () => void start()}
      disabled={!sendTransport}
      title={active ? 'Stop camera' : 'Start camera'}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: !sendTransport ? 'not-allowed' : 'pointer',
        background: active ? '#2e7d32' : 'rgba(255,255,255,0.15)',
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {active ? <VideoIcon width={20} height={20} /> : <VideoOffIcon width={20} height={20} />}
    </button>
  );
}
