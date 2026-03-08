import { useEffect, useRef, useState } from 'react';
import type { User } from '../../../libs/api/entities';
import { api } from '../api';
import { useStorageItemState, noiseCancelStorage } from '../storage';
import { theme } from '../theme';
import { UserAvatar } from './UserAvatar';

type Props = {
  user: User;
  onClose: () => void;
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

export function UserSettingsModal({ user, onClose }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [noiseEnabled, setNoiseEnabled] = useStorageItemState(noiseCancelStorage);
  const [nickname, setNickname] = useState(user.nickname);
  const [selectedColor, setSelectedColor] = useState(user.bgColor);
  const [palette, setPalette] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null);

  useEffect(() => {
    void api.User.getPalette({}).then(({ colors }) => setPalette(colors));
  }, []);

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

  const handleNoiseToggle = () => {
    setNoiseEnabled(!noiseEnabled);
  };

  const handleSaveProfile = async () => {
    const trimmed = nickname.trim();
    const nicknameChanged = trimmed !== user.nickname && trimmed.length > 0;
    const colorChanged = selectedColor !== user.bgColor;
    if (!nicknameChanged && !colorChanged) return;

    setError(null);
    setSaving(true);
    try {
      await api.User.updateUser({
        nickname: nicknameChanged ? trimmed : undefined,
        bgColor: colorChanged ? selectedColor : undefined,
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
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

      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  const profileChanged = (nickname.trim() !== user.nickname && nickname.trim().length > 0) || selectedColor !== user.bgColor;

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
            <UserAvatar nickname={user.nickname} bgColor={selectedColor} avatarUrl={user.avatarUrl} size={48} />
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
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={64}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '14px',
                fontWeight: 600,
                border: `1px solid ${theme.border.input}`,
                borderRadius: '6px',
                background: theme.bg.tertiary,
                color: theme.text.primary,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '2px' }}>{user.role}</div>
          </div>
        </div>

        {/* Color palette */}
        {palette.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: theme.text.heading }}>COLOR</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {palette.map((color) => (
                <div
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: color,
                    cursor: 'pointer',
                    boxShadow: selectedColor === color ? `0 0 0 2px white, 0 0 0 3px ${color}` : 'none',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}

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

        {/* Voice settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: 600, fontSize: '13px', color: theme.text.heading }}>VOICE</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px' }}>Noise cancellation</div>
              <div style={{ fontSize: '11px', color: theme.text.secondary }}>Suppress keyboard, mouse and background sounds</div>
            </div>
            <div
              onClick={handleNoiseToggle}
              title={noiseEnabled ? 'Click to disable' : 'Click to enable'}
              style={{
                position: 'relative',
                width: '36px',
                height: '20px',
                borderRadius: '10px',
                background: noiseEnabled ? theme.accent.primary : theme.bg.tertiary,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: noiseEnabled ? '18px' : '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ fontSize: '12px', color: theme.danger.primary }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={uploading || saving}
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
          {profileChanged && (
            <button
              onClick={() => void handleSaveProfile()}
              disabled={saving}
              style={{
                padding: '7px 16px',
                fontSize: '13px',
                borderRadius: '6px',
                border: 'none',
                background: theme.accent.primary,
                color: theme.text.onAccent,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
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
