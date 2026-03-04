import { storage, STORAGE_KEYS } from './storage.js';
import { detectBasePath } from './router.js';

const resolveDataUrl = (filename) => {
  if (typeof window === 'undefined') return `data/${filename}`;
  const basePath = detectBasePath(window.location.pathname || '/');
  const base = String(basePath || '').replace(/\/+$/, '');
  return `${base}/data/${filename}`;
};

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

const OBJECTIVE_LIBRARY = [
  ['Reduce pipeline failures in business-critical repos', 'Increase deployment frequency for release teams'],
  ['Expand Secure scanning coverage to high-risk services', 'Improve vulnerability remediation cycle time'],
  ['Standardize SCM and merge request workflows across teams', 'Increase code review throughput with policy controls'],
  ['Improve CI runner stability and queue performance', 'Reduce lead time from merge to production deploy'],
  ['Enable release orchestration with GitLab CD environments', 'Improve rollback readiness and release confidence'],
  ['Increase platform adoption depth to 3+ use cases', 'Validate measurable business value with executive sponsor']
];

const SENTIMENT_LIBRARY = [
  'Executive sponsor engaged; team requests clearer value milestones for next quarter.',
  'Delivery leaders are aligned, but adoption pace is inconsistent across squads.',
  'Customer sentiment positive after workshop; expecting stronger CI rollout evidence.',
  'Renewal stakeholders need tighter risk mitigation tracking and weekly updates.',
  'Technical team engaged; blockers are primarily process alignment and ownership clarity.',
  'Customer confidence improving with office-hours cadence and faster issue resolution.'
];

const HYPOTHESIS_LIBRARY = [
  ['Offer CI optimization lab for platform team leads.', 'Position executive snapshot for renewal committee alignment.'],
  ['Drive Secure enablement with policy-as-code workshop.', 'Expand seat footprint after security coverage baseline is validated.'],
  ['Use office hours to unblock CD environment strategy.', 'Promote release governance playbook adoption.'],
  ['Attach success plan metrics to leadership review cadence.', 'Introduce advanced SCM governance motion for scale teams.'],
  ['Target high-variance teams with hands-on pipeline coaching.', 'Package outcome evidence into customer-safe summary for sponsor.'],
  ['Sequence adoption motions by lifecycle stage and renewal window.', 'Map program attendance to next-best-action evidence.']
];

export const normalizeDuplicateAccountContent = (accounts) => {
  const list = Array.isArray(accounts) ? accounts : [];
  if (!list.length) return list;

  const objectiveTitles = list
    .flatMap((account) => account?.outcomes?.objectives || [])
    .map((objective) => String(objective?.title || '').trim())
    .filter(Boolean);
  const uniqueObjectiveTitles = new Set(objectiveTitles);
  const objectiveDuplicationDetected = objectiveTitles.length > 0 && uniqueObjectiveTitles.size <= 2;

  const sentimentNotes = list
    .map((account) => String(account?.internal_only?.sentiment_notes || '').trim())
    .filter(Boolean);
  const uniqueSentimentNotes = new Set(sentimentNotes);
  const sentimentDuplicationDetected = sentimentNotes.length > 0 && uniqueSentimentNotes.size <= 2;

  if (!objectiveDuplicationDetected && !sentimentDuplicationDetected) return list;

  return list.map((account, index) => {
    const objectivePair = OBJECTIVE_LIBRARY[index % OBJECTIVE_LIBRARY.length];
    const currentObjectives = Array.isArray(account?.outcomes?.objectives) ? account.outcomes.objectives : [];
    const objectives = objectiveDuplicationDetected
      ? currentObjectives.map((objective, objectiveIndex) => ({
          ...objective,
          title: objectivePair[objectiveIndex % objectivePair.length] || objective.title
        }))
      : currentObjectives;

    const lifecycle = account.lifecycle_stage || account.health?.lifecycle_stage || 'enable';
    const adoptionLevel = account.adoption?.platform_adoption_level || 'platform adoption developing';
    const executiveSummary =
      objectives.length && objectiveDuplicationDetected
        ? `${account.name} is in ${lifecycle} stage with ${adoptionLevel}; current priority is "${objectives[0].title}" with measurable progress tracked weekly.`
        : account.outcomes?.executive_summary;

    return {
      ...account,
      outcomes: {
        ...(account.outcomes || {}),
        objectives,
        executive_summary: executiveSummary
      },
      internal_only: {
        ...(account.internal_only || {}),
        sentiment_notes: sentimentDuplicationDetected
          ? SENTIMENT_LIBRARY[index % SENTIMENT_LIBRARY.length]
          : account.internal_only?.sentiment_notes,
        expansion_hypotheses: sentimentDuplicationDetected
          ? HYPOTHESIS_LIBRARY[index % HYPOTHESIS_LIBRARY.length]
          : account.internal_only?.expansion_hypotheses
      }
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
  [
    STORAGE_KEYS.requests,
    STORAGE_KEYS.programs,
    STORAGE_KEYS.intakeDraft,
    STORAGE_KEYS.accountOverrides,
    STORAGE_KEYS.playbookChecklist,
    STORAGE_KEYS.gitlabConfig,
    STORAGE_KEYS.engagementLog,
    STORAGE_KEYS.toolkitLaunch
  ].forEach((key) => storage.remove(key));
};

export const loadPlaybookChecklist = () => storage.get(STORAGE_KEYS.playbookChecklist, {});

export const persistPlaybookChecklist = (checklistState) => storage.set(STORAGE_KEYS.playbookChecklist, checklistState);

export const loadDashboardData = async () => {
  const [accountsDoc, requestsDoc, programsDoc, playbooksDoc, resourcesDoc, templatesDoc] = await Promise.all([
    fetchJson(resolveDataUrl('accounts.json'), { accounts: [] }),
    fetchJson(resolveDataUrl('requests.json'), { requests: [] }),
    fetchJson(resolveDataUrl('programs.json'), { programs: [] }),
    fetchJson(resolveDataUrl('playbooks.json'), { playbooks: [] }),
    fetchJson(resolveDataUrl('resources.json'), { categories: [], resources: [] }),
    fetchJson(resolveDataUrl('templates.json'), { templates: {} })
  ]);

  const accounts = normalizeDuplicateAccountContent(mergeAccounts(Array.isArray(accountsDoc.accounts) ? accountsDoc.accounts : []));
  const requests = mergeRequests(Array.isArray(requestsDoc.requests) ? requestsDoc.requests : []);
  const programs = mergePrograms(Array.isArray(programsDoc.programs) ? programsDoc.programs : []);
  const playbooks = Array.isArray(playbooksDoc.playbooks) ? playbooksDoc.playbooks : [];
  const resources = Array.isArray(resourcesDoc.resources) ? resourcesDoc.resources : [];
  const categories = Array.isArray(resourcesDoc.categories) ? resourcesDoc.categories : [];
  const templates = templatesDoc?.templates && typeof templatesDoc.templates === 'object' ? templatesDoc.templates : {};

  return {
    accounts,
    requests,
    programs,
    playbooks,
    resources,
    categories,
    templates,
    updated_on: accountsDoc.updated_on || requestsDoc.updated_on || programsDoc.updated_on || resourcesDoc.updated_on || null
  };
};
