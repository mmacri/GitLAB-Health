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

export const persistRequests = (requests) => storage.set(STORAGE_KEYS.requests, requests);

export const persistProgram = (program) => {
  const current = storage.get(STORAGE_KEYS.programs, {});
  current[program.program_id] = {
    registration_count: program.registration_count,
    attendance_count: program.attendance_count
  };
  storage.set(STORAGE_KEYS.programs, current);
};

export const loadDashboardData = async () => {
  const [accountsDoc, requestsDoc, programsDoc, playbooksDoc, resourcesDoc] = await Promise.all([
    fetchJson('data/accounts.json', { accounts: [] }),
    fetchJson('data/requests.json', { requests: [] }),
    fetchJson('data/programs.json', { programs: [] }),
    fetchJson('data/playbooks.json', { playbooks: [] }),
    fetchJson('data/resources.json', { categories: [], resources: [] })
  ]);

  const accounts = Array.isArray(accountsDoc.accounts) ? accountsDoc.accounts : [];
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