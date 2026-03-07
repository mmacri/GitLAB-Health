import { daysUntil, diffInDays, parseDate } from './date.js';
import { evaluateOperatingModelEngine } from './operatingModelEngine.js';
import { ensurePtCalibration } from '../config/ptCalibration.js';

const HEALTH_RANK = { green: 1, yellow: 2, red: 3 };
const STAGE_PRIORITY = { onboard: 2, enable: 3, expand: 2, optimize: 2, renew: 4 };
export const DEFAULT_STALE_DAYS = 30;

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

const filterByEngagementRecency = (signal, windowKey) => {
  const days = signal.touchStaleDays ?? 999;
  if (windowKey === '0-14') return days <= 14;
  if (windowKey === '15-30') return days > 14 && days <= 30;
  if (windowKey === '31+') return days > 30;
  return true;
};

export const applyPortfolioFilters = (signals, filters) => {
  const set = filters || {};
  const staleDays = Number(set.staleDays || DEFAULT_STALE_DAYS);

  return (signals || []).filter((signal) => {
    if (set.segment && set.segment !== 'all' && signal.account.segment !== set.segment) return false;
    if (!filterByRenewalWindow(signal, set.renewalWindow || 'all')) return false;
    if (!filterByEngagementRecency(signal, set.engagementRecency || 'all')) return false;

    const health = normalize(signal.account.health?.overall);
    if (set.health && set.health !== 'all' && health !== normalize(set.health)) return false;

    const staleByFilter = Number(signal.healthStaleDays ?? 0) > staleDays;
    if (set.staleOnly && !staleByFilter) return false;

    const lowUseCase = normalize(signal.lowestUseCaseName);
    if (set.lowestUseCase && set.lowestUseCase !== 'all' && lowUseCase !== normalize(set.lowestUseCase)) return false;

    if (set.hasOpenRequest && !signal.requestList.length) return false;
    if (set.belowThreeGreen && Number(signal.greenUseCaseCount || 0) >= 3) return false;

    return true;
  });
};

