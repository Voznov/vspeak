import { useState } from 'react';
import { api } from '../../api';
import { deafEnabledStorage, speakerDeviceStorage } from '../../storage';
import HeadphonesIcon from '../../assets/headphones.svg?react';
import HeadphonesOffIcon from '../../assets/headphones-off.svg?react';
import { ControlButton } from './ControlButton';

type SpeakerButtonProps = {
  isDeaf: boolean;
  onToggle: (isDeaf: boolean) => void;
  onSpeakerChange: (deviceId: string) => void;
};

export function SpeakerButton({ isDeaf, onToggle, onSpeakerChange }: SpeakerButtonProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(speakerDeviceStorage.get);

  const toggle = async () => {
    const next = !isDeaf;
    deafEnabledStorage.set(next);
    onToggle(next);
    await api.setDeaf({ isDeaf: next });
  };

  const loadDevices = async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((d) => d.kind === 'audiooutput'));
  };

  const selectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    speakerDeviceStorage.set(deviceId);
    onSpeakerChange(deviceId);
  };

  return (
    <ControlButton
      icon={isDeaf ? <HeadphonesOffIcon width={20} height={20} /> : <HeadphonesIcon width={20} height={20} />}
      variant={isDeaf ? 'red' : 'default'}
      onClick={() => void toggle()}
      title={isDeaf ? 'Undeafen' : 'Deafen'}
      picker={{
        items: devices.map((d) => ({ key: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 8)}` })),
        selected: selectedDeviceId,
        onSelect: selectDevice,
        onOpen: () => void loadDevices(),
        emptyListTitle: 'No speakers found',
      }}
    />
  );
}
