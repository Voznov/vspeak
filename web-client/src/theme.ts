export const font = {
  family: "'Inter', system-ui, -apple-system, sans-serif",
} as const;

export const theme = {
  bg: {
    primary: '#121212',
    secondary: '#1a1a1a',
    tertiary: '#242424',
    elevated: '#1e1e1e',
    overlay: 'rgba(0, 0, 0, 0.6)',
    video: '#111',
    controlBar: 'rgba(18, 18, 18, 0.85)',
  },
  text: {
    primary: '#e0e0e0',
    secondary: '#999',
    tertiary: '#666',
    onAccent: '#fff',
    heading: '#b0b0b0',
  },
  border: {
    primary: '#333',
    secondary: '#2a2a2a',
    input: '#444',
  },
  accent: {
    primary: '#1a9c6b',
    active: '#2e7d65',
  },
  danger: {
    primary: '#e53935',
    hover: '#2a1a1a',
    text: '#ef5350',
    leave: '#c62828',
  },
  button: {
    inactive: 'rgba(255, 255, 255, 0.15)',
  },
  shadow: {
    modal: '0 8px 32px rgba(0, 0, 0, 0.5)',
    contextMenu: '0 4px 16px rgba(0, 0, 0, 0.4)',
    toast: '0 2px 10px rgba(0, 0, 0, 0.5)',
  },
} as const;
