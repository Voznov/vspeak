import { api, setDeafEnabled } from './api';
import HeadphonesIcon from './assets/headphones.svg?react';
import HeadphonesOffIcon from './assets/headphones-off.svg?react';
import { theme } from './theme';

type DeafenButtonProps = {
  isDeaf: boolean;
  onToggle: (isDeaf: boolean) => void;
};

export function DeafenButton({ isDeaf, onToggle }: DeafenButtonProps) {
  const toggle = async () => {
    const next = !isDeaf;
    setDeafEnabled(next);
    onToggle(next);
    await api.setDeaf({ isDeaf: next });
  };

  return (
    <button
      onClick={() => void toggle()}
      title={isDeaf ? 'Undeafen' : 'Deafen'}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: isDeaf ? theme.danger.leave : theme.button.inactive,
        color: theme.text.onAccent,
        flexShrink: 0,
      }}
    >
      {isDeaf ? <HeadphonesOffIcon width={20} height={20} /> : <HeadphonesIcon width={20} height={20} />}
    </button>
  );
}
