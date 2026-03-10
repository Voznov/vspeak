import { useEffect, useRef, useState } from 'react';
import type { ChannelId, ChannelWithUsers, User, UserId } from '../../../libs/api/entities';
import type { ConnQuality } from '../types';
import { ConnectedChannelPanel } from './ConnectedChannelPanel';
import HeadphonesOffIcon from '../assets/headphones-off.svg?react';
import MicOffIcon from '../assets/mic-off.svg?react';
import ScreenShareIcon from '../assets/screen-share.svg?react';
import VideoIcon from '../assets/video.svg?react';
import { theme } from '../theme';
import { UserAvatar } from './UserAvatar';

type ChannelSidebarProps = {
  channels: ChannelWithUsers[];
  activeChannelId: ChannelId | null;
  currentUser: User;
  speakingUserIds: Set<UserId>;
  connQuality: ConnQuality | null;
  onJoin: (channelId: ChannelId) => void;
  onLeave: () => Promise<void>;
  onCreate: (name: string) => Promise<void>;
  onRename: (channelId: ChannelId, name: string) => Promise<void>;
  onDelete: (channelId: ChannelId) => Promise<void>;
  onOpenSettings: () => void;
};

type ContextMenu = {
  channelId: ChannelId;
  x: number;
  y: number;
};

type ChannelModalMode = { type: 'create' } | { type: 'edit'; channelId: ChannelId; currentName: string };

