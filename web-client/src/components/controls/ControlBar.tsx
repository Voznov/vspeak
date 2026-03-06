import type { Transport } from 'mediasoup-client/types';
import PhoneOffIcon from '../../assets/phone-off.svg?react';
import { api } from '../../api';
import { deafEnabledStorage } from '../../storage';
import { sounds } from '../../sounds';
import { theme } from '../../theme';
import { CameraButton } from './CameraButton';
import { ControlButton } from './ControlButton';
import { MicrophoneButton } from './MicrophoneButton';
import { ScreenShareButton } from './ScreenShareButton';
import { SpeakerButton } from './SpeakerButton';
import type { ChannelId } from '../../../../libs/api/entities';

type ControlBarProps = {
  channelId: ChannelId;
  sendTransport: Transport | null;
  connecting: boolean;
  isDeaf: boolean;
  onDeafToggle: (isDeaf: boolean) => void;
  onSpeakerChange: (deviceId: string) => void;
  onLog: (entry: string) => void;
  onLeave: () => void;
};

export function ControlBar({ channelId, sendTransport, connecting, isDeaf, onDeafToggle, onSpeakerChange, onLog, onLeave }: ControlBarProps) {
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
        background: theme.bg.controlBar,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${theme.border.primary}`,
        borderRadius: '12px',
        padding: '8px',
        zIndex: 100,
      }}
    >
      <SpeakerButton isDeaf={isDeaf} onToggle={onDeafToggle} onSpeakerChange={onSpeakerChange} />
      <MicrophoneButton
        sendTransport={sendTransport}
        isDeaf={isDeaf}
        onUndeafen={() => {
          deafEnabledStorage.set(false);
          onDeafToggle(false);
          sounds.undeafen();
          void api.Voice.setDeaf({ isDeaf: false });
        }}
        onLog={onLog}
      />
      <CameraButton sendTransport={sendTransport} onLog={onLog} />
      <ScreenShareButton sendTransport={sendTransport} onLog={onLog} />
      <ControlButton
        icon={<PhoneOffIcon width={20} height={20} />}
        variant="red"
        onClick={onLeave}
        disabled={connecting}
        title="Leave channel"
      />
    </div>
  );
}
