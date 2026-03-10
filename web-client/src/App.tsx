import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChannelView } from './components/ChannelView';
import { Login } from './components/Login';
import { UserSettingsModal } from './components/UserSettingsModal';
import { api, HttpError } from './api';
import type { ConnQuality } from './types';
import { activeChannelStorage, tokenStorage, useStorageItemState } from './storage';
import { theme } from './theme';
import type { ChannelId, ChannelWithUsers, User, UserId, WsEvents } from '../../libs/api/entities';


export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelWithUsers[]>([]);
  const [activeChannelId, setActiveChannelId] = useStorageItemState(activeChannelStorage);
  const [speakingUserIds, setSpeakingUserIds] = useState<Set<UserId>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [isConnectionLost, setIsConnectionLost] = useState(false);
  const [channelViewKey, setChannelViewKey] = useState(0);
  const [connQuality, setConnQuality] = useState<ConnQuality | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeChannelIdRef = useRef<ChannelId | undefined>(undefined);
  activeChannelIdRef.current = activeChannelId;

  // Restore user from token on mount, retrying forever on non-401 errors
  useEffect(() => {
    let cancelled = false;

    const restoreUser = async () => {
      const token = tokenStorage.get();
      if (!token) {
        setLoading(false);
        return;
      }

      while (!cancelled) {
        try {
          const { user: restoredUser } = await api.User.getMe({});
          if (!cancelled) setUser(restoredUser);
          break;
        } catch (error) {
          if (error instanceof HttpError && error.status === 401) {
            tokenStorage.remove();
            break;
          }
          console.error('Failed to restore user, retrying...', error);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      if (!cancelled) setLoading(false);
    };

    restoreUser();
    return () => { cancelled = true; };
  }, []);

  // Setup WebSocket when user is authenticated
  useEffect(() => {
    const token = tokenStorage.get();
    if (!user || !token) return;

    const socket = io('/', { auth: { token } });
    socketRef.current = socket;

    let hasConnected = false;

    const onConnect = () => {
      if (hasConnected) {
        setIsConnectionLost(false);
        void refreshChannels();
        if (activeChannelIdRef.current) {
          setChannelViewKey((key) => key + 1);
        }
      }
      hasConnected = true;
    };

    const onDisconnect = () => {
      setIsConnectionLost(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const onChannelCreated = (data: WsEvents['channelCreated']) => {
      setChannels((prev) => [...prev, data.channel]);
    };
    const onChannelDeleted = (data: WsEvents['channelDeleted']) => {
      setChannels((prev) => prev.filter((ch) => ch.id !== data.channelId));
      if (activeChannelIdRef.current === data.channelId) {
        setActiveChannelId(undefined);
      }
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

    const onChannelUpdated = (data: WsEvents['channelUpdated']) => {
      setChannels((prev) => prev.map((ch) => (ch.id === data.channel.id ? { ...ch, ...data.channel } : ch)));
    };

    const onUserUpdated = (data: WsEvents['userUpdated']) => {
      setUser((prev) => (prev?.id === data.user.id ? { ...prev, ...data.user } : prev));
      setChannels((prev) =>
        prev.map((ch) => ({
          ...ch,
          users: ch.users.map((u) => (u.id === data.user.id ? { ...u, ...data.user } : u)),
        })),
      );
    };

    socket.on('channelCreated', onChannelCreated);
    socket.on('channelDeleted', onChannelDeleted);
    socket.on('channelUpdated', onChannelUpdated);
    socket.on('channelUserJoined', onChannelUserJoined);
    socket.on('channelUserLeft', onChannelUserLeft);
    socket.on('channelUserStatusChanged', onChannelUserStatusChanged);
    socket.on('userUpdated', onUserUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('channelCreated', onChannelCreated);
      socket.off('channelDeleted', onChannelDeleted);
      socket.off('channelUpdated', onChannelUpdated);
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
    setActiveChannelId(undefined);
    setSpeakingUserIds(new Set());
    setConnQuality(null);
  };

  const handleCreate = async (name: string) => {
    await api.Channels.createChannel({ name });
  };

  const handleRename = async (channelId: ChannelId, name: string) => {
    await api.Channels.updateChannel({ channelId, name });
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {isConnectionLost && (
        <div
          style={{
            background: '#7c3f00',
            color: '#ffcc80',
            textAlign: 'center',
            fontSize: '13px',
            padding: '5px 12px',
            flexShrink: 0,
          }}
        >
          Connection lost — reconnecting...
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <ChannelSidebar
        channels={channels}
        activeChannelId={activeChannelId}
        currentUser={user}
        speakingUserIds={speakingUserIds}
        connQuality={connQuality}
        onJoin={handleJoin}
        onLeave={handleLeave}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
        onOpenSettings={() => setShowSettings(true)}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeChannel && socket ? (
          <ChannelView
            key={channelViewKey}
            user={user}
            channel={activeChannel}
            socket={socket}
            onLeave={handleLeave}
            onSpeakingChange={handleSpeakingChange}
            onQualityChange={setConnQuality}
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
        />
      )}
      </div>
    </div>
  );
}
