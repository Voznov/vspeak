import { useEffect, useRef, useState } from 'react';
import { Device } from 'mediasoup-client';
import type { DtlsParameters, IceCandidate, IceParameters, RtpCapabilities, Transport } from 'mediasoup-client/types';
import type { Socket } from 'socket.io-client';
import { api } from './api';
import { deafEnabledStorage, speakerDeviceStorage } from './storage';
import { ControlBar } from './ControlBar';
import { ProducerGroupView, type ProducerGroup } from './ProducerGroupView';
import { useToast } from './ToastProvider';
import { theme } from './theme';
import { calculateGrid } from './utils/calculateGrid';
import type { ChannelId, ProducerInfo, ProducerSource, User, WsEvents } from '../../libs/api/entities';

type ChannelViewProps = {
  user: User;
  channelId: ChannelId;
  socket: Socket;
  channelUsers: User[];
  onLeave: () => void;
};

const groupProducers = (infos: ProducerInfo[], channelUsers: User[]): ProducerGroup[] => {
  const userMap = new Map(channelUsers.map((u) => [u.id, u.nickname]));
  const groups = new Map<string, ProducerGroup>();
  channelUsers.forEach((user) => {
    groups.set(`${user.id}:user`, { userId: user.id, nickname: user.nickname, source: 'user' });
  });
  for (const info of infos) {
    const key = `${info.userId}:${info.source}`;
    const nickname = userMap.get(info.userId) ?? String(info.userId);
    const group = groups.get(key) ?? { userId: info.userId, nickname, source: info.source };
    group[info.kind] = info;
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort(
    (left, right) => left.userId.localeCompare(right.userId) || left.source.localeCompare(right.source),
  );
};

export function ChannelView({ user, channelId, socket, channelUsers, onLeave }: ChannelViewProps) {
  const deviceRef = useRef<Device | null>(null);
  const [sendTransport, setSendTransport] = useState<Transport | null>(null);
  const [recvTransport, setRecvTransport] = useState<Transport | null>(null);
  const [producerInfos, setProducerInfos] = useState<ProducerInfo[]>([]);
  const [connecting, setConnecting] = useState(true);
  const [isDeaf, setIsDeaf] = useState(() => deafEnabledStorage.get());
  const [speakerDeviceId, setSpeakerDeviceId] = useState<string | undefined>(speakerDeviceStorage.get);

  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  const addLog = useToast();

  const channelIdRef = useRef(channelId);
  channelIdRef.current = channelId;
  const channelUsersRef = useRef(channelUsers);
  channelUsersRef.current = channelUsers;

  // Subscribe to channel-scoped WebSocket events
  useEffect(() => {
    const onProducerCreated = (data: WsEvents['producerCreated']) => {
      setProducerInfos((prev) => [...prev, data.info]);
    };
    const onProducerClosed = (data: WsEvents['producerClosed']) => {
      setProducerInfos((prev) => prev.filter((p) => p.producerId !== data.producerId));
    };
    const onChannelUserJoined = (data: WsEvents['channelUserJoined']) => {
      if (data.channelId !== channelIdRef.current || data.user.id === user.id) return;
      addLog(`👤 ${data.user.nickname} joined`);
    };
    const onChannelUserLeft = (data: WsEvents['channelUserLeft']) => {
      if (data.channelId !== channelIdRef.current || data.userId === user.id) return;
      const nickname = channelUsersRef.current.find((u) => u.id === data.userId)?.nickname ?? String(data.userId);
      addLog(`👤 ${nickname} left`);
    };

    socket.on('producerCreated', onProducerCreated);
    socket.on('producerClosed', onProducerClosed);
    socket.on('channelUserJoined', onChannelUserJoined);
    socket.on('channelUserLeft', onChannelUserLeft);

    return () => {
      socket.off('producerCreated', onProducerCreated);
      socket.off('producerClosed', onProducerClosed);
      socket.off('channelUserJoined', onChannelUserJoined);
      socket.off('channelUserLeft', onChannelUserLeft);
    };
  }, [socket, user.id]);

  const initDevice = async () => {
    if (deviceRef.current) return deviceRef.current;

    const device = new Device();
    const { capabilities, producerInfos: infos } = await api.getChannelInfo({ channelId });
    await device.load({ routerRtpCapabilities: capabilities });
    deviceRef.current = device;
    setProducerInfos(infos);

    return device;
  };

  const createTransports = async () => {
    // Reset state for the new channel
    deviceRef.current = null;
    setSendTransport(null);
    setRecvTransport(null);
    setProducerInfos([]);

    try {
      setConnecting(true);
      const device = await initDevice();

      const { send: sendData, recv: recvData } = await api.joinChannel({ channelId });

      // Create send transport
      const newSendTransport = device.createSendTransport({
        id: sendData.transportId,
        iceParameters: sendData.iceParameters,
        iceCandidates: sendData.iceCandidates,
        dtlsParameters: sendData.dtlsParameters,
      });

      newSendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await api.connectTransport({ transportId: sendData.transportId, dtlsParameters });
          callback();
        } catch (error) {
          errback(error as Error);
        }
      });

      newSendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const source = ((appData as Record<string, unknown>).source as ProducerSource | undefined) ?? 'user';
          const { producerId } = await api.produceStream({ kind, source, rtpParameters });
          callback({ id: producerId });
        } catch (error) {
          errback(error as Error);
        }
      });

      sendTransportRef.current = newSendTransport;
      setSendTransport(newSendTransport);

      // Create recv transport
      const newRecvTransport = device.createRecvTransport({
        id: recvData.transportId,
        iceParameters: recvData.iceParameters,
        iceCandidates: recvData.iceCandidates,
        dtlsParameters: recvData.dtlsParameters,
      });

      newRecvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await api.connectTransport({ transportId: recvData.transportId, dtlsParameters });
          callback();
        } catch (error) {
          errback(error as Error);
        }
      });

      recvTransportRef.current = newRecvTransport;
      setRecvTransport(newRecvTransport);

      // Sync deaf state to server — UserInfo is reset on each join
      if (deafEnabledStorage.get()) {
        void api.setDeaf({ isDeaf: true });
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setConnecting(false);
    }
  };

  // Auto-connect transports when joining a channel; cleanup on leave or channel switch
  useEffect(() => {
    void createTransports();
    return () => {
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      sendTransportRef.current = null;
      recvTransportRef.current = null;
    };
  }, [channelId]);

  // Track grid container size for optimal layout calculation
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setGridSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const groups = groupProducers(producerInfos, channelUsers);
  const { columns, rows, blockWidth, blockHeight } = calculateGrid(gridSize.width, gridSize.height, groups.length, 16 / 9);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={gridRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          padding: '6px',
          boxSizing: 'border-box',
        }}
      >
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', gap: '6px' }}>
            {groups.slice(rowIndex * columns, (rowIndex + 1) * columns).map((group) => (
              <div key={`${group.userId}:${group.source}`} style={{ width: blockWidth, height: blockHeight, flexShrink: 0 }}>
                <ProducerGroupView
                  group={group}
                  recvTransport={recvTransport}
                  device={deviceRef.current}
                  isSelf={group.userId === user.id}
                  isDeaf={isDeaf}
                  speakerDeviceId={speakerDeviceId}
                  onLog={addLog}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {connecting && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.bg.overlay,
            zIndex: 200,
            color: theme.text.onAccent,
            fontSize: '15px',
          }}
        >
          🔄 Connecting...
        </div>
      )}

      <ControlBar
        channelId={channelId}
        sendTransport={sendTransport}
        connecting={connecting}
        isDeaf={isDeaf}
        onDeafToggle={setIsDeaf}
        onSpeakerChange={(deviceId) => {
          speakerDeviceStorage.set(deviceId);
          setSpeakerDeviceId(deviceId);
        }}
        onLog={addLog}
        onLeave={onLeave}
      />
    </div>
  );
}
