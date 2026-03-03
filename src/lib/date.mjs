export const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toIsoDate = (value) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
};

export const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const formatDateTime = (value) => {
  const date = parseDate(value);
  if (!date) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

export const diffInDays = (start, end = new Date()) => {
  const left = start instanceof Date ? start : parseDate(start);
  const right = end instanceof Date ? end : parseDate(end);
  if (!left || !right) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((right.getTime() - left.getTime()) / msPerDay);
};

export const daysUntil = (value, now = new Date()) => {
  const target = parseDate(value);
  if (!target) return null;
  return diffInDays(now, target);
};

export const isWithinDays = (value, maxDays, now = new Date()) => {
  const days = daysUntil(value, now);
  return days !== null && days >= 0 && days <= maxDays;
};

export const nowIso = () => toIsoDate(new Date());