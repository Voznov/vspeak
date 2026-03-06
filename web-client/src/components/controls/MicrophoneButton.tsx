import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api } from '../../api';
import { micDeviceStorage, micEnabledStorage } from '../../storage';
import type { ProducerId } from '../../../../libs/api/entities';
import MicIcon from '../../assets/mic.svg?react';
import MicOffIcon from '../../assets/mic-off.svg?react';
import { ControlButton } from './ControlButton';
import { sounds } from '../../sounds';

type MicrophoneButtonProps = {
  sendTransport: Transport | null;
  isDeaf: boolean;
  onUndeafen: () => void;
  onLog: (entry: string) => void;
};

export function MicrophoneButton({ sendTransport, isDeaf, onUndeafen, onLog }: MicrophoneButtonProps) {
  const [active, setActive] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(micDeviceStorage.get);
  const producerRef = useRef<Producer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wasActiveBeforeDeafRef = useRef(false);
  const prevDeafRef = useRef(isDeaf);

  const loadDevices = async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((d) => d.kind === 'audioinput'));
  };

  const stop = async (silent = false, preserveStorage = false) => {
    if (producerRef.current) {
      await api.closeProducer({ producerId: producerRef.current.id as ProducerId });
      producerRef.current.close();
      producerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (!preserveStorage) micEnabledStorage.set(false);
    setActive(false);
    if (!silent) sounds.mute();
  };

  const start = async (deviceId?: string, silent = false) => {
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
      if (!silent) sounds.unmute();
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
      await stop(true);
      await start(deviceId, true);
    }
  };

  // React to deaf state transitions: auto-mute on deafen, restore on undeafen
  useEffect(() => {
    if (!prevDeafRef.current && isDeaf) {
      // Became deafened: save mic state and stop mic silently
      wasActiveBeforeDeafRef.current = active;
      if (active) void stop(true, true);
    } else if (prevDeafRef.current && !isDeaf) {
      // Became undeafened: restore mic to pre-deafen state
      if (wasActiveBeforeDeafRef.current) void start(selectedDeviceId, true);
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
        void start(selectedDeviceId, true);
      }
    }
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
      onClick={isDeaf
        ? () => { wasActiveBeforeDeafRef.current = true; onUndeafen(); }
        : active ? () => void stop() : () => void start(selectedDeviceId)}
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