export const computeAccountSignals = (account, requests, playbooks, programs, now = new Date()) => {
  const healthOverall = normalize(account?.health?.overall) || 'yellow';
  const stage = normalize(account?.lifecycle_stage || account?.health?.lifecycle_stage) || 'enable';
  const renewalDays = daysUntil(account?.renewal_date, now);
  const healthStaleDays = diffInDays(account?.health?.last_updated, now);
  const touchStaleDays = diffInDays(account?.engagement?.last_touch_date, now);
  const nextEbrDays = daysUntil(account?.engagement?.next_ebr_date, now);
  const staleThreshold = DEFAULT_STALE_DAYS;
  const requestList = activeRequests(requests, account.id);
  const overdueRequests = requestList.filter((request) => {
    const dueDays = daysUntil(request.due_date, now);
    return dueDays !== null && dueDays < 0;
  });

  const [lowestUseCaseName, lowestUseCaseScore] = lowestUseCase(account) || ['SCM', 0];
  const greenUseCaseCount = useCaseGreenCount(account);
  const suggestedTopic = mapUseCaseToTopic(lowestUseCaseName);
  const playbook = matchPlaybook(playbooks, stage, suggestedTopic);
  const recommendedProgram = (programs || []).find((program) => program.program_id === playbook?.recommended_program) || null;

  const outlierScore =
    (HEALTH_RANK[healthOverall] || 2) * 20 +
    ((renewalDays ?? 999) <= 90 ? 15 : 0) +
    (account?.adoption?.trend_30d < 0 ? Math.abs(account.adoption.trend_30d) : 0) +
    ((healthStaleDays ?? 0) > staleThreshold ? 10 : 0) +
    ((touchStaleDays ?? 0) > 14 ? 8 : 0) +
    overdueRequests.length * 6 +
    requestList.length * 2 +
    (STAGE_PRIORITY[stage] || 2) * 3;

  const reasons = [];
  if (healthOverall === 'red') reasons.push('Overall health is red');
  if ((renewalDays ?? 999) <= 90) reasons.push(`Renewal in ${renewalDays} days`);
  if (account?.adoption?.trend_30d < 0) reasons.push(`Adoption trend ${account.adoption.trend_30d}% over 30d`);
  if ((healthStaleDays ?? 0) > staleThreshold) reasons.push(`Stale health data (${healthStaleDays} days)`);
  if ((touchStaleDays ?? 0) > 14) reasons.push(`Cadence stale (${touchStaleDays} days)`);
  if (greenUseCaseCount < 3) reasons.push(`${greenUseCaseCount} of 4 use cases green (target 3+)`);
  if (lowestUseCaseScore < 60) reasons.push(`${lowestUseCaseName} score low (${lowestUseCaseScore})`);
  if (overdueRequests.length) reasons.push(`${overdueRequests.length} request(s) overdue`);

  return {
    account,
    stage,
    renewalDays,
    healthStaleDays,
    touchStaleDays,
    nextEbrDays,
    requestList,
    overdueRequests,
    lowestUseCaseName,
    lowestUseCaseScore: Number(lowestUseCaseScore),
    greenUseCaseCount,
    suggestedTopic,
    playbook,
    recommendedProgram,
    outlierScore,
    reasons,
    isStale: (healthStaleDays ?? 0) > staleThreshold,
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
  const operatingModel = evaluateOperatingModelEngine({
    account,
    signal,
    rules: data.rules || [],
    playbooks: data.playbooks || [],
    resources: data.resources || [],
    now
  });
  const greenCount = useCaseGreenCount(account);
  const renewalWindow =
    signal.renewalDays === null ? 'unknown' : signal.renewalDays <= 90 ? '0-90' : signal.renewalDays <= 180 ? '91-180' : '180+';

  const engineImmediate = (operatingModel.recommendations || []).slice(0, 3).map((item) => `${item.title}: ${item.recommendation}`);
  const immediate = [
    ...engineImmediate,
    signal.playbook?.next_best_action || 'Confirm lifecycle objective and done criteria for the next milestone.',
    signal.reasons[0] || 'Validate account risk and freshness signals.',
    signal.recommendedProgram ? `Invite to ${signal.recommendedProgram.title}` : 'Select best-fit program motion.'
  ].slice(0, 5);

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
    operatingModel,
    platformSummary: `${greenCount} of ${useCaseEntries(account).length || 4} use cases >= 75`,
    openRequests: signal.requestList,
    recommendedProgram: signal.recommendedProgram,
    nextBestAction:
      signal.playbook?.next_best_action ||
      'Use pooled CSE programming (webinar/lab/office hours) and track measurable adoption deltas.',
    lifecycleStage: account.lifecycle_stage || account.health?.lifecycle_stage || 'enable',
    actions: {
      immediate,
      dueSoon,
      strategic
    }
  };
};

const WORKSPACE_STAGE_ORDER = ['Align', 'Onboard', 'Adopt', 'Enable', 'Expand', 'Renew'];
const RISK_WEIGHTS = { Low: 10, Medium: 20, High: 35, Critical: 45 };
const DEFAULT_SCORE_WEIGHTS = { adoption: 45, engagement: 30, risk: 25 };

const ensureWorkspaceCustomer = (workspace, customerId) =>
  (workspace?.customers || []).find((customer) => customer.id === customerId) || null;

const normalizeWeight = (value) => Math.max(0, Number(value || 0));

const scoringWeights = (workspace) => {
  const configured = workspace?.settings?.scoringWeights || DEFAULT_SCORE_WEIGHTS;
  const adoption = normalizeWeight(configured.adoption);
  const engagement = normalizeWeight(configured.engagement);
  const risk = normalizeWeight(configured.risk);
  const total = adoption + engagement + risk;
  if (!total) return { adoption: 0.45, engagement: 0.3, risk: 0.25, normalized: DEFAULT_SCORE_WEIGHTS, total: 100 };
  return {
    adoption: adoption / total,
    engagement: engagement / total,
    risk: risk / total,
    normalized: {
      adoption: Math.round((adoption / total) * 100),
      engagement: Math.round((engagement / total) * 100),
      risk: Math.round((risk / total) * 100)
    },
    total
  };
};

