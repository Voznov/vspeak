import { useEffect, useRef, useState } from 'react';
import type { User } from '../../../libs/api/entities';
import { api } from '../api';
import { theme } from '../theme';
import { UserAvatar } from './UserAvatar';

type Props = {
  user: User;
  onClose: () => void;
  onAvatarUpdated: (updatedUser: User) => void;
};

type CropState = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

const CROP_SIZE = 200; // px — output and preview square

// Clamp offset so the image always fully covers the crop circle
const clampCrop = (crop: CropState, nw: number, nh: number): CropState => {
  const drawW = nw * crop.scale;
  const drawH = nh * crop.scale;
  const maxOx = Math.max(0, drawW / 2 - CROP_SIZE / 2);
  const maxOy = Math.max(0, drawH / 2 - CROP_SIZE / 2);
  return {
    ...crop,
    offsetX: Math.max(-maxOx, Math.min(maxOx, crop.offsetX)),
    offsetY: Math.max(-maxOy, Math.min(maxOy, crop.offsetY)),
  };
};

export function UserSettingsModal({ user, onClose, onAvatarUpdated }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarHovered, setAvatarHovered] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null);

  const loadImage = (src: string) => {
    const img = new Image();
    img.onload = () => {
      previewImgRef.current = img;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      const fitScale = CROP_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
      setCrop({ offsetX: 0, offsetY: 0, scale: fitScale });
    };
    img.src = src;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    loadImage(url);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  // Draw crop preview on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = previewImgRef.current;
    if (!canvas || !img || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const drawW = naturalSize.w * crop.scale;
    const drawH = naturalSize.h * crop.scale;
    const x = CROP_SIZE / 2 - drawW / 2 + crop.offsetX;
    const y = CROP_SIZE / 2 - drawH / 2 + crop.offsetY;
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();
  }, [imageSrc, crop, naturalSize]);

  const naturalSizeRef = useRef(naturalSize);
  naturalSizeRef.current = naturalSize;

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOx: crop.offsetX, startOy: crop.offsetY };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const { w, h } = naturalSizeRef.current;
      setCrop((prev) =>
        clampCrop({ ...prev, offsetX: dragRef.current!.startOx + dx, offsetY: dragRef.current!.startOy + dy }, w, h),
      );
    };

    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setCrop((prev) => {
      const minScale = CROP_SIZE / Math.min(naturalSize.w, naturalSize.h);
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(minScale, Math.min(prev.scale * delta, 10));
      return clampCrop({ ...prev, scale: newScale }, naturalSize.w, naturalSize.h);
    });
  };

  const getCroppedBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) return reject(new Error('No canvas'));
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    });
  };

  const handleUpload = async () => {
    setError(null);
    setUploading(true);
    try {
      const blob = await getCroppedBlob();
      const { uploadUrl } = await api.User.updateAvatar({});

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/png' },
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

      // Confirm upload — server broadcasts userUpdated to all clients
      const { user: updatedUser } = await api.User.confirmAvatarUpload({});
      onAvatarUpdated(updatedUser);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.bg.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: theme.bg.elevated,
          borderRadius: '12px',
          padding: '28px',
          width: '340px',
          boxShadow: theme.shadow.modal,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          color: theme.text.primary,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '16px' }}>User Settings</div>

        {/* Avatar + user info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Clickable avatar with edit overlay */}
          <div
            style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
          >
            <UserAvatar userId={user.id} nickname={user.nickname} avatarUrl={user.avatarUrl} size={48} />
            {avatarHovered && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '18px',
                  pointerEvents: 'none',
                }}
              >
                ✏️
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.nickname}</div>
            <div style={{ fontSize: '12px', color: theme.text.secondary }}>{user.role}</div>
          </div>
        </div>

        {/* Crop canvas */}
        {imageSrc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: theme.text.heading }}>CROP AVATAR</div>
            <div style={{ fontSize: '12px', color: theme.text.secondary }}>
              Drag to reposition · scroll to zoom
            </div>
            {/* Wrapper clips the CSS border so it doesn't cross the circle */}
            <div
              style={{
                width: CROP_SIZE,
                height: CROP_SIZE,
                borderRadius: '50%',
                overflow: 'hidden',
                margin: '0 auto',
                boxShadow: `0 0 0 2px ${theme.border.primary}`,
              }}
            >
              <canvas
                ref={canvasRef}
                width={CROP_SIZE}
                height={CROP_SIZE}
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}
                style={{ cursor: 'grab', display: 'block' }}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: '12px', color: theme.danger.primary }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              padding: '7px 16px',
              fontSize: '13px',
              borderRadius: '6px',
              border: `1px solid ${theme.border.primary}`,
              background: theme.bg.tertiary,
              color: theme.text.primary,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          {imageSrc && (
            <button
              onClick={() => void handleUpload()}
              disabled={uploading}
              style={{
                padding: '7px 16px',
                fontSize: '13px',
                borderRadius: '6px',
                border: 'none',
                background: theme.accent.primary,
                color: theme.text.onAccent,
                cursor: uploading ? 'default' : 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? 'Uploading…' : 'Save avatar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
