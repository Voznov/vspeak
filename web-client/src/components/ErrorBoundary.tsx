import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: '12px',
            color: '#ccc',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: '18px', color: '#f87171' }}>Something went wrong</div>
          <pre style={{ fontSize: '12px', color: '#999', maxWidth: '600px', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: '6px 16px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
