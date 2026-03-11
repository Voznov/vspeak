import { useEffect, useRef, useState, type ReactNode } from 'react';
import ChevronDownIcon from '../../assets/chevron-down.svg?react';
import ChevronUpIcon from '../../assets/chevron-up.svg?react';
import { theme } from '../../theme';

type PickerConfig = {
  items: { key: string; label: string }[];
  selected: string | undefined;
  onSelect: (key: string) => void;
  onOpen?: () => void;
  emptyListTitle: string;
};

type ControlButtonProps = {
  icon: ReactNode;
  variant: 'default' | 'green' | 'red';
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  picker?: PickerConfig;
};

const BG: Record<'default' | 'green' | 'red', string> = {
  default: theme.button.inactive,
  green: theme.accent.active,
  red: theme.danger.leave,
};

function PickerItem({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const bg = selected ? theme.accent.active : hovered ? theme.button.inactive : 'transparent';
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 12px',
        background: bg,
        border: 'none',
        borderRadius: '4px',
        color: theme.text.primary,
        fontSize: '13px',
        textAlign: 'left',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </button>
  );
}

export function ControlButton({ icon, variant, onClick, disabled, title, picker }: ControlButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showPicker) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showPicker]);

  const bg = BG[variant];
  const cursor = disabled ? 'not-allowed' : 'pointer';
  const opacity = disabled ? 0.6 : 1;

  if (!picker) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor,
          background: bg,
          color: theme.text.onAccent,
          flexShrink: 0,
          opacity,
        }}
      >
        {icon}
      </button>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '44px',
          background: bg,
          borderRadius: '12px',
          overflow: 'hidden',
          opacity,
        }}
      >
        <button
          onClick={onClick}
          disabled={disabled}
          title={title}
          style={{
            width: '44px',
            height: '44px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor,
            color: theme.text.onAccent,
            flexShrink: 0,
          }}
        >
          {icon}
        </button>
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
        <button
          onClick={() => {
            if (!showPicker) picker.onOpen?.();
            setShowPicker((prev) => !prev);
          }}
          disabled={disabled}
          title="Select device"
          style={{
            width: '24px',
            height: '44px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor,
            color: theme.text.onAccent,
            flexShrink: 0,
            padding: 0,
          }}
        >
          {showPicker ? <ChevronUpIcon width={12} height={12} /> : <ChevronDownIcon width={12} height={12} />}
        </button>
      </div>
      {showPicker && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '0',
            background: theme.bg.elevated,
            border: `1px solid ${theme.border.primary}`,
            borderRadius: '8px',
            padding: '4px',
            minWidth: '220px',
            boxShadow: theme.shadow.contextMenu,
            zIndex: 200,
          }}
        >
          {picker.items.length === 0 ? (
            <div style={{ padding: '8px 12px', color: theme.text.secondary, fontSize: '13px' }}>
              {picker.emptyListTitle}
            </div>
          ) : (
            picker.items.map((item) => (
              <PickerItem
                key={item.key}
                label={item.label}
                selected={item.key === picker.selected}
                onSelect={() => {
                  picker.onSelect(item.key);
                  setShowPicker(false);
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
