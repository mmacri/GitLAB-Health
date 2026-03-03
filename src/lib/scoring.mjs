import { daysUntil, diffInDays, parseDate } from './date.mjs';

const HEALTH_RANK = { green: 1, yellow: 2, red: 3 };
const STAGE_PRIORITY = { onboard: 2, enable: 3, expand: 2, optimize: 2, renew: 4 };

const normalize = (value) => String(value || '').trim().toLowerCase();

export const useCaseEntries = (account) => Object.entries(account?.adoption?.use_case_scores || {});

export const useCaseGreenCount = (account) =>
  useCaseEntries(account).filter(([, score]) => Number(score) >= 75).length;

export const lowestUseCase = (account) => {
  const entries = useCaseEntries(account);
  if (!entries.length) return null;
  return entries.reduce((lowest, current) => (Number(current[1]) < Number(lowest[1]) ? current : lowest));
};

export const activeRequests = (requests, accountId) =>
  (requests || []).filter(
    (item) => item.account_id === accountId && !['completed', 'closed'].includes(normalize(item.status))
  );

const matchPlaybook = (playbooks, stage, topic) => {
  const normalizedStage = normalize(stage);
  const normalizedTopic = normalize(topic);
  return (
    (playbooks || []).find(
      (playbook) => normalize(playbook.stage) === normalizedStage && normalize(playbook.topic) === normalizedTopic
    ) ||
    (playbooks || []).find((playbook) => normalize(playbook.stage) === normalizedStage) ||
    null
  );
};

const mapUseCaseToTopic = (useCase) => {
  const normalized = normalize(useCase);
  if (normalized === 'scm') return 'SCM';
  if (normalized === 'ci') return 'CI';
  if (normalized === 'cd') return 'CD';
  if (normalized === 'secure') return 'Secure';
  return 'platform foundations';
};

const filterByRenewalWindow = (signal, windowKey) => {
  const days = signal.renewalDays ?? 999;
  if (windowKey === '0-90') return days <= 90;
  if (windowKey === '91-180') return days > 90 && days <= 180;
  if (windowKey === '180+') return days > 180;
  return true;
};

export const applyPortfolioFilters = (signals, filters) => {
  const set = filters || {};
  return (signals || []).filter((signal) => {
    if (set.segment && set.segment !== 'all' && signal.account.segment !== set.segment) return false;
    if (!filterByRenewalWindow(signal, set.renewalWindow || 'all')) return false;

    const health = normalize(signal.account.health?.overall);
    if (set.health && set.health !== 'all' && health !== normalize(set.health)) return false;

    if (set.staleOnly && !signal.isStale) return false;

    const lowUseCase = normalize(signal.lowestUseCaseName);
    if (set.lowestUseCase && set.lowestUseCase !== 'all' && lowUseCase !== normalize(set.lowestUseCase)) return false;

    if (set.hasOpenRequest && !signal.requestList.length) return false;

    return true;
  });
};