const activeDismissals = (workspace, customerId, now = new Date()) => {
  const dismissals = workspace?.risk?.[customerId]?.dismissals || [];
  const nowTime = now.getTime();
  return dismissals.filter((dismissal) => {
    const until = new Date(dismissal.dismissedUntil || 0).getTime();
    return dismissal.code && Number.isFinite(until) && until >= nowTime;
  });
};

const isSignalDismissed = (workspace, customerId, code, now = new Date()) =>
  activeDismissals(workspace, customerId, now).some((dismissal) => dismissal.code === code);

const latestEngagementTs = (workspace, customerId) => {
  const entries = (workspace?.engagements?.[customerId] || []).slice();
  entries.sort((left, right) => new Date(right.ts || 0).getTime() - new Date(left.ts || 0).getTime());
  return entries[0]?.ts || null;
};

const countEngagementsSince = (workspace, customerId, days, now = new Date()) => {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return (workspace?.engagements?.[customerId] || []).filter((entry) => new Date(entry.ts || 0).getTime() >= cutoff).length;
};

const clampScore = (value, min = 0, max = 100) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
};

const ptCalibration = (workspace) => ensurePtCalibration(workspace?.settings?.ptCalibration);

const propensityBand = (score, banding) => {
  const value = Number(score || 0);
  const high = Number(banding?.high || 70);
  const medium = Number(banding?.medium || 45);
  if (value >= high) return 'High';
  if (value >= medium) return 'Medium';
  return 'Low';
};

const renewalPressureScore = (renewalDays, profile) => {
  const fallbackScore = Number(profile?.renewalPressure?.unknownScore || 20);
  const days = Number(renewalDays);
  if (!Number.isFinite(days)) return fallbackScore;
  const buckets = Array.isArray(profile?.renewalPressure?.buckets) ? profile.renewalPressure.buckets : [];
  const match = buckets.find((bucket) => days <= Number(bucket?.maxDays ?? Number.POSITIVE_INFINITY));
  if (match) return Number(match.score || 0);
  return fallbackScore;
};

const primaryFactorLabel = (factors, fallback) => {
  const strongest = [...(factors || [])]
    .sort((left, right) => Math.abs(Number(right.points || 0)) - Math.abs(Number(left.points || 0)))[0];
  return strongest?.label || fallback;
};

export const computeAdoptionScore = (workspace, customerId) => {
  const adoption = workspace?.adoption?.[customerId];
  if (!adoption) return 0;
  const useCases = Object.values(adoption.useCases || {});
  const useCaseAverage = useCases.length
    ? useCases.reduce((sum, item) => sum + Number(item?.percent || 0), 0) / useCases.length
    : 0;
  const stages = Object.values(adoption.devsecopsStages || {});
  const stageScore = stages.length
    ? (stages.filter((status) => String(status) === 'Adopted').length / stages.length) * 100
    : 0;
  return Math.round(useCaseAverage * 0.7 + stageScore * 0.3);
};

export const computeEngagementScore = (workspace, customerId, now = new Date()) => {
  const lastTouch = latestEngagementTs(workspace, customerId);
  if (!lastTouch) return 20;
  const days = diffInDays(lastTouch.slice(0, 10), now) ?? 120;
  const recencyScore = Math.max(0, 100 - days * 1.8);
  const freq30 = countEngagementsSince(workspace, customerId, 30, now);
  const freq90 = countEngagementsSince(workspace, customerId, 90, now);
  const cadenceBonus = Math.min(25, freq30 * 6 + Math.floor(freq90 / 2));
  return Math.round(Math.min(100, recencyScore * 0.75 + cadenceBonus));
};

