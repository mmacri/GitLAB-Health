export const getByPath = (source, path) => {
  const keys = String(path || '')
    .split('.')
    .filter(Boolean);
  if (!keys.length) return undefined;
  return keys.reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), source);
};

export const setByPath = (source, path, value) => {
  const keys = String(path || '')
    .split('.')
    .filter(Boolean);
  if (!keys.length) return source;
  const output = JSON.parse(JSON.stringify(source || {}));
  let cursor = output;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  });
  return output;
};
