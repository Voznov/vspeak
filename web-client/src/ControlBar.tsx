import type { Transport } from 'mediasoup-client/types';
import PhoneOffIcon from './assets/phone-off.svg?react';
import { CameraButton } from './CameraButton';
import { MicrophoneButton } from './MicrophoneButton';
import { ScreenShareButton } from './ScreenShareButton';
import type { ChannelId } from '../../libs/api/entities';

type ControlBarProps = {
  channelId: ChannelId;
  sendTransport: Transport | null;
  connecting: boolean;
  onLog: (entry: string) => void;
  onLeave: () => void;
};

export function ControlBar({ channelId, sendTransport, connecting, onLog, onLeave }: ControlBarProps) {
  return (
    <div
      key={channelId}
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        background: 'rgba(18, 18, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        borderRadius: '40px',
        padding: '8px',
        zIndex: 100,
      }}
    >
      <MicrophoneButton sendTransport={sendTransport} onLog={onLog} />
      <CameraButton sendTransport={sendTransport} onLog={onLog} />
      <ScreenShareButton sendTransport={sendTransport} onLog={onLog} />
      <button
        onClick={onLeave}
        disabled={connecting}
        title="Leave channel"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: connecting ? 'not-allowed' : 'pointer',
          background: '#c62828',
          color: '#fff',
          flexShrink: 0,
          opacity: connecting ? 0.6 : 1,
        }}
      >
        <PhoneOffIcon width={20} height={20} />
      </button>
    </div>
  );
}