export const deriveRiskSignals = (workspace, customerId, now = new Date()) => {
  const customer = ensureWorkspaceCustomer(workspace, customerId);
  if (!customer) return [];
  const adoption = workspace?.adoption?.[customerId] || {};
  const useCases = adoption.useCases || {};
  const stages = adoption.devsecopsStages || {};
  const timeToValue = Array.isArray(adoption.timeToValue) ? adoption.timeToValue : [];
  const autoSignals = [];

  const lastTouch = latestEngagementTs(workspace, customerId);
  const touchDays = lastTouch ? diffInDays(String(lastTouch).slice(0, 10), now) : 999;
  if ((touchDays ?? 999) > 60) {
    autoSignals.push({
      code: 'LOW_ENGAGEMENT',
      severity: 'Medium',
      detectedAt: now.toISOString(),
      detail: `No engagement recorded in ${touchDays} days`,
      source: 'derived'
    });
  }

  const renewalDays = daysUntil(customer.renewalDate, now);
  if (renewalDays !== null && renewalDays <= 90) {
    autoSignals.push({
      code: 'RENEWAL_SOON',
      severity: renewalDays <= 45 ? 'High' : 'Medium',
      detectedAt: now.toISOString(),
      detail: `Renewal in ${renewalDays} days`,
      source: 'derived'
    });
  }

  if (Number(useCases.Security?.percent || 0) < 30) {
    autoSignals.push({
      code: 'LOW_SECURITY_ADOPTION',
      severity: 'Medium',
      detectedAt: now.toISOString(),
      detail: 'Security use-case adoption is below 30%',
      source: 'derived'
    });
  }

  if (Number(useCases.CICD?.percent || 0) < 40) {
    autoSignals.push({
      code: 'LOW_CICD_ADOPTION',
      severity: 'Medium',
      detectedAt: now.toISOString(),
      detail: 'CI/CD use-case adoption is below 40%',
      source: 'derived'
    });
  }

  const firstPipeline = timeToValue.find((item) => String(item.milestone || '').toLowerCase().includes('pipeline'));
  if (!firstPipeline || String(firstPipeline.status || '').toLowerCase() !== 'done') {
    autoSignals.push({
      code: 'NO_TIME_TO_VALUE',
      severity: 'High',
      detectedAt: now.toISOString(),
      detail: 'First pipeline run milestone is missing or not complete',
      source: 'derived'
    });
  }

  const cicdPercent = Number(useCases.CICD?.percent || 0);
  const secureStage = String(stages.Secure || '');
  if (cicdPercent >= 60 && secureStage === 'Not Started') {
    autoSignals.push({
      code: 'STAGE_GAP_SECURE',
      severity: 'Medium',
      detectedAt: now.toISOString(),
      detail: 'Secure stage is not started while CI/CD adoption is above 60%',
      source: 'derived'
    });
  }

  const signals = autoSignals.filter((signal) => !isSignalDismissed(workspace, customerId, signal.code, now));

  const manualSignals = (workspace?.risk?.[customerId]?.signals || []).filter((signal) => signal.source !== 'derived');
  const dedupe = new Map();
  [...signals, ...manualSignals].forEach((signal) => {
    if (!signal?.code) return;
    dedupe.set(signal.code, signal);
  });
  return [...dedupe.values()];
};

export const computeRiskScore = (workspace, customerId, now = new Date()) => {
  const risk = workspace?.risk?.[customerId] || {};
  const signals = deriveRiskSignals(workspace, customerId, now);
  const weight = signals.reduce((sum, signal) => sum + (RISK_WEIGHTS[signal.severity] || 15), 0);
  const playbookPenalty = (risk.playbook || []).filter((item) => String(item.status || '').toLowerCase() !== 'complete').length * 4;
  return Math.max(0, Math.min(100, Math.round(weight + playbookPenalty)));
};

