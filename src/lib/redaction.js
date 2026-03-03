export const CUSTOMER_SAFE_DENYLIST = [
  'internal_only',
  'internal_only.sentiment_notes',
  'internal_only.expansion_hypotheses',
  'internal_only.escalations'
];

const deepClone = (value) => JSON.parse(JSON.stringify(value));

export const redactAccountForCustomer = (account) => {
  const copy = deepClone(account || {});
  delete copy.internal_only;
  return copy;
};

export const redactCollectionForCustomer = (accounts) => (accounts || []).map((account) => redactAccountForCustomer(account));

export const redactPlaybookForCustomer = (playbook) => ({
  ...playbook,
  checklist: (playbook?.checklist || []).filter((item) => !item.internal_only)
});

export const redactPlaybooksForCustomer = (playbooks) => (playbooks || []).map((item) => redactPlaybookForCustomer(item));

export const hasDeniedKey = (value, denylist = CUSTOMER_SAFE_DENYLIST) => {
  const deniedRoots = new Set(denylist.map((entry) => entry.split('.')[0]));

  const walk = (node) => {
    if (!node || typeof node !== 'object') return false;
    for (const key of Object.keys(node)) {
      if (deniedRoots.has(key)) return true;
      if (walk(node[key])) return true;
    }
    return false;
  };

  return walk(value);
};
