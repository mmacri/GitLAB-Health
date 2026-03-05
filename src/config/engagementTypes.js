export const ENGAGEMENT_TYPES = {
  WEBINAR: { label: 'Webinar', icon: 'video', color: '#8b5cf6' },
  OFFICE_HOURS: { label: 'Office Hours', icon: 'clock', color: '#06b6d4' },
  HANDS_ON_LAB: { label: 'Hands-On Lab', icon: 'terminal', color: '#f97316' },
  ON_DEMAND: { label: 'On-Demand', icon: 'zap', color: '#10b981' }
};

export const ENGAGEMENT_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'REQUESTED'];
export const ENGAGEMENT_REQUESTORS = ['CSM', 'AE', 'CUSTOMER', 'RENEWAL_MANAGER'];

export const normalizeEngagementType = (value) => {
  const key = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (ENGAGEMENT_TYPES[key]) return key;
  return 'ON_DEMAND';
};