export const computePtEProxy = (workspace, customerId, now = new Date()) => {
  const customer = ensureWorkspaceCustomer(workspace, customerId);
  const calibration = ptCalibration(workspace);
  if (!customer) {
    return {
      score: 0,
      band: 'Low',
      driver: 'No customer data available.',
      factors: []
    };
  }

  const adoptionScore = computeAdoptionScore(workspace, customerId);
  const engagementScore = computeEngagementScore(workspace, customerId, now);
  const riskScore = computeRiskScore(workspace, customerId, now);
  const renewalDays = daysUntil(customer.renewalDate, now);
  const useCases = workspace?.adoption?.[customerId]?.useCases || {};
  const stageStatuses = workspace?.adoption?.[customerId]?.devsecopsStages || {};
  const stageCoverage = Object.keys(stageStatuses).length
    ? (Object.values(stageStatuses).filter((status) => String(status) === 'Adopted').length / Object.keys(stageStatuses).length) * 100
    : 0;
  const cicdPercent = Number(useCases.CICD?.percent || 0);
  const securityPercent = Number(useCases.Security?.percent || 0);
  const openExpansionCount = deriveExpansionSuggestions(workspace, customerId).filter(
    (item) => !['won', 'closed'].includes(String(item.status || '').toLowerCase())
  ).length;
  const pteWeights = calibration.pte.weights;
  const pteAdjustments = calibration.pte.adjustments;

  const factors = [
    { label: 'Adoption depth', points: adoptionScore * pteWeights.adoption },
    { label: 'Engagement quality', points: engagementScore * pteWeights.engagement },
    { label: 'Risk stability', points: (100 - riskScore) * pteWeights.riskStability },
    { label: 'CI/CD adoption depth', points: cicdPercent * pteWeights.cicd },
    { label: 'Security adoption depth', points: securityPercent * pteWeights.security },
    { label: 'DevSecOps stage progression', points: stageCoverage * pteWeights.stageCoverage }
  ];

  if (Number.isFinite(Number(renewalDays))) {
    if (renewalDays <= pteAdjustments.renewalNearWindowDays)
      factors.push({ label: 'Renewal expansion window', points: pteAdjustments.renewalNearBonus });
    else if (renewalDays <= pteAdjustments.renewalMidWindowDays)
      factors.push({ label: 'Near-term renewal leverage', points: pteAdjustments.renewalMidBonus });
    else if (renewalDays > pteAdjustments.renewalDistantDays)
      factors.push({ label: 'Renewal too distant', points: pteAdjustments.renewalDistantPenalty });
  }

  if (openExpansionCount > 0) {
    factors.push({
      label: 'Open expansion opportunities',
      points: Math.min(pteAdjustments.openExpansionCap, openExpansionCount * pteAdjustments.openExpansionPerOpportunity)
    });
  }
  if (engagementScore < pteAdjustments.lowEngagementThreshold) {
    factors.push({ label: 'Low engagement momentum', points: pteAdjustments.lowEngagementPenalty });
  }
  if (riskScore >= pteAdjustments.highRiskThreshold) {
    factors.push({ label: 'High active risk burden', points: pteAdjustments.highRiskPenalty });
  }

  const rawScore = factors.reduce((sum, factor) => sum + Number(factor.points || 0), 0);
  const score = Math.round(clampScore(rawScore));
  const band = propensityBand(score, calibration.banding);
  const driver = primaryFactorLabel(factors, 'Balanced adoption and engagement posture.');
  return { score, band, driver, factors };
};

export const computePtCProxy = (workspace, customerId, now = new Date()) => {
  const customer = ensureWorkspaceCustomer(workspace, customerId);
  const calibration = ptCalibration(workspace);
  if (!customer) {
    return {
      score: 0,
      band: 'Low',
      driver: 'No customer data available.',
      factors: []
    };
  }

  const adoptionScore = computeAdoptionScore(workspace, customerId);
  const engagementScore = computeEngagementScore(workspace, customerId, now);
  const riskScore = computeRiskScore(workspace, customerId, now);
  const renewalDays = daysUntil(customer.renewalDate, now);
  const renewalPressure = renewalPressureScore(renewalDays, calibration);
  const signals = deriveRiskSignals(workspace, customerId, now);
  const lastTouch = latestEngagementTs(workspace, customerId);
  const noTouchDays = diffInDays(String(lastTouch || '').slice(0, 10), now) ?? 999;
  const securePercent = Number(workspace?.adoption?.[customerId]?.useCases?.Security?.percent || 0);
  const ptcWeights = calibration.ptc.weights;
  const ptcAdjustments = calibration.ptc.adjustments;

  const factors = [
    { label: 'Active risk signals', points: riskScore * ptcWeights.risk },
    { label: 'Adoption gap', points: (100 - adoptionScore) * ptcWeights.adoptionGap },
    { label: 'Engagement gap', points: (100 - engagementScore) * ptcWeights.engagementGap },
    { label: 'Renewal pressure', points: renewalPressure * ptcWeights.renewalPressure }
  ];

  if (signals.some((signal) => String(signal.code) === 'RENEWAL_SOON')) {
    factors.push({ label: 'Renewal soon risk signal', points: ptcAdjustments.renewalSoonSignal });
  }
  if (noTouchDays > ptcAdjustments.staleEngagementDays) {
    factors.push({ label: 'Prolonged engagement gap', points: ptcAdjustments.staleEngagementPenalty });
  }
  if (securePercent < ptcAdjustments.lowSecurityThreshold) {
    factors.push({ label: 'Security adoption gap', points: ptcAdjustments.lowSecurityPenalty });
  }
  if (
    engagementScore >= ptcAdjustments.strongMomentumEngagement &&
    adoptionScore >= ptcAdjustments.strongMomentumAdoption &&
    riskScore <= ptcAdjustments.strongMomentumRiskMax
  ) {
    factors.push({ label: 'Strong customer momentum', points: ptcAdjustments.strongMomentumCredit });
  }

  const rawScore = factors.reduce((sum, factor) => sum + Number(factor.points || 0), 0);
  const score = Math.round(clampScore(rawScore));
  const band = propensityBand(score, calibration.banding);
  const driver = primaryFactorLabel(factors, 'No material churn pressure detected.');
  return { score, band, driver, factors };
};

