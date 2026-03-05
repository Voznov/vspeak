import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api } from './api';
import { micDeviceStorage, micEnabledStorage } from './storage';
import type { ProducerId } from '../../libs/api/entities';
import MicIcon from './assets/mic.svg?react';
import MicOffIcon from './assets/mic-off.svg?react';
import { ControlButton } from './ControlButton';

type MicrophoneButtonProps = {
  sendTransport: Transport | null;
  onLog: (entry: string) => void;
};

export function MicrophoneButton({ sendTransport, onLog }: MicrophoneButtonProps) {
  const [active, setActive] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(micDeviceStorage.get);
  const producerRef = useRef<Producer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadDevices = async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((d) => d.kind === 'audioinput'));
  };

  const stop = async () => {
    if (producerRef.current) {
      await api.closeProducer({ producerId: producerRef.current.id as ProducerId });
      producerRef.current.close();
      producerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    micEnabledStorage.set(false);
    setActive(false);
  };

  const start = async (deviceId?: string) => {
    if (!sendTransport || sendTransport.closed) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;
      const audioTrack = stream.getAudioTracks()[0];

      // Detect which device was actually used and refresh labels
      const actualDeviceId = audioTrack.getSettings().deviceId;
      if (actualDeviceId) {
        setSelectedDeviceId(actualDeviceId);
        micDeviceStorage.set(actualDeviceId);
      }
      void loadDevices();

      const producer = await sendTransport.produce({ track: audioTrack, appData: { source: 'user' } });
      producerRef.current = producer;
      micEnabledStorage.set(true);
      setActive(true);
    } catch (error) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onLog(`❌ Error: ${error}`);
    }
  };

  const selectDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    micDeviceStorage.set(deviceId);
    if (active) {
      await stop();
      await start(deviceId);
    }
  };

  // Auto-start mic when transport is ready if it was enabled in the previous session
  useEffect(() => {
    if (sendTransport && micEnabledStorage.get()) void start(selectedDeviceId);
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
    <ControlButton
      icon={active ? <MicIcon width={20} height={20} /> : <MicOffIcon width={20} height={20} />}
      variant={active ? 'green' : 'default'}
      onClick={active ? () => void stop() : () => void start(selectedDeviceId)}
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