function ContextMenuButton({
  onClick,
  color,
  hoverBg,
  children,
}: {
  onClick: () => void;
  color: string;
  hoverBg: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 16px',
        fontSize: '13px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        color,
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = hoverBg)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function ChannelModal({
  mode,
  onSubmit,
  onClose,
}: {
  mode: ChannelModalMode;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(mode.type === 'edit' ? mode.currentName : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const title = mode.type === 'create' ? 'Create Channel' : 'Rename Channel';
  const submitLabel = mode.type === 'create' ? (loading ? 'Creating…' : 'Create') : loading ? 'Saving…' : 'Save';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.bg.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: theme.bg.elevated,
          borderRadius: '10px',
          padding: '24px',
          width: '300px',
          boxShadow: theme.shadow.modal,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          color: theme.text.primary,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '16px' }}>{title}</div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Channel name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && void handleSubmit()}
          disabled={loading}
          style={{
            padding: '8px 10px',
            fontSize: '14px',
            border: `1px solid ${theme.border.input}`,
            borderRadius: '6px',
            outline: 'none',
            background: theme.bg.tertiary,
            color: theme.text.primary,
          }}
        />
        {error && <div style={{ fontSize: '12px', color: theme.danger.primary }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '7px 16px',
              fontSize: '13px',
              borderRadius: '6px',
              border: `1px solid ${theme.border.primary}`,
              background: theme.bg.tertiary,
              color: theme.text.primary,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={loading || !name.trim()}
            style={{
              padding: '7px 16px',
              fontSize: '13px',
              borderRadius: '6px',
              border: 'none',
              background: theme.accent.primary,
              color: theme.text.onAccent,
              cursor: loading || !name.trim() ? 'default' : 'pointer',
              opacity: loading || !name.trim() ? 0.6 : 1,
            }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChannelSidebar({
  channels,
  activeChannelId,
  currentUser,
  speakingUserIds,
  connQuality,
  onJoin,
  onLeave,
  onCreate,
  onRename,
  onDelete,
  onOpenSettings,
}: ChannelSidebarProps) {
  const [channelModal, setChannelModal] = useState<ChannelModalMode | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [panelHovered, setPanelHovered] = useState(false);
  const activeChannel = channels.find((ch) => ch.id === activeChannelId);
  const activeChannelName = activeChannel?.name;
  const currentUserIsConnected = activeChannel?.users.find((u) => u.id === currentUser.id)?.isConnected ?? true;

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('contextmenu', close);
    };
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, channelId: ChannelId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ channelId, x: e.clientX, y: e.clientY });
  };

  const handleContextJoinLeave = () => {
    if (!contextMenu) return;
    if (contextMenu.channelId === activeChannelId) {
      void onLeave();
    } else {
      onJoin(contextMenu.channelId);
    }
    setContextMenu(null);
  };

  const handleContextRename = () => {
    if (!contextMenu) return;
    const channel = channels.find((ch) => ch.id === contextMenu.channelId);
    if (!channel) return;
    setChannelModal({ type: 'edit', channelId: channel.id, currentName: channel.name });
    setContextMenu(null);
  };

  const handleContextDelete = () => {
    if (!contextMenu) return;
    void onDelete(contextMenu.channelId);
    setContextMenu(null);
  };

  return (
    <>
      <div
        style={{
          width: '220px',
          minWidth: '220px',
          borderRight: `1px solid ${theme.border.primary}`,
          display: 'flex',
          flexDirection: 'column',
          background: theme.bg.secondary,
        }}
      >
        {/* Channel list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', paddingLeft: '4px' }}>
            <div style={{ flex: 1, fontWeight: 700, fontSize: '13px', color: theme.text.heading }}>CHANNELS</div>
            <button
              onClick={() => setChannelModal({ type: 'create' })}
              title="Create channel"
              style={{
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                fontSize: '18px',
                lineHeight: 1,
                fontWeight: 400,
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: theme.text.heading,
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {channels.map((channel) => {
              const isActive = channel.id === activeChannelId;
              return (
                <div key={channel.id}>
                  <div
                    onClick={() => onJoin(channel.id)}
                    onContextMenu={(e) => handleContextMenu(e, channel.id)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: isActive ? theme.accent.primary : 'transparent',
                      color: isActive ? theme.text.onAccent : theme.text.primary,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                    }}
                  >
                    # {channel.name}
                  </div>

                  {channel.users.length > 0 && (
                    <div
                      style={{
                        marginTop: '2px',
                        marginBottom: '4px',
                        paddingLeft: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px',
                      }}
                    >
                      {channel.users.map((user) => (
                        <div
                          key={user.id}
                          style={{
                            fontSize: '12px',
                            color: theme.text.primary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 0',
                          }}
                        >
                          <UserAvatar
                            nickname={user.nickname}
                            bgColor={user.bgColor}
                            avatarUrl={user.avatarUrl}
                            size={18}
                            isSpeaking={speakingUserIds.has(user.id)}
                            isConnected={user.isConnected}
                          />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.nickname}
                          </span>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0, color: theme.text.secondary }}>
                            {user.isDeaf ? (
                              <HeadphonesOffIcon width={14} height={14} />
                            ) : (
                              (!user.hasMic || user.isMuted) && <MicOffIcon width={14} height={14} />
                            )}
                            {user.hasVideo && <VideoIcon width={14} height={14} />}
                            {user.hasScreen && <ScreenShareIcon width={14} height={14} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {channels.length === 0 && (
              <div style={{ fontSize: '13px', color: theme.text.secondary, padding: '8px 4px' }}>No channels yet</div>
            )}
          </div>
        </div>

        {/* Connected channel panel */}
        {activeChannelName && (
          <ConnectedChannelPanel
            channelName={activeChannelName}
            connQuality={connQuality}
            onLeave={() => void onLeave()}
          />
        )}

        {/* Current user panel */}
        <div
          onClick={onOpenSettings}
          onMouseEnter={() => setPanelHovered(true)}
          onMouseLeave={() => setPanelHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderTop: `1px solid ${theme.border.primary}`,
            cursor: 'pointer',
            background: panelHovered ? theme.bg.tertiary : 'transparent',
            transition: 'background 0.15s',
            userSelect: 'none',
          }}
        >
          <UserAvatar
            nickname={currentUser.nickname}
            bgColor={currentUser.bgColor}
            avatarUrl={currentUser.avatarUrl}
            size={32}
            isSpeaking={speakingUserIds.has(currentUser.id)}
            isConnected={currentUserIsConnected}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: theme.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentUser.nickname}
            </div>
            <div style={{ fontSize: '11px', color: theme.text.secondary }}>Settings</div>
          </div>
        </div>
      </div>

      {channelModal && (
        <ChannelModal
          mode={channelModal}
          onSubmit={(name) =>
            channelModal.type === 'create' ? onCreate(name) : onRename(channelModal.channelId, name)
          }
          onClose={() => setChannelModal(null)}
        />
      )}

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: theme.bg.elevated,
            border: `1px solid ${theme.border.primary}`,
            borderRadius: '6px',
            boxShadow: theme.shadow.contextMenu,
            zIndex: 1000,
            overflow: 'hidden',
            minWidth: '130px',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuButton onClick={handleContextJoinLeave} color={theme.text.primary} hoverBg={theme.bg.tertiary}>
            {contextMenu.channelId === activeChannelId ? 'Leave channel' : 'Join channel'}
          </ContextMenuButton>
          <ContextMenuButton onClick={handleContextRename} color={theme.text.primary} hoverBg={theme.bg.tertiary}>
            Rename channel
          </ContextMenuButton>
          <div style={{ height: '1px', background: theme.border.secondary }} />
          <ContextMenuButton onClick={handleContextDelete} color={theme.danger.primary} hoverBg={theme.danger.hover}>
            Delete channel
          </ContextMenuButton>
        </div>
      )}
    </>
  );
}