const healthFromScores = ({ adoptionScore, engagementScore, riskScore, weights }) => {
  const modelWeights = weights || { adoption: 0.45, engagement: 0.3, risk: 0.25 };
  const total = adoptionScore * modelWeights.adoption + engagementScore * modelWeights.engagement + (100 - riskScore) * modelWeights.risk;
  if (total >= 75) return 'Green';
  if (total >= 55) return 'Yellow';
  return 'Red';
};

export const scoreBreakdown = (workspace, customerId, now = new Date()) => {
  const adoptionScore = computeAdoptionScore(workspace, customerId);
  const engagementScore = computeEngagementScore(workspace, customerId, now);
  const riskScore = computeRiskScore(workspace, customerId, now);
  const pte = computePtEProxy(workspace, customerId, now);
  const ptc = computePtCProxy(workspace, customerId, now);
  const customer = ensureWorkspaceCustomer(workspace, customerId);
  const signals = deriveRiskSignals(workspace, customerId, now);
  const dismissals = activeDismissals(workspace, customerId, now);
  const calibration = ptCalibration(workspace);
  const weights = scoringWeights(workspace);
  const healthOverride = workspace?.risk?.[customerId]?.overrideHealth || null;
  const health = healthOverride || healthFromScores({ adoptionScore, engagementScore, riskScore, weights });
  const engagementDays = diffInDays(String(latestEngagementTs(workspace, customerId) || '').slice(0, 10), now) ?? 999;

  return {
    customer,
    adoptionScore,
    engagementScore,
    riskScore,
    pteScore: pte.score,
    ptcScore: ptc.score,
    pteBand: pte.band,
    ptcBand: ptc.band,
    pteDriver: pte.driver,
    ptcDriver: ptc.driver,
    calibration: {
      profileId: calibration.profileId,
      profileVersion: calibration.profileVersion,
      provenance: calibration.provenance
    },
    health,
    riskSignals: signals,
    dismissedSignals: dismissals,
    lastEngagementDate: latestEngagementTs(workspace, customerId),
    engagementDays,
    renewalDays: daysUntil(customer?.renewalDate, now),
    weights: weights.normalized,
    why: [
      `Adoption ${adoptionScore} contributes ${(adoptionScore * weights.adoption).toFixed(1)} points (${weights.normalized.adoption}% weight)`,
      `Engagement ${engagementScore} contributes ${(engagementScore * weights.engagement).toFixed(1)} points (${weights.normalized.engagement}% weight)`,
      `Risk burden ${riskScore} subtracts ${(riskScore * weights.risk).toFixed(1)} points (${weights.normalized.risk}% weight)`,
      `PtE proxy ${pte.score} (${pte.band}) driven by ${pte.driver}`,
      `PtC proxy ${ptc.score} (${ptc.band}) driven by ${ptc.driver}`,
      `Engagement recency: ${engagementDays === 999 ? 'no touch logged' : `${engagementDays} days since last touch`}`,
      signals.length ? `${signals.length} active risk signal(s): ${signals.map((item) => item.code).join(', ')}` : 'No active risk signals',
      dismissals.length ? `${dismissals.length} signal dismissal(s) active through ${dismissals.map((item) => String(item.dismissedUntil || '').slice(0, 10)).join(', ')}` : 'No active dismissals'
    ]
  };
};

