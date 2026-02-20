import { useEffect, useRef, useState } from 'react';
import type { ChannelId, ChannelWithUsers } from '../../libs/api/entities';

type ChannelSidebarProps = {
  channels: ChannelWithUsers[];
  activeChannelId: ChannelId | null;
  onJoin: (channelId: ChannelId) => void;
  onLeave: () => Promise<void>;
  onCreate: (name: string) => Promise<void>;
  onDelete: (channelId: ChannelId) => Promise<void>;
};

type ContextMenu = {
  channelId: ChannelId;
  x: number;
  y: number;
};

export function ChannelSidebar({ channels, activeChannelId, onJoin, onLeave, onCreate, onDelete }: ChannelSidebarProps) {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (showModal) {
      setTimeout(() => modalInputRef.current?.focus(), 50);
    } else {
      setNewName('');
    }
  }, [showModal]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreate(name);
      setShowModal(false);
    } finally {
      setCreating(false);
    }
  };

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
          borderRight: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 8px',
          gap: '4px',
          background: '#f5f5f5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', paddingLeft: '4px' }}>
          <div style={{ flex: 1, fontWeight: 700, fontSize: '13px', color: '#555' }}>CHANNELS</div>
          <button
            onClick={() => setShowModal(true)}
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
              color: '#555',
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                    background: isActive ? '#4CAF50' : 'transparent',
                    color: isActive ? '#fff' : '#333',
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
                    {channel.users.map((u) => (
                      <div
                        key={u.id}
                        style={{
                          fontSize: '12px',
                          color: '#444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ color: '#4CAF50', fontSize: '8px' }}>●</span>
                        {u.nickname}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {channels.length === 0 && (
            <div style={{ fontSize: '13px', color: '#999', padding: '8px 4px' }}>No channels yet</div>
          )}
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '24px',
              width: '300px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '16px' }}>Create Channel</div>
            <input
              ref={modalInputRef}
              type="text"
              placeholder="Channel name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !creating && void handleCreate()}
              disabled={creating}
              style={{
                padding: '8px 10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={creating}
                style={{
                  padding: '7px 16px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  background: '#f5f5f5',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={creating || !newName.trim()}
                style={{
                  padding: '7px 16px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#4CAF50',
                  color: '#fff',
                  cursor: creating || !newName.trim() ? 'default' : 'pointer',
                  opacity: creating || !newName.trim() ? 0.6 : 1,
                }}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 1000,
            overflow: 'hidden',
            minWidth: '130px',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleContextJoinLeave}
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#f0f0f0')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
          >
            {contextMenu.channelId === activeChannelId ? 'Leave channel' : 'Join channel'}
          </button>
          <div style={{ height: '1px', background: '#eee' }} />
          <button
            onClick={handleContextDelete}
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              color: '#e53935',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#fff5f5')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
          >
            Delete channel
          </button>
        </div>
      )}
    </>
  );
}
