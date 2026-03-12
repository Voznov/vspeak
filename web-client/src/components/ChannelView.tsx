import { useCallback, useEffect, useRef, useState } from 'react';
import { Device } from 'mediasoup-client';
import type { Transport } from 'mediasoup-client/types';
import type { Socket } from 'socket.io-client';
import { api } from '../api';
import { deafEnabledStorage } from '../storage';
import { ControlBar } from './controls/ControlBar';
import { ProducerGroupView, type ProducerGroup } from './ProducerGroupView';
import { useToast } from './ToastProvider';
import { theme } from '../theme';
import { calculateGrid } from '../utils/calculateGrid';
import type {
  ChannelWithUsers,
  ProducerInfo,
  ProducerSource,
  User,
  UserId,
  UserWithStatus,
  WsEvents,
} from '../../../libs/api/entities';
import { sounds } from '../sounds';
import type { ConnQuality } from '../types';

type ChannelViewProps = {
  user: User;
  channel: ChannelWithUsers;
  socket: Socket;
  onLeave: () => void;
  onSpeakingChange: (userId: UserId, speaking: boolean) => void;
  onQualityChange: (quality: ConnQuality | null) => void;
};

const groupProducers = (infos: ProducerInfo[], channelUsers: UserWithStatus[]): ProducerGroup[] => {
  const userMap = new Map(
    channelUsers.map((u) => [
      u.id,
      { nickname: u.nickname, bgColor: u.bgColor, avatarUrl: u.avatarUrl, isConnected: u.isConnected },
    ]),
  );
  const groups = new Map<string, ProducerGroup>();
  channelUsers.forEach((user) => {
    groups.set(`${user.id}:user`, {
      userId: user.id,
      nickname: user.nickname,
      bgColor: user.bgColor,
      avatarUrl: user.avatarUrl,
      isConnected: user.isConnected,
      source: 'user',
    });
  });
  for (const info of infos) {
    const key = `${info.userId}:${info.source}`;
    const userData = userMap.get(info.userId);
    const nickname = userData?.nickname ?? String(info.userId);
    const bgColor = userData?.bgColor ?? '#78909C';
    const avatarUrl = userData?.avatarUrl;
    const isConnected = userData?.isConnected ?? false;
    const group = groups.get(key) ?? {
      userId: info.userId,
      nickname,
      bgColor,
      avatarUrl,
      isConnected,
      source: info.source,
    };
    group[info.kind] = info;
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort(
    (left, right) => left.userId.localeCompare(right.userId) || left.source.localeCompare(right.source),
  );
};

export function ChannelView({ user, socket, channel, onLeave, onSpeakingChange, onQualityChange }: ChannelViewProps) {
  const deviceRef = useRef<Device | null>(null);
  const [sendTransport, setSendTransport] = useState<Transport | null>(null);
  const [recvTransport, setRecvTransport] = useState<Transport | null>(null);
  const [producerInfos, setProducerInfos] = useState<ProducerInfo[]>([]);
  const [connecting, setConnecting] = useState(true);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  const addLog = useToast();

  const handleSpeakingChange = useCallback(
    (userId: UserId, speaking: boolean) => {
      onSpeakingChange(userId, speaking);
    },
    [onSpeakingChange],
  );

  // Subscribe to channel-scoped WebSocket events
  useEffect(() => {
    const onProducerCreated = (data: WsEvents['producerCreated']) => {
      if (data.info.userId !== user.id && data.info.kind === 'video') {
        if (data.info.source === 'display') sounds.screenShareOn();
        else sounds.cameraOn();
      }
      setProducerInfos((prev) => [...prev, data.info]);
    };
    const onProducerClosed = (data: WsEvents['producerClosed']) => {
      setProducerInfos((prev) => {
        const closing = prev.find((p) => p.producerId === data.producerId);
        if (closing && closing.userId !== user.id && closing.kind === 'video') {
          if (closing.source === 'display') sounds.screenShareOff();
          else sounds.cameraOff();
        }
        return prev.filter((p) => p.producerId !== data.producerId);
      });
    };

    socket.on('producerCreated', onProducerCreated);
    socket.on('producerClosed', onProducerClosed);

    return () => {
      socket.off('producerCreated', onProducerCreated);
      socket.off('producerClosed', onProducerClosed);
    };
  }, [socket, user.id]);

  const initDevice = async (signal: AbortSignal) => {
    const device = new Device();
    const { capabilities, producerInfos: infos } = await api.WebRtc.getChannelInfo({ channelId: channel.id });
    if (signal.aborted) return null;

    await device.load({ routerRtpCapabilities: capabilities });
    deviceRef.current = device;
    setProducerInfos(infos);
    return device;
  };

  const createTransports = async (device: Device, signal: AbortSignal) => {
    const { send: sendData, recv: recvData } = await api.WebRtc.createTransports({ channelId: channel.id });
    if (signal.aborted) return;

    // Create send transport
    const newSendTransport = device.createSendTransport({
      id: sendData.transportId,
      iceParameters: sendData.iceParameters,
      iceCandidates: sendData.iceCandidates,
      dtlsParameters: sendData.dtlsParameters,
    });

    newSendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await api.WebRtc.connectTransport({ transportId: sendData.transportId, dtlsParameters });
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    newSendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const source = (appData.source as ProducerSource | undefined) ?? 'user';
        const { producerId } = await api.WebRtc.produceStream({ kind, source, rtpParameters });
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
        await api.WebRtc.connectTransport({ transportId: recvData.transportId, dtlsParameters });
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    recvTransportRef.current = newRecvTransport;
    setRecvTransport(newRecvTransport);

    // Sync deaf state to server — UserInfo is reset on each join
    if (deafEnabledStorage.get()) {
      void api.WebRtc.setDeaf({ isDeaf: true });
    }
  };

  // Poll WebRTC stats for connection quality (RTT, packet loss, jitter)
  useEffect(() => {
    if (!recvTransport) return;
    const poll = async () => {
      try {
        const recvStats = await recvTransport.getStats();

        let rtt: number | null = null;
        for (const report of recvStats.values()) {
          const r = report as RTCIceCandidatePairStats;
          if (r.type === 'candidate-pair' && r.nominated && r.currentRoundTripTime !== undefined) {
            rtt = Math.round(r.currentRoundTripTime * 1000);
          }
        }

        let jitter: number | null = null;
        for (const report of recvStats.values()) {
          const r = report as RTCInboundRtpStreamStats;
          if (r.type === 'inbound-rtp' && r.kind === 'audio' && r.jitter !== undefined) {
            jitter = Math.round(r.jitter * 1000);
          }
        }

        let packetLoss: number | null = null;
        if (sendTransport) {
          const sendStats = await sendTransport.getStats();
          for (const report of sendStats.values()) {
            const r = report as RTCInboundRtpStreamStats & { roundTripTime?: number; fractionLost?: number };
            if (r.type === 'remote-inbound-rtp' && r.fractionLost !== undefined) {
              packetLoss = Math.round(r.fractionLost * 100);
            }
          }
        }

        if (rtt !== null && jitter !== null) {
          onQualityChange({ rtt, packetLoss, jitter });
        }
      } catch {
        // ignore stats errors
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 1000);
    return () => clearInterval(id);
  }, [sendTransport, recvTransport]);

  // Initialize device and connect transports on mount; cleanup on unmount
  useEffect(() => {
    const ac = new AbortController();

    deviceRef.current = null;
    setSendTransport(null);
    setRecvTransport(null);
    setConnecting(true);

    void initDevice(ac.signal)
      .then((device) => device && createTransports(device, ac.signal))
      .catch((error) => !ac.signal.aborted && addLog(`❌ Error: ${error}`))
      .finally(() => !ac.signal.aborted && setConnecting(false));
    return () => {
      ac.abort();
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      sendTransportRef.current = null;
      recvTransportRef.current = null;
    };
  }, [connectionAttempt]);

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

  const groups = groupProducers(producerInfos, channel.users);
  const { columns, rows, blockWidth, blockHeight } = calculateGrid(
    gridSize.width,
    gridSize.height,
    groups.length,
    16 / 9,
  );

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
              <div
                key={`${group.userId}:${group.source}`}
                style={{ width: blockWidth, height: blockHeight, flexShrink: 0 }}
              >
                <ProducerGroupView
                  group={group}
                  recvTransport={recvTransport}
                  device={deviceRef.current}
                  isSelf={group.userId === user.id}
                  isDeafUser={channel.users.some((u) => u.id === group.userId && u.isDeaf)}
                  isMutedUser={channel.users.some((u) => u.id === group.userId && u.isMuted)}
                  onLog={addLog}
                  onSpeakingChange={handleSpeakingChange}
                  onFatalError={() => setConnectionAttempt((n) => n + 1)}
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
        channelId={channel.id}
        sendTransport={sendTransport}
        connecting={connecting}
        onLog={addLog}
        onLeave={onLeave}
      />
    </div>
  );
}
