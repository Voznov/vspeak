import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChannelView } from './components/ChannelView';
import { Login } from './components/Login';
import { api } from './api';
import { tokenStorage } from './storage';
import { theme } from './theme';
import type { ChannelId, ChannelWithUsers, User, WsEvents } from '../../libs/api/entities';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelWithUsers[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<ChannelId | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Restore user from token on mount
  useEffect(() => {
    const restoreUser = async () => {
      const token = tokenStorage.get();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user: restoredUser } = await api.getMe({});
        setUser(restoredUser);
      } catch (error) {
        // Token is invalid, clear it
        tokenStorage.remove();
        console.error('Failed to restore user:', error);
      } finally {
        setLoading(false);
      }
    };

    restoreUser();
  }, []);

  // Setup WebSocket when user is authenticated
  useEffect(() => {
    const token = tokenStorage.get();
    if (!user || !token) return;

    const socket = io('/', { auth: { token } });
    socketRef.current = socket;

    const onChannelCreated = (data: WsEvents['channelCreated']) => {
      setChannels((prev) => [...prev, data.channel]);
    };
    const onChannelDeleted = (data: WsEvents['channelDeleted']) => {
      setChannels((prev) => prev.filter((ch) => ch.id !== data.channelId));
      setActiveChannelId((current) => (current === data.channelId ? null : current));
    };
    const onChannelUserJoined = (data: WsEvents['channelUserJoined']) => {
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === data.channelId && ch.users.every((user) => user.id !== data.user.id)
            ? { ...ch, users: [...ch.users, data.user] }
            : ch,
        ),
      );
    };
    const onChannelUserLeft = (data: WsEvents['channelUserLeft']) => {
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === data.channelId ? { ...ch, users: ch.users.filter((user) => user.id !== data.userId) } : ch,
        ),
      );
    };

    const onChannelUserStatusChanged = (data: WsEvents['channelUserStatusChanged']) => {
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id !== data.channelId
            ? ch
            : { ...ch, users: ch.users.map((u) => (u.id !== data.userId ? u : { ...u, ...data.status })) },
        ),
      );
    };

    socket.on('channelCreated', onChannelCreated);
    socket.on('channelDeleted', onChannelDeleted);
    socket.on('channelUserJoined', onChannelUserJoined);
    socket.on('channelUserLeft', onChannelUserLeft);
    socket.on('channelUserStatusChanged', onChannelUserStatusChanged);

    return () => {
      socket.off('channelCreated', onChannelCreated);
      socket.off('channelDeleted', onChannelDeleted);
      socket.off('channelUserJoined', onChannelUserJoined);
      socket.off('channelUserLeft', onChannelUserLeft);
      socket.off('channelUserStatusChanged', onChannelUserStatusChanged);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const refreshChannels = async () => {
    const { channels: list } = await api.listChannels({});
    setChannels(list);
  };

  useEffect(() => {
    if (user) void refreshChannels();
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleJoin = (channelId: ChannelId) => {
    setActiveChannelId(channelId);
  };

  const handleLeave = async () => {
    if (!activeChannelId) return;
    await api.leaveChannel({ channelId: activeChannelId });
    setActiveChannelId(null);
  };

  const handleCreate = async (name: string) => {
    await api.createChannel({ name });
  };

  const handleDelete = async (channelId: ChannelId) => {
    if (activeChannelId === channelId) await handleLeave();
    await api.deleteChannel({ channelId });
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>VSpeak</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const socket = socketRef.current;
  const activeChannel = channels.find((ch) => ch.id === activeChannelId);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <ChannelSidebar
        channels={channels}
        activeChannelId={activeChannelId}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeChannelId && socket ? (
          <ChannelView
            user={user}
            channelId={activeChannelId}
            socket={socket}
            channelUsers={activeChannel?.users ?? []}
            onLeave={handleLeave}
          />
        ) : (
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.text.secondary }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>👈</div>
              <div style={{ fontSize: '16px' }}>Select a channel to join</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
