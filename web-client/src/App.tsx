import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChannelView } from './components/ChannelView';
import { Login } from './components/Login';
import { UserSettingsModal } from './components/UserSettingsModal';
import { api } from './api';
import { tokenStorage } from './storage';
import { theme } from './theme';
import type { ChannelId, ChannelWithUsers, User, UserId, WsEvents } from '../../libs/api/entities';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelWithUsers[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<ChannelId | null>(null);
  const [speakingUserIds, setSpeakingUserIds] = useState<Set<UserId>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
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
        const { user: restoredUser } = await api.User.getMe({});
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

    const onUserUpdated = (data: WsEvents['userUpdated']) => {
      // Update current user if it's us
      setUser((prev) => (prev?.id === data.user.id ? { ...prev, ...data.user } : prev));
      // Update avatarUrl for this user in all channels
      setChannels((prev) =>
        prev.map((ch) => ({
          ...ch,
          users: ch.users.map((u) => (u.id === data.user.id ? { ...u, avatarUrl: data.user.avatarUrl } : u)),
        })),
      );
    };

    socket.on('channelCreated', onChannelCreated);
    socket.on('channelDeleted', onChannelDeleted);
    socket.on('channelUserJoined', onChannelUserJoined);
    socket.on('channelUserLeft', onChannelUserLeft);
    socket.on('channelUserStatusChanged', onChannelUserStatusChanged);
    socket.on('userUpdated', onUserUpdated);

    return () => {
      socket.off('channelCreated', onChannelCreated);
      socket.off('channelDeleted', onChannelDeleted);
      socket.off('channelUserJoined', onChannelUserJoined);
      socket.off('channelUserLeft', onChannelUserLeft);
      socket.off('channelUserStatusChanged', onChannelUserStatusChanged);
      socket.off('userUpdated', onUserUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const refreshChannels = async () => {
    const { channels: list } = await api.Channels.listChannels({});
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
    await api.Channels.leaveChannel({ channelId: activeChannelId });
    setActiveChannelId(null);
    setSpeakingUserIds(new Set());
  };

  const handleCreate = async (name: string) => {
    await api.Channels.createChannel({ name });
  };

  const handleDelete = async (channelId: ChannelId) => {
    if (activeChannelId === channelId) await handleLeave();
    await api.Channels.deleteChannel({ channelId });
  };

  const handleSpeakingChange = useCallback((userId: UserId, speaking: boolean) => {
    setSpeakingUserIds((prev) => {
      const next = new Set(prev);
      if (speaking) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const handleAvatarUpdated = (updatedUser: User) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : prev));
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
        currentUser={user}
        speakingUserIds={speakingUserIds}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onOpenSettings={() => setShowSettings(true)}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeChannel && socket ? (
          <ChannelView
            user={user}
            channel={activeChannel}
            socket={socket}
            onLeave={handleLeave}
            onSpeakingChange={handleSpeakingChange}
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

      {showSettings && (
        <UserSettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onAvatarUpdated={handleAvatarUpdated}
        />
      )}
    </div>
  );
}
