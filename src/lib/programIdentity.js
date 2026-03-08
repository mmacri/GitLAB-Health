const canonicalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const toProgramLookupKey = (value) => {
  const normalized = canonicalize(value);
  if (!normalized) return '';
  return normalized.startsWith('prog_') ? normalized : `prog_${normalized}`;
};

export const programIdsMatch = (left, right) => {
  const leftKey = toProgramLookupKey(left);
  const rightKey = toProgramLookupKey(right);
  if (!leftKey || !rightKey) return false;
  return leftKey === rightKey;
};
