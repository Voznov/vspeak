import { createContext, useCallback, useContext, useRef, useState } from 'react';

type Toast = { id: number; message: string };

const ToastContext = createContext<(message: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const TOAST_DURATION_MS = 2000;

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 9999,
        maxWidth: '400px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: 'rgba(30, 30, 30, 0.92)',
            color: '#f0f0f0',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'monospace',
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
            lineHeight: '1.4',
            wordBreak: 'break-word',
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const addToast = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}
