export const CUSTOMER_SAFE_DENYLIST = [
  'internal_only',
  'internal_only.sentiment_notes',
  'internal_only.expansion_hypotheses',
  'internal_only.escalations',
  'notes_internal',
  'internal_notes',
  'sentiment',
  'expansion',
  'escalation'
];

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const normalize = (value) => String(value || '').trim().toLowerCase();

const deniedByList = (path, key, denylist = CUSTOMER_SAFE_DENYLIST) => {
  const fullPath = [...path, key].map((item) => normalize(item)).join('.');
  const keyName = normalize(key);

  return (denylist || []).some((entry) => {
    const deny = normalize(entry);
    if (!deny) return false;
    if (deny.includes('.')) return fullPath === deny || fullPath.startsWith(`${deny}.`);
    return keyName === deny || keyName.includes(deny) || fullPath === deny || fullPath.endsWith(`.${deny}`) || fullPath.includes(`.${deny}.`);
  });
};

export const redactObjectForCustomer = (value, denylist = CUSTOMER_SAFE_DENYLIST, path = []) => {
  if (Array.isArray(value)) {
    return value.map((item) => redactObjectForCustomer(item, denylist, path));
  }
  if (!value || typeof value !== 'object') return value;

  const output = {};
  Object.entries(value).forEach(([key, nextValue]) => {
    if (deniedByList(path, key, denylist)) return;
    output[key] = redactObjectForCustomer(nextValue, denylist, [...path, key]);
  });
  return output;
};

export const redactAccountForCustomer = (account) => {
  return redactObjectForCustomer(deepClone(account || {}));
};

export const redactCollectionForCustomer = (accounts) => (accounts || []).map((account) => redactAccountForCustomer(account));

export const redactPlaybookForCustomer = (playbook) => ({
  ...playbook,
  checklist: (playbook?.checklist || []).filter((item) => !item.internal_only)
});

export const redactPlaybooksForCustomer = (playbooks) => (playbooks || []).map((item) => redactPlaybookForCustomer(item));

export const hasDeniedKey = (value, denylist = CUSTOMER_SAFE_DENYLIST) => {
  const walk = (node, path = []) => {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) {
      return node.some((item) => walk(item, path));
    }
    for (const [key, nextValue] of Object.entries(node)) {
      if (deniedByList(path, key, denylist)) return true;
      if (walk(nextValue, [...path, key])) return true;
    }
    return false;
  };

  return walk(value);
};
