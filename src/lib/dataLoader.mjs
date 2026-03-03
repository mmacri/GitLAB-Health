import { storage, STORAGE_KEYS } from './storage.mjs';

const fetchJson = async (url, fallback) => {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(error.message);
    return fallback;
  }
};

const mergeRequests = (baseRequests) => {
  const stored = storage.get(STORAGE_KEYS.requests, null);
  if (Array.isArray(stored) && stored.length) return stored;
  return baseRequests;
};

const mergePrograms = (basePrograms) => {
  const attendanceOverrides = storage.get(STORAGE_KEYS.programs, {});
  if (!attendanceOverrides || typeof attendanceOverrides !== 'object') return basePrograms;

  return basePrograms.map((program) => {
    const override = attendanceOverrides[program.program_id];
    if (!override) return program;
    return {
      ...program,
      registration_count:
        typeof override.registration_count === 'number' ? override.registration_count : program.registration_count,
      attendance_count: typeof override.attendance_count === 'number' ? override.attendance_count : program.attendance_count
    };
  });
};

const mergeDeep = (target, source) => {
  if (!source || typeof source !== 'object') return target;
  const output = Array.isArray(target) ? [...target] : { ...(target || {}) };
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeDeep(output[key], value);
      return;
    }
    output[key] = value;
  });
  return output;
};

const mergeAccounts = (baseAccounts) => {
  const overrides = storage.get(STORAGE_KEYS.accountOverrides, {});
  if (!overrides || typeof overrides !== 'object') return baseAccounts;
  return (baseAccounts || []).map((account) => {
    const override = overrides[account.id];
    if (!override) return account;
    return mergeDeep(account, override);
  });
};

export const persistRequests = (requests) => storage.set(STORAGE_KEYS.requests, requests);

export const persistProgram = (program) => {
  const current = storage.get(STORAGE_KEYS.programs, {});
  current[program.program_id] = {
    registration_count: program.registration_count,
    attendance_count: program.attendance_count
  };
  storage.set(STORAGE_KEYS.programs, current);
};

export const persistAccountField = (accountId, path, value) => {
  const current = storage.get(STORAGE_KEYS.accountOverrides, {});
  if (!current[accountId]) current[accountId] = {};

  const keys = String(path || '')
    .split('.')
    .filter(Boolean);
  if (!keys.length) return;

  let cursor = current[accountId];
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  });

  storage.set(STORAGE_KEYS.accountOverrides, current);
};

export const resetLocalState = () => {
  [STORAGE_KEYS.requests, STORAGE_KEYS.programs, STORAGE_KEYS.intakeDraft, STORAGE_KEYS.accountOverrides, STORAGE_KEYS.playbookChecklist].forEach(
    (key) => storage.remove(key)
  );
};

export const loadPlaybookChecklist = () => storage.get(STORAGE_KEYS.playbookChecklist, {});

export const persistPlaybookChecklist = (checklistState) => storage.set(STORAGE_KEYS.playbookChecklist, checklistState);

export const loadDashboardData = async () => {
  const [accountsDoc, requestsDoc, programsDoc, playbooksDoc, resourcesDoc] = await Promise.all([
    fetchJson('data/accounts.json', { accounts: [] }),
    fetchJson('data/requests.json', { requests: [] }),
    fetchJson('data/programs.json', { programs: [] }),
    fetchJson('data/playbooks.json', { playbooks: [] }),
    fetchJson('data/resources.json', { categories: [], resources: [] })
  ]);

  const accounts = mergeAccounts(Array.isArray(accountsDoc.accounts) ? accountsDoc.accounts : []);
  const requests = mergeRequests(Array.isArray(requestsDoc.requests) ? requestsDoc.requests : []);
  const programs = mergePrograms(Array.isArray(programsDoc.programs) ? programsDoc.programs : []);
  const playbooks = Array.isArray(playbooksDoc.playbooks) ? playbooksDoc.playbooks : [];
  const resources = Array.isArray(resourcesDoc.resources) ? resourcesDoc.resources : [];
  const categories = Array.isArray(resourcesDoc.categories) ? resourcesDoc.categories : [];

  return {
    accounts,
    requests,
    programs,
    playbooks,
    resources,
    categories,
    updated_on: accountsDoc.updated_on || requestsDoc.updated_on || programsDoc.updated_on || resourcesDoc.updated_on || null
  };
};
