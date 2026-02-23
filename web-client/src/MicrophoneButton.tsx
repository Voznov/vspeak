import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api, getMicEnabled, setMicEnabled } from './api';
import type { ProducerId } from '../../libs/api/entities';
import MicIcon from './assets/mic.svg?react';
import MicOffIcon from './assets/mic-off.svg?react';
import { theme } from './theme';

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
    setMicEnabled(false);
    setActive(false);
  };

  const start = async () => {
    if (!sendTransport || sendTransport.closed) return;
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
      setMicEnabled(true);
      setActive(true);
    } catch (error) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onLog(`❌ Error: ${error}`);
    }
  };

  // Auto-start mic when transport is ready if it was enabled in the previous session
  useEffect(() => {
    if (sendTransport && getMicEnabled()) void start();
  }, [sendTransport]); // eslint-disable-line react-hooks/exhaustive-deps

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
      title={active ? 'Mute microphone' : 'Unmute microphone'}
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
      {active ? <MicIcon width={20} height={20} /> : <MicOffIcon width={20} height={20} />}
    </button>
  );
}