export const deriveExpansionSuggestions = (workspace, customerId) => {
  const adoption = workspace?.adoption?.[customerId] || {};
  const useCases = adoption.useCases || {};
  const suggestions = [];
  const addSuggestion = (id, title, rationale, estImpact) => {
    suggestions.push({ id, type: 'UseCaseAdd', title, rationale, estImpact, status: 'Open', auto: true });
  };
  if (Number(useCases.Security?.percent || 0) < 35) {
    addSuggestion(
      `auto_${customerId}_security`,
      'Enable secure pipeline baseline',
      'Security adoption is below 35%',
      'Improve vulnerability response cycle and governance confidence'
    );
  }
  if (Number(useCases.Compliance?.percent || 0) < 40) {
    addSuggestion(
      `auto_${customerId}_compliance`,
      'Introduce policy-as-code compliance controls',
      'Compliance adoption is below 40%',
      'Reduce audit preparation overhead and policy drift'
    );
  }
  if (Number(useCases.Observability?.percent || 0) < 30) {
    addSuggestion(
      `auto_${customerId}_observability`,
      'Operationalize DORA scorecard and monitoring',
      'Observability adoption is below 30%',
      'Strengthen value narrative with measurable outcomes'
    );
  }
  const existing = workspace?.expansion?.[customerId] || [];
  const dedupe = new Map();
  [...suggestions, ...existing].forEach((item) => {
    if (!item?.id) return;
    dedupe.set(item.id, item);
  });
  return [...dedupe.values()];
};

export const buildWorkspacePortfolio = (workspace, now = new Date()) => {
  const rows = (workspace?.customers || []).map((customer) => {
    const metrics = scoreBreakdown(workspace, customer.id, now);
    const useCases = workspace?.adoption?.[customer.id]?.useCases || {};
    const stageStatuses = workspace?.adoption?.[customer.id]?.devsecopsStages || {};
    const stageAdopted = Object.values(stageStatuses).filter((value) => String(value) === 'Adopted').length;
    const openExpansionCount = deriveExpansionSuggestions(workspace, customer.id).filter(
      (item) => String(item.status || '').toLowerCase() !== 'won' && String(item.status || '').toLowerCase() !== 'closed'
    ).length;
    return {
      customer,
      ...metrics,
      cicdPercent: Number(useCases.CICD?.percent || 0),
      securityPercent: Number(useCases.Security?.percent || 0),
      stageCoverage: stageAdopted,
      stageTotal: Object.keys(stageStatuses).length || 8,
      openExpansionCount,
      pteScore: metrics.pteScore,
      ptcScore: metrics.ptcScore,
      pteBand: metrics.pteBand,
      ptcBand: metrics.ptcBand,
      pteDriver: metrics.pteDriver,
      ptcDriver: metrics.ptcDriver,
      engagementType: String(customer.engagementType || 'ON_DEMAND').toUpperCase(),
      engagementStatus: String(customer.engagementStatus || 'REQUESTED').toUpperCase(),
      engagementDate: customer.engagementDate || '',
      requestedBy: String(customer.requestedBy || 'CSM').toUpperCase(),
      adoptionProfile: customer.adoptionProfile || {}
    };
  });

  const healthDistribution = rows.reduce(
    (acc, row) => {
      const key = String(row.health || 'Yellow').toLowerCase();
      if (!acc[key]) acc[key] = 0;
      acc[key] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 }
  );
  const adoptionCoverage = {
    avgAdoption: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.adoptionScore, 0) / rows.length) : 0,
    avgCicd: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.cicdPercent, 0) / rows.length) : 0,
    avgSecurity: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.securityPercent, 0) / rows.length) : 0
  };
  const engagementCoverage = {
    in30: rows.filter((row) => Number(row.engagementDays ?? 999) <= 30).length,
    in60: rows.filter((row) => Number(row.engagementDays ?? 999) > 30 && Number(row.engagementDays ?? 999) <= 60).length,
    in90: rows.filter((row) => Number(row.engagementDays ?? 999) > 60 && Number(row.engagementDays ?? 999) <= 90).length,
    over90: rows.filter((row) => Number(row.engagementDays ?? 999) > 90).length
  };
  const atRisk = rows
    .filter((row) => String(row.health).toLowerCase() !== 'green')
    .sort((left, right) => Number(right.riskScore || 0) - Number(left.riskScore || 0))
    .slice(0, 10);

  return {
    rows,
    healthDistribution,
    adoptionCoverage,
    engagementCoverage,
    atRisk
  };
};

