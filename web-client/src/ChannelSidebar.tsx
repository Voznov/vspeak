import { useState } from 'react';
import type { ChannelId, ChannelWithUsers } from '../../libs/api/entities';

type ChannelSidebarProps = {
  channels: ChannelWithUsers[];
  activeChannelId: ChannelId | null;
  onJoin: (channelId: ChannelId) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (channelId: ChannelId) => Promise<void>;
};

export function ChannelSidebar({ channels, activeChannelId, onJoin, onCreate, onDelete }: ChannelSidebarProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreate(name);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  return (
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
      <div style={{ fontWeight: 700, fontSize: '13px', color: '#555', marginBottom: '8px', paddingLeft: '4px' }}>
        CHANNELS
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {channels.map((channel) => {
          const isActive = channel.id === activeChannelId;
          return (
            <div
              key={channel.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: isActive ? '#4CAF50' : 'transparent',
                color: isActive ? '#fff' : '#333',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  # {channel.name}
                </div>
                {channel.users.length > 0 ? (
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                    {channel.users.map((u) => (
                      <div key={u.id} style={{ paddingLeft: '6px' }}>
                        · {u.nickname}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', opacity: 0.5 }}>empty</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px', marginLeft: '4px', flexShrink: 0 }}>
                <button
                  onClick={() => onJoin(channel.id)}
                  disabled={isActive}
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    cursor: isActive ? 'default' : 'pointer',
                    background: isActive ? 'rgba(255,255,255,0.3)' : '#4CAF50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                >
                  {isActive ? 'In' : 'Join'}
                </button>
                <button
                  onClick={() => void onDelete(channel.id)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    background: '#e53935',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {channels.length === 0 && (
          <div style={{ fontSize: '13px', color: '#999', padding: '8px 4px' }}>No channels yet</div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px', marginTop: '4px' }}>
        <input
          type="text"
          placeholder="New channel name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !creating && void handleCreate()}
          disabled={creating}
          style={{ width: '100%', padding: '5px', fontSize: '13px', marginBottom: '4px', boxSizing: 'border-box' }}
        />
        <button
          onClick={() => void handleCreate()}
          disabled={creating || !newName.trim()}
          style={{ width: '100%', padding: '5px', fontSize: '13px' }}
        >
          {creating ? 'Creating…' : '+ Add Channel'}
        </button>
      </div>
    </div>
  );
}
