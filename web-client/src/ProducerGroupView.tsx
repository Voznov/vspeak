import { useEffect, useRef, useState } from 'react';
import type { Device } from 'mediasoup-client';
import MicOffIcon from './assets/mic-off.svg?react';
import ScreenShareIcon from './assets/screen-share.svg?react';
import type { RtpParameters, Transport } from 'mediasoup-client/types';
import { api } from './api';
import type { ProducerInfo, ProducerSource, UserId } from '../../libs/api/entities';

export type ProducerGroup = {
  userId: UserId;
  nickname: string;
  source: ProducerSource;
  audio?: ProducerInfo;
  video?: ProducerInfo;
};

type Props = {
  group: ProducerGroup;
  recvTransport: Transport | null;
  device: Device | null;
  isSelf: boolean;
  onLog: (entry: string) => void;
};

export function ProducerGroupView({ group, recvTransport, device, isSelf, onLog }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const connectedIdsRef = useRef(new Set<string>());
  const [hasVideo, setHasVideo] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Auto-connect when transport/device become available or new producers appear
  useEffect(() => {
    if (!recvTransport || !device) return;

    const consume = async (info: ProducerInfo) => {
      if (connectedIdsRef.current.has(info.producerId)) return;
      connectedIdsRef.current.add(info.producerId);

      try {
        const { consumerId, rtpParameters } = await api.consumeStream({
          producerUserId: info.userId,
          producerId: info.producerId,
          rtpCapabilities: device.rtpCapabilities,
        });
        const consumer = await recvTransport.consume({
          id: consumerId,
          producerId: info.producerId,
          kind: info.kind,
          rtpParameters: rtpParameters as RtpParameters,
        });
        await api.resumeConsumer({ consumerId });

        const stream = new MediaStream([consumer.track]);
        if (info.kind === 'audio' && audioRef.current) {
          audioRef.current.srcObject = stream;
          audioRef.current.volume = 1.0;
          // Mute own audio to prevent echo; isSelf is stable so closure capture is safe
          if (isSelf) audioRef.current.muted = true;
          try { await audioRef.current.play(); } catch (error) { onLog(`❌ Audio playback error: ${error}`); }
        } else if (info.kind === 'video' && videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasVideo(true);
        }
      } catch (error) {
        connectedIdsRef.current.delete(info.producerId);
        onLog(`❌ Error consuming ${info.kind}: ${error}`);
      }
    };

    const producers = [group.audio, group.video].filter((p): p is ProducerInfo => p !== undefined);
    for (const info of producers) void consume(info);
  }, [recvTransport, device, group.audio?.producerId, group.video?.producerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to video producer being removed
  useEffect(() => {
    if (!group.video) setHasVideo(false);
  }, [group.video]);

  const handleClick = () => {
    if (!hasVideo || !containerRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current.requestFullscreen();
    }
  };

  const showVideo = hasVideo;

  return (
    <div
      ref={containerRef}
      onClick={() => void handleClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        maxHeight: '100%',
        aspectRatio: '16 / 9',
        background: '#111',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: hasVideo ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: showVideo ? 'block' : 'none',
        }}
      />

      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />

      {!showVideo && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '15px',
          }}
        >
          No Video
        </div>
      )}

      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(0, 0, 0, 0.55)',
            color: '#fff',
            fontSize: '16px',
            padding: '4px 12px',
            borderRadius: '4px',
            transition: 'opacity 0.2s',
          }}
        >
          {group.source === 'display' ? <ScreenShareIcon width={16} height={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> : (group.audio ? null : <MicOffIcon width={16} height={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />)}
          {group.nickname}
        </div>
      )}
    </div>
  );
}