export const computeAccountSignals = (account, requests, playbooks, programs, now = new Date()) => {
  const healthOverall = normalize(account?.health?.overall) || 'yellow';
  const stage = normalize(account?.health?.lifecycle_stage) || 'enable';
  const renewalDays = daysUntil(account?.renewal_date, now);
  const healthStaleDays = diffInDays(account?.health?.last_updated, now);
  const touchStaleDays = diffInDays(account?.engagement?.last_touch_date, now);
  const requestList = activeRequests(requests, account.id);
  const overdueRequests = requestList.filter((request) => {
    const dueDays = daysUntil(request.due_date, now);
    return dueDays !== null && dueDays < 0;
  });

  const [lowestUseCaseName, lowestUseCaseScore] = lowestUseCase(account) || ['SCM', 0];
  const suggestedTopic = mapUseCaseToTopic(lowestUseCaseName);
  const playbook = matchPlaybook(playbooks, stage, suggestedTopic);
  const recommendedProgram = (programs || []).find((program) => program.program_id === playbook?.recommended_program) || null;

  const outlierScore =
    (HEALTH_RANK[healthOverall] || 2) * 20 +
    ((renewalDays ?? 999) <= 90 ? 15 : 0) +
    (account?.adoption?.trend_30d < 0 ? Math.abs(account.adoption.trend_30d) : 0) +
    ((healthStaleDays ?? 0) > 10 ? 10 : 0) +
    ((touchStaleDays ?? 0) > 14 ? 8 : 0) +
    overdueRequests.length * 6 +
    requestList.length * 2 +
    (STAGE_PRIORITY[stage] || 2) * 3;

  const reasons = [];
  if (healthOverall === 'red') reasons.push('Overall health is red');
  if ((renewalDays ?? 999) <= 90) reasons.push(`Renewal in ${renewalDays} days`);
  if (account?.adoption?.trend_30d < 0) reasons.push(`Adoption trend ${account.adoption.trend_30d}% over 30d`);
  if ((healthStaleDays ?? 0) > 10) reasons.push(`Stale health data (${healthStaleDays} days)`);
  if ((touchStaleDays ?? 0) > 14) reasons.push(`Cadence stale (${touchStaleDays} days)`);
  if (lowestUseCaseScore < 60) reasons.push(`${lowestUseCaseName} score low (${lowestUseCaseScore})`);
  if (overdueRequests.length) reasons.push(`${overdueRequests.length} request(s) overdue`);

  return {
    account,
    stage,
    renewalDays,
    healthStaleDays,
    touchStaleDays,
    requestList,
    overdueRequests,
    lowestUseCaseName,
    lowestUseCaseScore: Number(lowestUseCaseScore),
    suggestedTopic,
    playbook,
    recommendedProgram,
    outlierScore,
    reasons,
    isStale: (healthStaleDays ?? 0) > 10,
    health: healthOverall
  };
};

const upcomingCadence = (signals, now) =>
  signals
    .map((signal) => ({
      accountId: signal.account.id,
      accountName: signal.account.name,
      nextTouchDate: signal.account.engagement?.next_touch_date,
      dueInDays: daysUntil(signal.account.engagement?.next_touch_date, now)
    }))
    .filter((item) => item.dueInDays !== null && item.dueInDays <= 10)
    .sort((left, right) => left.dueInDays - right.dueInDays);

const upcomingRenewals = (signals) =>
  signals
    .filter((signal) => (signal.renewalDays ?? 999) <= 120)
    .sort((left, right) => (left.renewalDays ?? 999) - (right.renewalDays ?? 999));

