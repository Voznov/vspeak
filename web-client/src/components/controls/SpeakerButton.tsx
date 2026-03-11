import { useState } from 'react';
import { api } from '../../api';
import { deafEnabledStorage, speakerDeviceStorage, useStorageItemState } from '../../storage';
import HeadphonesIcon from '../../assets/headphones.svg?react';
import HeadphonesOffIcon from '../../assets/headphones-off.svg?react';
import { ControlButton } from './ControlButton';
import { sounds } from '../../sounds';

export function SpeakerButton() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isDeaf, setIsDeaf] = useStorageItemState(deafEnabledStorage);
  const [selectedDeviceId, setSelectedDeviceId] = useStorageItemState(speakerDeviceStorage);

  const toggle = async () => {
    const next = !isDeaf;
    setIsDeaf(next);
    if (next) sounds.deafen();
    else sounds.undeafen();
    await api.WebRtc.setDeaf({ isDeaf: next });
  };

  const loadDevices = async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    const filtered = all.filter((d) => d.kind === 'audiooutput');
    setDevices(filtered);
    const stored = speakerDeviceStorage.get();
    if (stored && !filtered.some((d) => d.deviceId === stored)) {
      selectDevice(undefined);
    }
  };

  const selectDevice = (deviceId: string | undefined) => {
    setSelectedDeviceId(deviceId);
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
