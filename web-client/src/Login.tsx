import { useState } from 'react';
import { api, setToken } from './api';
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
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ padding: '20px', border: '2px solid #4CAF50', borderRadius: '8px' }}>
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Enter nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
          disabled={loading}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <button onClick={handleLogin} disabled={loading || !nickname.trim()} style={{ width: '100%' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
      </div>
    </div>
  );
}
