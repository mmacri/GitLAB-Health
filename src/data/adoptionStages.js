export const USE_CASES = ['SCM', 'CI', 'CD', 'DevSecOps', 'Agile Planning'];

export const MATURITY_LEVELS = {
  NOT_STARTED: { label: 'Not Started', score: 0, color: '#6b7280' },
  EXPLORING: { label: 'Exploring', score: 25, color: '#3b82f6' },
  GROWING: { label: 'Growing', score: 50, color: '#f59e0b' },
  ACTIVE: { label: 'Active', score: 75, color: '#10b981' },
  OPTIMIZING: { label: 'Optimizing', score: 100, color: '#059669' }
};

export const MATURITY_ORDER = ['NOT_STARTED', 'EXPLORING', 'GROWING', 'ACTIVE', 'OPTIMIZING'];

export const maturityForPercent = (percent) => {
  const value = Number(percent || 0);
  if (value >= 90) return 'OPTIMIZING';
  if (value >= 75) return 'ACTIVE';
  if (value >= 50) return 'GROWING';
  if (value >= 25) return 'EXPLORING';
  return 'NOT_STARTED';
};

