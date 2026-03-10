import { useState } from 'react';
import type { CSSProperties } from 'react';

if (typeof document !== 'undefined' && !document.getElementById('avatar-spinner-style')) {
  const s = document.createElement('style');
  s.id = 'avatar-spinner-style';
  s.textContent = '@keyframes avatar-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

type Props = {
  nickname: string;
  bgColor: string;
  avatarUrl?: string;
  size: number;
  isSpeaking?: boolean;
  isConnected: boolean;
  style?: CSSProperties;
};

export function UserAvatar({ nickname, bgColor, avatarUrl, size, isSpeaking, isConnected, style }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!avatarUrl && !imgFailed;
  const showSpinner = !isConnected;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          background: showImg ? 'transparent' : bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: !showSpinner && isSpeaking ? '0 0 0 2px white' : 'none',
          transition: 'box-shadow 0.1s',
        }}
      >
        {showImg ? (
          <img
            src={avatarUrl}
            alt={nickname}
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span
            style={{
              color: '#fff',
              fontSize: size * 0.45,
              fontWeight: 600,
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            {nickname.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {showSpinner && (
        <div
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: 'white',
            animation: 'avatar-spin 0.8s linear infinite',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