export const buildPortfolioView = (data, now = new Date()) => {
  const requests = data.requests || [];
  const accounts = data.accounts || [];
  const playbooks = data.playbooks || [];
  const programs = data.programs || [];

  const signals = accounts.map((account) => computeAccountSignals(account, requests, playbooks, programs, now));

  const todayQueue = requests
    .filter((request) => !['completed', 'closed'].includes(normalize(request.status)))
    .map((request) => {
      const dueIn = daysUntil(request.due_date, now);
      const account = accounts.find((item) => item.id === request.account_id);
      return {
        ...request,
        account_name: account?.name || request.account_id,
        due_in_days: dueIn,
        urgency: dueIn === null ? 'warn' : dueIn < 0 ? 'risk' : dueIn <= 2 ? 'warn' : 'good'
      };
    })
    .filter((request) => request.due_in_days === null || request.due_in_days <= 7)
    .sort((left, right) => (left.due_in_days ?? 999) - (right.due_in_days ?? 999));

  const triageQueue = requests
    .filter((request) => ['new', 'triage'].includes(normalize(request.status)))
    .sort((left, right) => {
      const leftDue = parseDate(left.due_date)?.getTime() || Number.POSITIVE_INFINITY;
      const rightDue = parseDate(right.due_date)?.getTime() || Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    });

  const outliers = signals
    .filter((signal) => signal.outlierScore > 0)
    .sort((left, right) => right.outlierScore - left.outlierScore);

  const upcomingPrograms = programs
    .filter((program) => {
      const due = daysUntil(program.date, now);
      return due !== null && due >= 0 && due <= 28;
    })
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  const staleAccounts = signals.filter((signal) => signal.isStale).length;
  const redAccounts = signals.filter((signal) => normalize(signal.account.health?.overall) === 'red').length;
  const requestsWaiting = triageQueue.length;

  const actionsImmediate = [
    ...triageQueue.slice(0, 2).map((item) => `${item.account_id}: triage ${item.topic} request`),
    ...outliers.slice(0, 2).map((item) => `${item.account.name}: ${item.reasons[0] || 'Review risk'}`)
  ];

  const actionsDueSoon = [
    ...upcomingCadence(signals, now)
      .slice(0, 3)
      .map((item) => `${item.accountName}: cadence touch due in ${item.dueInDays}d`),
    ...upcomingRenewals(signals)
      .slice(0, 2)
      .map((item) => `${item.account.name}: renewal in ${item.renewalDays}d`)
  ];

  const actionsStrategic = [
    ...signals
      .filter((signal) => signal.lowestUseCaseScore < 65)
      .slice(0, 3)
      .map((signal) => `${signal.account.name}: improve ${signal.lowestUseCaseName} (${signal.lowestUseCaseScore})`)
  ];

  return {
    signals,
    todayQueue,
    triageQueue,
    outliers,
    upcomingPrograms,
    actions: {
      immediate: actionsImmediate,
      dueSoon: actionsDueSoon,
      strategic: actionsStrategic
    },
    stats: {
      totalAccounts: accounts.length,
      redAccounts,
      staleAccounts,
      requestsWaiting,
      dueNext7: todayQueue.length
    }
  };
};

export const findAccountById = (accounts, id) => (accounts || []).find((account) => account.id === id) || null;

export const buildAccountWorkspace = (data, accountId, now = new Date()) => {
  const selectedId = accountId || data.accounts?.[0]?.id;
  const account = findAccountById(data.accounts, selectedId);
  if (!account) return null;

  const signal = computeAccountSignals(account, data.requests, data.playbooks, data.programs, now);
  const greenCount = useCaseGreenCount(account);
  const renewalWindow =
    signal.renewalDays === null ? 'unknown' : signal.renewalDays <= 90 ? '0-90' : signal.renewalDays <= 180 ? '91-180' : '180+';

  const immediate = [
    signal.playbook?.next_best_action || 'Confirm lifecycle objective and done criteria for the next milestone.',
    signal.reasons[0] || 'Validate account risk and freshness signals.',
    signal.recommendedProgram ? `Invite to ${signal.recommendedProgram.title}` : 'Select best-fit program motion.'
  ];

  const dueSoon = signal.requestList
    .slice(0, 4)
    .map((item) => `${item.topic} request due ${item.due_date} (${item.assigned_to || 'Unassigned'})`);

  const strategic = [
    `Platform adoption target: ${greenCount >= 3 ? 'maintain' : 'reach'} 3+ green use cases`,
    `Renewal window: ${renewalWindow}`,
    signal.lowestUseCaseScore < 70
      ? `Prioritize ${signal.lowestUseCaseName} uplift from ${signal.lowestUseCaseScore}`
      : 'Sustain high-scoring use cases and document outcome evidence'
  ];

  return {
    account,
    signal,
    platformSummary: `${greenCount} of ${useCaseEntries(account).length || 4} use cases >= 75`,
    openRequests: signal.requestList,
    recommendedProgram: signal.recommendedProgram,
    nextBestAction:
      signal.playbook?.next_best_action ||
      'Use pooled CSE programming (webinar/lab/office hours) and track measurable adoption deltas.',
    lifecycleStage: account.health?.lifecycle_stage || 'enable',
    actions: {
      immediate,
      dueSoon,
      strategic
    }
  };
};
