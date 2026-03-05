const normalizeTone = (tone = 'neutral') => {
  const key = String(tone || '').trim().toLowerCase();
  if (['good', 'success', 'green'].includes(key)) return 'success';
  if (['warn', 'warning', 'yellow'].includes(key)) return 'warning';
  if (['risk', 'danger', 'red', 'error'].includes(key)) return 'danger';
  if (['info', 'blue'].includes(key)) return 'info';
  return 'neutral';
};

export const badge = ({ label = '', tone = 'neutral', icon = '' } = {}) => {
  const safeLabel = String(label || '').trim() || 'Unknown';
  const normalized = normalizeTone(tone);
  return `<span class="gl-badge gl-badge--${normalized}">${icon ? `<span aria-hidden="true">${icon}</span>` : ''}<span>${safeLabel}</span></span>`;
};

export const badgeToneFromHealth = (health = '') => {
  const value = String(health || '').trim().toLowerCase();
  if (value === 'green') return 'success';
  if (value === 'yellow') return 'warning';
  if (value === 'red') return 'danger';
  return 'neutral';
};

