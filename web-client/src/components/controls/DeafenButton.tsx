import { api } from '../../api';
import { deafEnabledStorage } from '../../storage';
import HeadphonesIcon from '../../assets/headphones.svg?react';
import HeadphonesOffIcon from '../../assets/headphones-off.svg?react';
import { ControlButton } from './ControlButton';

type DeafenButtonProps = {
  isDeaf: boolean;
  onToggle: (isDeaf: boolean) => void;
};

export function DeafenButton({ isDeaf, onToggle }: DeafenButtonProps) {
  const toggle = async () => {
    const next = !isDeaf;
    deafEnabledStorage.set(next);
    onToggle(next);
    await api.setDeaf({ isDeaf: next });
  };

  return (
    <ControlButton
      icon={isDeaf ? <HeadphonesOffIcon width={20} height={20} /> : <HeadphonesIcon width={20} height={20} />}
      variant={isDeaf ? 'red' : 'default'}
      onClick={() => void toggle()}
      title={isDeaf ? 'Undeafen' : 'Deafen'}
    />
  );
}
