import type { TabInfo } from '../lib/types';

interface TabBadgeProps {
  tabs: TabInfo[];
  currentName: string;
}

export function TabBadge({ tabs, currentName }: TabBadgeProps) {
  const otherCount = tabs.length;
  if (otherCount === 0) return null;

  return (
    <div style={badgeStyle}>
      <span style={iconStyle}>⟷</span>
      <span>{otherCount} connected</span>
    </div>
  );
}

const badgeStyle: Record<string, string> = {
  position: 'fixed',
  top: '8px',
  right: '60px',
  zIndex: '2147483646',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '12px',
  background: 'rgba(67, 56, 202, 0.08)',
  color: '#4338CA',
  fontSize: '12px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontWeight: '500',
  pointerEvents: 'none',
};

const iconStyle: Record<string, string> = {
  fontSize: '14px',
};