export const buildProgramMetrics = (workspace) => {
  const programs = workspace?.programs || [];
  return programs.map((program) => {
    const invited = Number(program?.funnel?.invited || 0);
    const attended = Number(program?.funnel?.attended || 0);
    const completed = Number(program?.funnel?.completed || 0);
    const conversionRate = invited > 0 ? Math.round((completed / invited) * 100) : 0;
    return {
      ...program,
      invited,
      attended,
      completed,
      conversionRate
    };
  });
};

export const buildManagerDashboard = (workspace, now = new Date()) => {
  const portfolio = buildWorkspacePortfolio(workspace, now);
  const programs = buildProgramMetrics(workspace);
  const pteSummary = {
    high: portfolio.rows.filter((row) => row.pteBand === 'High').length,
    medium: portfolio.rows.filter((row) => row.pteBand === 'Medium').length,
    low: portfolio.rows.filter((row) => row.pteBand === 'Low').length
  };
  const ptcSummary = {
    high: portfolio.rows.filter((row) => row.ptcBand === 'High').length,
    medium: portfolio.rows.filter((row) => row.ptcBand === 'Medium').length,
    low: portfolio.rows.filter((row) => row.ptcBand === 'Low').length
  };
  const propensityQuadrants = {
    expandAndRetain: portfolio.rows.filter((row) => row.pteBand === 'High' && row.ptcBand === 'Low').length,
    growWithRisk: portfolio.rows.filter((row) => row.pteBand === 'High' && row.ptcBand !== 'Low').length,
    stabilizeThenExpand: portfolio.rows.filter((row) => row.pteBand !== 'High' && row.ptcBand === 'High').length,
    monitor: portfolio.rows.filter((row) => row.pteBand !== 'High' && row.ptcBand !== 'High').length
  };
  const members = workspace?.team?.cseMembers || [];
  const workload = members.map((member) => ({
    ...member,
    customerCount: (member.accounts || []).length,
    atRiskCount: portfolio.rows.filter(
      (row) => (member.accounts || []).includes(row.customer.id) && String(row.health).toLowerCase() !== 'green'
    ).length
  }));
  const programFunnel = programs.reduce(
    (acc, program) => {
      acc.invited += program.invited;
      acc.attended += program.attended;
      acc.completed += program.completed;
      return acc;
    },
    { invited: 0, attended: 0, completed: 0 }
  );
  const snapshots = workspace?.snapshots || [];
  return {
    portfolio,
    pteSummary,
    ptcSummary,
    propensityQuadrants,
    workload,
    programs,
    programFunnel,
    snapshots,
    topActions: portfolio.atRisk.map((item) => ({
      customerId: item.customer.id,
      customerName: item.customer.name,
      action: item.riskSignals[0]?.code
        ? `Address ${item.riskSignals[0].code} and confirm owner/date`
        : 'Review adoption and engagement plan',
      due: item.customer.renewalDate || now.toISOString().slice(0, 10)
    }))
  };
};

export const createMonthlySnapshot = (workspace, now = new Date()) => {
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const dashboard = buildManagerDashboard(workspace, now);
  const entry = {
    month,
    adoptionAvg: dashboard.portfolio.adoptionCoverage.avgAdoption,
    healthDistribution: dashboard.portfolio.healthDistribution,
    engagementCoverage: dashboard.portfolio.rows.length
      ? Math.round((dashboard.portfolio.engagementCoverage.in30 / dashboard.portfolio.rows.length) * 100)
      : 0
  };
  const snapshots = (workspace?.snapshots || []).filter((item) => item.month !== month);
  snapshots.push(entry);
  snapshots.sort((left, right) => String(left.month).localeCompare(String(right.month)));
  return snapshots;
};
