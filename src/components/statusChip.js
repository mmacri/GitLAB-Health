import { badge } from './ui/Badge.js';

const ICONS = {
  good: '●',
  warn: '●',
  risk: '●',
  neutral: '●',
  stale: '◷',
  missing: '◌'
};

const normalizeTone = (tone) => {
  const value = String(tone || '').toLowerCase();
  if (['good', 'success', 'green'].includes(value)) return 'good';
  if (['warn', 'warning', 'yellow', 'watch'].includes(value)) return 'warn';
  if (['risk', 'danger', 'red'].includes(value)) return 'risk';
  if (value === 'stale') return 'stale';
  if (value === 'missing') return 'missing';
  return 'neutral';
};

export const statusToneFromHealth = (health) => {
  const value = String(health || '').toLowerCase();
  if (value === 'green') return 'good';
  if (value === 'yellow') return 'warn';
  if (value === 'red') return 'risk';
  return 'neutral';
};

export const statusChip = ({ label, tone, icon = true }) => {
  const safeLabel = String(label || '').trim() || 'Unknown';
  const normalized = normalizeTone(tone);
  const badgeTone =
    normalized === 'good'
      ? 'success'
      : normalized === 'warn'
        ? 'warning'
        : normalized === 'risk'
          ? 'danger'
          : normalized === 'stale' || normalized === 'missing'
            ? 'neutral'
            : 'neutral';
  return badge({ label: safeLabel, tone: badgeTone, icon: icon ? ICONS[normalized] || ICONS.neutral : '' });
};
