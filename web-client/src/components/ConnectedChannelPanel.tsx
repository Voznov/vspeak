import PhoneOffIcon from '../assets/phone-off.svg?react';
import { theme } from '../theme';
import type { ConnQuality } from '../types';

type ConnectedChannelPanelProps = {
  channelName: string;
  connQuality: ConnQuality | null;
  onLeave: () => void;
};

export function ConnectedChannelPanel({ channelName, connQuality, onLeave }: ConnectedChannelPanelProps) {
  const dotColor = connQuality
    ? connQuality.rtt < 100 && (connQuality.packetLoss ?? 0) < 2
      ? theme.accent.primary
      : connQuality.rtt < 300 && (connQuality.packetLoss ?? 0) < 10
        ? theme.warning.primary
        : theme.danger.primary
    : theme.text.tertiary;

  return (
    <div
      style={{
        borderTop: `1px solid ${theme.border.primary}`,
        padding: '8px 12px',
        minHeight: '52px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: '8px',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              fontSize: '13px',
              lineHeight: 1,
              fontWeight: 600,
              color: theme.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {channelName}
          </span>
        </div>
        {connQuality && (
          <div style={{ fontSize: '11px', color: theme.text.tertiary }}>
            {connQuality.rtt} ms{connQuality.packetLoss !== null ? ` · ${connQuality.packetLoss}% loss` : ''} · {connQuality.jitter} ms jitter
          </div>
        )}
      </div>

      <button
        onClick={onLeave}
        title="Disconnect"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3px',
          borderRadius: '4px',
          flexShrink: 0,
        }}
      >
        <PhoneOffIcon width={20} height={20} />
      </button>
    </div>
  );
}
