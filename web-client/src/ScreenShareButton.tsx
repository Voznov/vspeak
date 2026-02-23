import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api } from './api';
import type { ProducerId } from '../../libs/api/entities';
import ScreenShareIcon from './assets/screen-share.svg?react';
import ScreenShareOffIcon from './assets/screen-share-off.svg?react';
import { theme } from './theme';

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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
        },
        audio: true,
      });
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const videoProducer = await sendTransport.produce({
          track: videoTrack,
          appData: { source: 'display' },
          encodings: [{ maxBitrate: 10_000_000 }],
        });
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
      title={active ? 'Stop screen share' : 'Start screen share'}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: !sendTransport ? 'not-allowed' : 'pointer',
        background: active ? theme.accent.active : theme.button.inactive,
        color: theme.text.onAccent,
        flexShrink: 0,
      }}
    >
      {active ? <ScreenShareIcon width={20} height={20} /> : <ScreenShareOffIcon width={20} height={20} />}
    </button>
  );
}
