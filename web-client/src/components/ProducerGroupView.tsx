import { useEffect, useRef, useState } from 'react';
import type { Device } from 'mediasoup-client';
import MicOffIcon from '../assets/mic-off.svg?react';
import ScreenShareIcon from '../assets/screen-share.svg?react';
import HeadphonesOffIcon from '../assets/headphones-off.svg?react';
import { theme } from '../theme';
import type { Transport } from 'mediasoup-client/types';
import { api } from '../api';
import type { ProducerInfo, ProducerSource, UserId } from '../../../libs/api/entities';
import { getUserColor } from '../utils/userColor';
import { UserAvatar } from './UserAvatar';
import { deafEnabledStorage, useStorageItemState } from '../storage';

export type ProducerGroup = {
  userId: UserId;
  nickname: string;
  avatarUrl?: string;
  source: ProducerSource;
  audio?: ProducerInfo;
  video?: ProducerInfo;
};

type Props = {
  group: ProducerGroup;
  recvTransport: Transport | null;
  device: Device | null;
  isSelf: boolean;
  isDeafUser: boolean;
  speakerDeviceId?: string;
  onLog: (entry: string) => void;
  onSpeakingChange: (userId: UserId, speaking: boolean) => void;
};

const ANALYSER_FFT_SIZE = 512;
const ANALYSER_SMOOTHING = 0.3;
const SPEAKING_THRESHOLD = 8; // 0–255 average frequency amplitude
const SPEAKING_HOLD_MS = 200; // delay before border disappears after silence

export function ProducerGroupView({
  group,
  recvTransport,
  device,
  isSelf,
  isDeafUser,
  speakerDeviceId,
  onLog,
  onSpeakingChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const connectedIdsRef = useRef(new Set<string>());
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDeaf] = useStorageItemState(deafEnabledStorage);
  const [hasVideo, setHasVideo] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const onSpeakingChangeRef = useRef(onSpeakingChange);
  onSpeakingChangeRef.current = onSpeakingChange;

  const setSpeaking = (value: boolean) => {
    setIsSpeaking(value);
    onSpeakingChangeRef.current(group.userId, value);
  };

  // Auto-connect when transport/device become available or new producers appear
  useEffect(() => {
    if (!recvTransport || !device) return;

    const consume = async (info: ProducerInfo) => {
      if (connectedIdsRef.current.has(info.producerId)) return;
      connectedIdsRef.current.add(info.producerId);

      try {
        const { consumerId, rtpParameters } = await api.Voice.consumeStream({
          producerUserId: info.userId,
          producerId: info.producerId,
          rtpCapabilities: device.rtpCapabilities,
        });
        const consumer = await recvTransport.consume({
          id: consumerId,
          producerId: info.producerId,
          kind: info.kind,
          rtpParameters,
        });
        await api.Voice.resumeConsumer({ consumerId });

        const stream = new MediaStream([consumer.track]);
        if (info.kind === 'audio' && audioRef.current) {
          audioRef.current.srcObject = stream;
          audioRef.current.volume = 1.0;
          audioRef.current.muted = isSelf || isDeaf;
          if (speakerDeviceId && 'setSinkId' in audioRef.current) {
            await (audioRef.current as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(
              speakerDeviceId,
            );
          }
          try {
            await audioRef.current.play();
          } catch (error) {
            onLog(`❌ Audio playback error: ${error}`);
          }

          // Set up volume analyser — works even when the audio element is muted
          if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
          audioContextRef.current?.close();
          const audioCtx = new AudioContext();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = ANALYSER_FFT_SIZE;
          analyser.smoothingTimeConstant = ANALYSER_SMOOTHING;
          audioCtx.createMediaStreamSource(stream).connect(analyser);
          audioContextRef.current = audioCtx;
          const freqData = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(freqData);
            const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
            if (avg > SPEAKING_THRESHOLD) {
              if (speakingTimeoutRef.current !== null) {
                clearTimeout(speakingTimeoutRef.current);
                speakingTimeoutRef.current = null;
              }
              setSpeaking(true);
            } else if (speakingTimeoutRef.current === null) {
              speakingTimeoutRef.current = setTimeout(() => {
                setSpeaking(false);
                speakingTimeoutRef.current = null;
              }, SPEAKING_HOLD_MS);
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
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

  // Sync muted state when isDeaf changes after audio is already connected
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isSelf || isDeaf;
    }
  }, [isDeaf, isSelf]);

  // Sync speaker device when speakerDeviceId changes after audio is already connected
  useEffect(() => {
    if (speakerDeviceId && audioRef.current) {
      void audioRef.current.setSinkId(speakerDeviceId);
    }
  }, [speakerDeviceId]);

  // Cleanup audio analyser on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (speakingTimeoutRef.current !== null) clearTimeout(speakingTimeoutRef.current);
      audioContextRef.current?.close();
      onSpeakingChangeRef.current(group.userId, false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const OverlayIcon =
    group.source === 'display' ? ScreenShareIcon : isDeafUser ? HeadphonesOffIcon : group.audio ? null : MicOffIcon;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        containerType: 'size',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={containerRef}
        onClick={() => void handleClick()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          width: 'min(100cqw, calc(100cqh * 16 / 9))',
          aspectRatio: '16 / 9',
          background: hasVideo ? theme.bg.video : getUserColor(group.userId),
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: isSpeaking ? '0 0 0 2px white' : 'none',
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
            objectFit: 'contain',
            display: hasVideo ? 'block' : 'none',
          }}
        />

        <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />

        {!hasVideo && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserAvatar
              userId={group.userId}
              nickname={group.nickname}
              avatarUrl={group.avatarUrl}
              size={72}
            />
          </div>
        )}

        {(OverlayIcon || hovered) && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              display: 'flex',
              alignItems: 'center',
              height: '28px',
              boxSizing: 'border-box',
              background: 'rgba(0, 0, 0, 0.55)',
              color: theme.text.onAccent,
              fontSize: '16px',
              padding: '0 12px',
              borderRadius: '4px',
              transition: 'opacity 0.2s',
            }}
          >
            {OverlayIcon && (
              <OverlayIcon width={16} height={16} style={{ flexShrink: 0, marginRight: hovered ? '4px' : 0 }} />
            )}
            {hovered && group.nickname}
          </div>
        )}
      </div>
    </div>
  );
}
