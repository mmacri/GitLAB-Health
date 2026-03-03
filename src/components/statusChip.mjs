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
  const glyph = icon ? `<span class="chip-icon" aria-hidden="true">${ICONS[normalized] || ICONS.neutral}</span>` : '';
  return `<span class="status-chip status-chip--${normalized}">${glyph}<span>${safeLabel}</span></span>`;
};
