import { useEffect, useRef, useState } from 'react';
import type { Producer, Transport } from 'mediasoup-client/types';
import { api } from '../../api';
import { cameraDeviceStorage } from '../../storage';
import type { ProducerId } from '../../../../libs/api/entities';
import VideoIcon from '../../assets/video.svg?react';
import VideoOffIcon from '../../assets/video-off.svg?react';
import { ControlButton } from './ControlButton';

type CameraButtonProps = {
  sendTransport: Transport | null;
  onLog: (entry: string) => void;
};

export function CameraButton({ sendTransport, onLog }: CameraButtonProps) {
  const [active, setActive] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(cameraDeviceStorage.get);
  const producerRef = useRef<Producer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadDevices = async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((d) => d.kind === 'videoinput'));
  };

  const stop = async () => {
    if (producerRef.current) {
      await api.closeProducer({ producerId: producerRef.current.id as ProducerId });
      producerRef.current.close();
      producerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  };

  const start = async (deviceId?: string) => {
    if (!sendTransport) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
        },
      });
      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];

      // Detect which device was actually used and refresh labels
      const actualDeviceId = videoTrack.getSettings().deviceId;
      if (actualDeviceId) {
        setSelectedDeviceId(actualDeviceId);
        cameraDeviceStorage.set(actualDeviceId);
      }
      void loadDevices();

      const producer = await sendTransport.produce({
        track: videoTrack,
        appData: { source: 'user' },
        encodings: [{ maxBitrate: 10_000_000 }],
      });
      producerRef.current = producer;
      setActive(true);
    } catch (error) {
      onLog(`❌ Error: ${error}`);
    }
  };

  const selectDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    cameraDeviceStorage.set(deviceId);
    if (active) {
      await stop();
      await start(deviceId);
    }
  };

  // Release camera track on unmount (channel switch or leave)
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      producerRef.current?.close();
      producerRef.current = null;
    };
  }, []);

  return (
    <ControlButton
      icon={active ? <VideoIcon width={20} height={20} /> : <VideoOffIcon width={20} height={20} />}
      variant={active ? 'green' : 'default'}
      onClick={active ? () => void stop() : () => void start(selectedDeviceId)}
      disabled={!sendTransport}
      title={active ? 'Stop camera' : 'Start camera'}
      picker={{
        items: devices.map((d) => ({ key: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 8)}` })),
        selected: selectedDeviceId,
        onSelect: (key) => void selectDevice(key),
        onOpen: () => void loadDevices(),
        emptyListTitle: 'No cameras found',
      }}
    />
  );
}
