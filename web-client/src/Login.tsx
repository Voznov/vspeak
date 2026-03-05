import { useState } from 'react';
import { api } from './api';
import { tokenStorage } from './storage';
import { theme } from './theme';
import type { User } from '../../libs/api/entities';

type LoginProps = {
  onLogin: (user: User) => void;
};

export function Login({ onLogin }: LoginProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!nickname.trim()) {
      setError('Enter nickname');

      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { token, user } = await api.login({ nickname: nickname.trim() });
      tokenStorage.set(token);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <div
        style={{
          padding: '20px',
          border: `2px solid ${theme.accent.primary}`,
          borderRadius: '8px',
          background: theme.bg.elevated,
          color: theme.text.primary,
        }}
      >
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Enter nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '10px',
            background: theme.bg.tertiary,
            color: theme.text.primary,
            border: `1px solid ${theme.border.input}`,
            borderRadius: '6px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleLogin}
          disabled={loading || !nickname.trim()}
          style={{
            width: '100%',
            padding: '8px',
            background: theme.accent.primary,
            color: theme.text.onAccent,
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !nickname.trim() ? 'default' : 'pointer',
            opacity: loading || !nickname.trim() ? 0.6 : 1,
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <div style={{ color: theme.danger.text, marginTop: '10px' }}>{error}</div>}
      </div>
    </div>
  );
}
