import { useEffect, useRef, useState } from 'react';
import type { Transport } from 'mediasoup-client/types';
import { api } from '../../api';
import {
  deafEnabledStorage,
  micDeviceStorage,
  micEnabledStorage,
  noiseCancelStorage,
  useStorageItemState,
} from '../../storage';
import MicIcon from '../../assets/mic.svg?react';
import MicOffIcon from '../../assets/mic-off.svg?react';
import { ControlButton } from './ControlButton';
import { sounds } from '../../sounds';
import { MicPipeline } from './MicPipeline';

type MicrophoneButtonProps = {
  sendTransport: Transport | null;
  onLog: (entry: string) => void;
};

export function MicrophoneButton({ sendTransport, onLog }: MicrophoneButtonProps) {
  const [active, setActive] = useState(false);
  const [noiseEnabled] = useStorageItemState(noiseCancelStorage);
  const [isDeaf, setIsDeaf] = useStorageItemState(deafEnabledStorage);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useStorageItemState(micDeviceStorage);
  const wasActiveBeforeDeafRef = useRef(false);
  const prevDeafRef = useRef(isDeaf);

  const pipelineRef = useRef<MicPipeline | null>(null);

  const getPipeline = (): MicPipeline => {
    if (!pipelineRef.current) {
      pipelineRef.current = new MicPipeline({
        onStateChange: ({ active: a }) => {
          setActive(a);
        },
        onDeviceDetected: (deviceId) => {
          setSelectedDeviceId(deviceId);
          void loadDevices();
        },
        onError: onLog,
      });
      pipelineRef.current.setNoiseEnabled(noiseEnabled);
    }
    return pipelineRef.current;
  };

  const loadDevices = async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((d) => d.kind === 'audioinput'));
  };

  const onUndeafen = () => {
    setIsDeaf(false);
    sounds.undeafen();
    void api.WebRtc.setDeaf({ isDeaf: false });
  };

  const mute = (silent = false) => {
    getPipeline().mute();
    micEnabledStorage.set(false);
    if (!silent) sounds.mute();
  };

  const unmute = (deviceId?: string, silent = false) => {
    if (!sendTransport || sendTransport.closed) return;
    getPipeline().unmute(sendTransport, deviceId);
    micEnabledStorage.set(true);
    if (!silent) sounds.unmute();
  };

  const selectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (active && sendTransport && !sendTransport.closed) {
      getPipeline().stop();
      getPipeline().start(sendTransport, deviceId);
    }
  };

  // Sync noise setting into pipeline
  useEffect(() => {
    getPipeline().setNoiseEnabled(noiseEnabled);
  }, [noiseEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to deaf state transitions: auto-mute on deafen, restore on undeafen
  useEffect(() => {
    if (!prevDeafRef.current && isDeaf) {
      wasActiveBeforeDeafRef.current = active;
      if (active) getPipeline().mute();
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
      pipelineRef.current?.stop();
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
        onSelect: (key) => selectDevice(key),
        onOpen: () => void loadDevices(),
        emptyListTitle: 'No microphones found',
      }}
    />
  );
}
