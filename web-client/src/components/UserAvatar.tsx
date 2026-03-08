import { useState } from 'react';
import type { CSSProperties } from 'react';

type Props = {
  nickname: string;
  bgColor: string;
  avatarUrl?: string;
  size: number;
  isSpeaking?: boolean;
  style?: CSSProperties;
};

export function UserAvatar({ nickname, bgColor, avatarUrl, size, isSpeaking, style }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!avatarUrl && !imgFailed;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        overflow: 'hidden',
        background: showImg ? 'transparent' : bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isSpeaking ? '0 0 0 2px white' : 'none',
        transition: 'box-shadow 0.1s',
        ...style,
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
  );
}
