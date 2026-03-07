import { pageHeader } from '../components/pageHeader.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip } from '../components/statusChip.js';
import { barChartSvg, donutChartSvg, lineChartSvg } from '../lib/charts.js';
import { toIsoDate } from '../lib/date.js';
import { triggerDownload } from '../lib/exports.js';
import { computePtCProxy, computePtEProxy } from '../lib/scoring.js';

const safePercent = (value, total) => {
  const numerator = Number(value || 0);
  const denominator = Math.max(1, Number(total || 0));
  return Math.round((numerator / denominator) * 100);
};

const severityRank = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return 3;
  if (normalized === 'medium') return 2;
  return 1;
};

const severityTone = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return 'risk';
  if (normalized === 'medium') return 'warn';
  return 'neutral';
};

const normalizeSeverity = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'medium') return 'Medium';
  return 'Low';
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const buildSignalWatchlist = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => {
    (row.riskSignals || []).forEach((signal) => {
      const code = normalizeCode(signal.code || 'UNSPECIFIED_SIGNAL');
      const existing = map.get(code) || {
        code,
        count: 0,
        severity: 'Low',
        detail: ''
      };
      existing.count += 1;
      if (severityRank(signal.severity) > severityRank(existing.severity)) {
        existing.severity = normalizeSeverity(signal.severity);
      }
      if (!existing.detail && signal.detail) {
        existing.detail = String(signal.detail);
      }
      map.set(code, existing);
    });
  });

  return [...map.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return severityRank(right.severity) - severityRank(left.severity);
  });
};

const totalHealthCount = (distribution = {}) =>
  Number(distribution.green || 0) + Number(distribution.yellow || 0) + Number(distribution.red || 0);

const buildSnapshotTrend = (snapshots = []) => {
  const items = Array.isArray(snapshots) ? snapshots : [];
  return items.map((snapshot) => {
    const health = snapshot.healthDistribution || {};
    const total = Math.max(1, totalHealthCount(health));
    const redRate = Number(health.red || 0) / total;
    const adoption = Number(snapshot.adoptionAvg || 0);
    const engagement = Number(snapshot.engagementCoverage || 0);

    return {
      month: snapshot.month || '',
      readiness: Math.round(adoption * 0.62 + engagement * 0.38),
      riskPressure: Math.round(redRate * 100 * 0.58 + (100 - engagement) * 0.42)
    };
  });
};

const formatSigned = (value, decimals = 1) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0';
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(decimals)}`;
};

const round1 = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 10) / 10;
};

const computeReadinessProxy = (adoptionAvg, engagementCoveragePct) => round1(Number(adoptionAvg || 0) * 0.62 + Number(engagementCoveragePct || 0) * 0.38);

const computeRiskPressureProxy = (redHealthRatePct, engagementCoveragePct) =>
  round1(Number(redHealthRatePct || 0) * 0.58 + (100 - Number(engagementCoveragePct || 0)) * 0.42);

const renewalPressureScorePreview = (renewalDays) => {
  const days = Number(renewalDays);
  if (!Number.isFinite(days)) return 20;
  if (days <= 30) return 100;
  if (days <= 60) return 80;
  if (days <= 90) return 60;
  if (days <= 180) return 35;
  return 15;
};

const calculateFormulaSandbox = (input = {}) => {
  const toNum = (value, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  const clampPct = (value) => Math.max(0, Math.min(100, toNum(value, 0)));
  const adoptionScore = clampPct(input.adoptionScore);
  const engagementScore = clampPct(input.engagementScore);
  const riskScore = clampPct(input.riskScore);
  const cicdPercent = clampPct(input.cicdPercent);
  const securityPercent = clampPct(input.securityPercent);
  const stageCoveragePercent = clampPct(input.stageCoveragePercent);
  const openExpansionCount = Math.max(0, toNum(input.openExpansionCount, 0));
  const renewalDays = toNum(input.renewalDays, 999);
  const renewalPressure = renewalPressureScorePreview(renewalDays);
  const renewalSoonSignal = Boolean(input.renewalSoonSignal);
  const staleEngagement90 = Boolean(input.staleEngagement90);
  const secureBelow30 = Boolean(input.secureBelow30);
  const strongMomentum = Boolean(input.strongMomentum);

  const pteBase = round1(
    adoptionScore * 0.32 +
      engagementScore * 0.23 +
      (100 - riskScore) * 0.15 +
      cicdPercent * 0.13 +
      securityPercent * 0.08 +
      stageCoveragePercent * 0.09
  );

  const pteAdjustment = round1(
    (renewalDays <= 120 ? 8 : 0) +
      (renewalDays > 120 && renewalDays <= 180 ? 4 : 0) +
      (renewalDays > 365 ? -4 : 0) +
      Math.min(8, openExpansionCount * 2) +
      (engagementScore < 45 ? -10 : 0) +
      (riskScore >= 70 ? -12 : 0)
  );
  const pteFinal = round1(Math.max(0, Math.min(100, pteBase + pteAdjustment)));
  const pteBand = pteFinal >= 70 ? 'High' : pteFinal >= 45 ? 'Medium' : 'Low';

  const ptcBase = round1(riskScore * 0.42 + (100 - adoptionScore) * 0.24 + (100 - engagementScore) * 0.17 + renewalPressure * 0.17);
  const ptcAdjustment = round1(
    (renewalSoonSignal ? 8 : 0) + (staleEngagement90 ? 10 : 0) + (secureBelow30 ? 5 : 0) + (strongMomentum ? -12 : 0)
  );
  const ptcFinal = round1(Math.max(0, Math.min(100, ptcBase + ptcAdjustment)));
  const ptcBand = ptcFinal >= 70 ? 'High' : ptcFinal >= 45 ? 'Medium' : 'Low';

  return {
    inputs: {
      adoptionScore,
      engagementScore,
      riskScore,
      cicdPercent,
      securityPercent,
      stageCoveragePercent,
      openExpansionCount,
      renewalDays,
      renewalPressure,
      renewalSoonSignal,
      staleEngagement90,
      secureBelow30,
      strongMomentum
    },
    pte: { base: pteBase, adjustment: pteAdjustment, final: pteFinal, band: pteBand },
    ptc: { base: ptcBase, adjustment: ptcAdjustment, final: ptcFinal, band: ptcBand }
  };
};

const calculateFormulaSensitivity = (input = {}) => {
  const baselineInput = { ...input };
  const baseline = calculateFormulaSandbox(baselineInput);
  const clampPct = (value, delta = 0) => Math.max(0, Math.min(100, Number(value || 0) + delta));

  const probes = [
    {
      id: 'adoption',
      label: 'Adoption score',
      step: '+10 points',
      why: 'Higher adoption adds PtE weight (0.32) and shrinks PtC adoption gap (0.24).',
      apply: (draft) => ({ ...draft, adoptionScore: clampPct(draft.adoptionScore, 10) })
    },
    {
      id: 'engagement',
      label: 'Engagement score',
      step: '+10 points',
      why: 'Higher engagement adds PtE weight (0.23) and reduces PtC engagement gap (0.17).',
      apply: (draft) => ({ ...draft, engagementScore: clampPct(draft.engagementScore, 10) })
    },
    {
      id: 'risk',
      label: 'Risk score',
      step: '+10 points',
      why: 'Higher risk reduces PtE stability term and increases PtC risk weight (0.42).',
      apply: (draft) => ({ ...draft, riskScore: clampPct(draft.riskScore, 10) })
    },
    {
      id: 'cicd',
      label: 'CI/CD adoption %',
      step: '+10 points',
      why: 'CI/CD adoption contributes directly to PtE via weight 0.13.',
      apply: (draft) => ({ ...draft, cicdPercent: clampPct(draft.cicdPercent, 10) })
    },
    {
      id: 'security',
      label: 'Security adoption %',
      step: '+10 points',
      why: 'Security adoption raises PtE and can reduce low-security penalty exposure.',
      apply: (draft) => ({ ...draft, securityPercent: clampPct(draft.securityPercent, 10) })
    },
    {
      id: 'stageCoverage',
      label: 'Stage coverage %',
      step: '+10 points',
      why: 'Stage coverage adds PtE weight (0.09) as platform depth indicator.',
      apply: (draft) => ({ ...draft, stageCoveragePercent: clampPct(draft.stageCoveragePercent, 10) })
    },
    {
      id: 'renewalDays',
      label: 'Renewal days',
      step: '-30 days',
      why: 'Nearer renewal increases renewal pressure and raises PtC urgency terms.',
      apply: (draft) => ({ ...draft, renewalDays: Math.max(0, Number(draft.renewalDays || 0) - 30) })
    },
    {
      id: 'expansionCount',
      label: 'Open expansion count',
      step: '+1',
      why: 'More validated expansion signals add PtE context uplift (up to +8).',
      apply: (draft) => ({ ...draft, openExpansionCount: Math.max(0, Number(draft.openExpansionCount || 0) + 1) })
    }
  ];

  return probes
    .map((probe) => {
      const next = calculateFormulaSandbox(probe.apply({ ...baselineInput }));
      return {
        ...probe,
        pteDelta: round1(next.pte.final - baseline.pte.final),
        ptcDelta: round1(next.ptc.final - baseline.ptc.final)
      };
    })
    .sort((left, right) => Math.abs(right.pteDelta) + Math.abs(right.ptcDelta) - (Math.abs(left.pteDelta) + Math.abs(left.ptcDelta)));
};

const applyFormulaSandboxActionState = (current = {}, actionId) => {
  const clampPct = (value) => Math.max(0, Math.min(100, Number(value || 0)));
  const next = { ...current };

  if (actionId === 'recover-engagement') {
    next.engagementScore = clampPct(next.engagementScore + 12);
    next.staleEngagement90 = false;
  } else if (actionId === 'secure-rollout') {
    next.securityPercent = clampPct(next.securityPercent + 20);
    next.riskScore = clampPct(next.riskScore - 8);
  } else if (actionId === 'reduce-risk') {
    next.riskScore = clampPct(next.riskScore - 15);
    next.engagementScore = clampPct(next.engagementScore + 4);
  } else if (actionId === 'renewal-escalation') {
    next.renewalDays = Math.max(0, Number(next.renewalDays || 0) - 60);
    next.renewalSoonSignal = true;
  } else if (actionId === 'expansion-proof') {
    next.adoptionScore = clampPct(next.adoptionScore + 10);
    next.engagementScore = clampPct(next.engagementScore + 8);
    next.openExpansionCount = Math.max(0, Number(next.openExpansionCount || 0) + 2);
    next.riskScore = clampPct(next.riskScore - 5);
  }

  next.secureBelow30 = Number(next.securityPercent || 0) < 30;
  next.renewalSoonSignal = Boolean(next.renewalSoonSignal) || Number(next.renewalDays || 0) <= 90;
  next.strongMomentum = Number(next.adoptionScore || 0) >= 70 && Number(next.engagementScore || 0) >= 70 && Number(next.riskScore || 0) <= 35;
  if (Number(next.engagementScore || 0) >= 50) next.staleEngagement90 = false;

  return next;
};

const calculateFormulaPlanProjection = (input = {}, actions = [], cycles = 1) => {
  const selectedActions = [...(actions || [])].filter(Boolean);
  const cycleCount = Math.max(1, Math.min(6, Number(cycles || 1)));
  const baselineScenario = calculateFormulaSandbox(input);
  const history = [
    {
      step: 'Baseline',
      cycle: 0,
      scenario: baselineScenario
    }
  ];
  let state = { ...input };

  for (let cycleIndex = 1; cycleIndex <= cycleCount; cycleIndex += 1) {
    selectedActions.forEach((actionId) => {
      state = applyFormulaSandboxActionState(state, actionId);
    });
    history.push({
      step: `Cycle ${cycleIndex}`,
      cycle: cycleIndex,
      scenario: calculateFormulaSandbox(state)
    });
  }

  const projected = history[history.length - 1]?.scenario || baselineScenario;
  return {
    baseline: baselineScenario,
    projected,
    history,
    actions: selectedActions,
    cycles: cycleCount
  };
};

const deriveFormulaRuleStates = (inputs = {}) => {
  const renewalDays = Number(inputs.renewalDays ?? 999);
  const openExpansionCount = Math.max(0, Number(inputs.openExpansionCount || 0));
  const engagementScore = Number(inputs.engagementScore || 0);
  const riskScore = Number(inputs.riskScore || 0);
  const secureBelow30 = Boolean(inputs.secureBelow30);
  const staleEngagement90 = Boolean(inputs.staleEngagement90);
  const renewalSoonSignal = Boolean(inputs.renewalSoonSignal);
  const strongMomentum = Boolean(inputs.strongMomentum);
  const expansionPoints = Math.min(8, openExpansionCount * 2);

  return [
    {
      id: 'pte-renewal-120',
      metric: 'PtE',
      label: 'Renewal <= 120 days',
      points: 8,
      active: renewalDays <= 120,
      why: 'Near-term renewal window increases expansion urgency and value narrative focus.'
    },
    {
      id: 'pte-renewal-180',
      metric: 'PtE',
      label: 'Renewal 121-180 days',
      points: 4,
      active: renewalDays > 120 && renewalDays <= 180,
      why: 'Mid-term renewal horizon supports light uplift in expansion timing.'
    },
    {
      id: 'pte-renewal-long',
      metric: 'PtE',
      label: 'Renewal > 365 days',
      points: -4,
      active: renewalDays > 365,
      why: 'Long renewal horizon reduces urgency for near-term expansion motion.'
    },
    {
      id: 'pte-expansion-count',
      metric: 'PtE',
      label: 'Open expansion count bonus',
      points: expansionPoints,
      active: expansionPoints > 0,
      why: 'Validated expansion opportunities add confidence to expansion propensity.'
    },
    {
      id: 'pte-low-engagement',
      metric: 'PtE',
      label: 'Engagement score < 45',
      points: -10,
      active: engagementScore < 45,
      why: 'Low engagement weakens confidence that expansion motions will land.'
    },
    {
      id: 'pte-high-risk',
      metric: 'PtE',
      label: 'Risk score >= 70',
      points: -12,
      active: riskScore >= 70,
      why: 'High risk burden suppresses expansion readiness until stabilization work is done.'
    },
    {
      id: 'ptc-renewal-signal',
      metric: 'PtC',
      label: 'Renewal signal active',
      points: 8,
      active: renewalSoonSignal,
      why: 'Renewal signals amplify retention pressure and short-term churn exposure.'
    },
    {
      id: 'ptc-stale-touch',
      metric: 'PtC',
      label: 'No-touch > 90 days',
      points: 10,
      active: staleEngagement90,
      why: 'Stale engagement increases uncertainty and retention volatility.'
    },
    {
      id: 'ptc-low-security',
      metric: 'PtC',
      label: 'Security adoption < 30%',
      points: 5,
      active: secureBelow30,
      why: 'Low security adoption frequently correlates with lower platform stickiness.'
    },
    {
      id: 'ptc-strong-momentum',
      metric: 'PtC',
      label: 'Strong momentum',
      points: -12,
      active: strongMomentum,
      why: 'Strong adoption + engagement with controlled risk reduces churn pressure.'
    }
  ];
};

const evaluateProjectionForGoal = (projection, goal = 'balanced') => {
  const baselinePte = Number(projection?.baseline?.pte?.final || 0);
  const baselinePtc = Number(projection?.baseline?.ptc?.final || 0);
  const projectedPte = Number(projection?.projected?.pte?.final || 0);
  const projectedPtc = Number(projection?.projected?.ptc?.final || 0);
  const pteDelta = round1(projectedPte - baselinePte);
  const ptcDelta = round1(projectedPtc - baselinePtc);

  let score = 0;
  let rationale = 'Balances expansion readiness with retention pressure reduction.';

  if (goal === 'retention') {
    score = (100 - projectedPtc) * 0.7 + projectedPte * 0.1 + Math.max(0, -ptcDelta) * 1.5 + Math.max(0, pteDelta) * 0.4;
    rationale = 'Prioritizes lower projected PtC and stronger PtC downtrend.';
  } else if (goal === 'expansion') {
    score = projectedPte * 0.6 + (100 - projectedPtc) * 0.2 + Math.max(0, pteDelta) * 1.1 + Math.max(0, -ptcDelta) * 0.4;
    rationale = 'Prioritizes higher projected PtE while avoiding retention pressure spikes.';
  } else {
    score = projectedPte * 0.45 + (100 - projectedPtc) * 0.45 + Math.max(0, pteDelta) * 0.8 + Math.max(0, -ptcDelta) * 0.8;
  }

  return {
    score: round1(score),
    pteDelta,
    ptcDelta,
    rationale
  };
};

const recommendProjectionPresets = (input = {}, presets = [], goal = 'balanced') =>
  [...(presets || [])]
    .map((preset) => {
      const projection = calculateFormulaPlanProjection(input, preset.actions, preset.cycles);
      const evaluation = evaluateProjectionForGoal(projection, goal);
      return {
        ...preset,
        projection,
        ...evaluation
      };
    })
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0));

const deriveBandTargetGuidance = (scenario, sensitivity) => {
  const pteFinal = Number(scenario?.pte?.final || 0);
  const ptcFinal = Number(scenario?.ptc?.final || 0);
  const pteBand = String(scenario?.pte?.band || 'Low');
  const ptcBand = String(scenario?.ptc?.band || 'Low');

  const pteTarget = pteBand === 'High' ? pteFinal : 70;
  const pteGap = Math.max(0, round1(pteTarget - pteFinal));
  const pteLevers = [...(sensitivity || [])].filter((item) => Number(item.pteDelta || 0) > 0).sort((a, b) => Number(b.pteDelta || 0) - Number(a.pteDelta || 0));

  const ptcTarget = ptcBand === 'High' ? 69 : ptcBand === 'Medium' ? 44 : ptcFinal;
  const ptcGap = Math.max(0, round1(ptcFinal - ptcTarget));
  const ptcLevers = [...(sensitivity || [])].filter((item) => Number(item.ptcDelta || 0) < 0).sort((a, b) => Number(a.ptcDelta || 0) - Number(b.ptcDelta || 0));

  const bestPteLever = pteLevers[0] || null;
  const bestPtcLever = ptcLevers[0] || null;

  const pteRepeats = bestPteLever ? Math.max(1, Math.ceil(pteGap / Math.max(0.1, Number(bestPteLever.pteDelta || 0)))) : 0;
  const ptcRepeats = bestPtcLever ? Math.max(1, Math.ceil(ptcGap / Math.max(0.1, Math.abs(Number(bestPtcLever.ptcDelta || 0))))) : 0;

  return {
    pte: {
      band: pteBand,
      target: pteTarget,
      gap: pteGap,
      bestLever: bestPteLever,
      repeats: pteRepeats
    },
    ptc: {
      band: ptcBand,
      target: ptcTarget,
      gap: ptcGap,
      bestLever: bestPtcLever,
      repeats: ptcRepeats
    }
  };
};

const deriveHealthDistribution = (rows = []) =>
  rows.reduce(
    (acc, row) => {
      const key = String(row.health || '').toLowerCase();
      if (key === 'green') acc.green += 1;
      else if (key === 'red') acc.red += 1;
      else acc.yellow += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 }
  );

const PLAYBOOK_CHECKLIST_KEY = 'gh_propensity_playbook_readiness_v1';
const PLAY_EFFECTIVENESS_KEY = 'gh_propensity_play_effectiveness_v1';

const defaultChecklist = () => ({
  playName: '',
  owner: '',
  dueDate: '',
  successMetric: '',
  nextTouchDate: ''
});

const loadChecklist = () => {
  try {
    const raw = window.localStorage.getItem(PLAYBOOK_CHECKLIST_KEY);
    if (!raw) return defaultChecklist();
    const parsed = JSON.parse(raw);
    return {
      playName: String(parsed?.playName || ''),
      owner: String(parsed?.owner || ''),
      dueDate: String(parsed?.dueDate || ''),
      successMetric: String(parsed?.successMetric || ''),
      nextTouchDate: String(parsed?.nextTouchDate || '')
    };
  } catch {
    return defaultChecklist();
  }
};

const saveChecklist = (value) => {
  try {
    window.localStorage.setItem(PLAYBOOK_CHECKLIST_KEY, JSON.stringify(value || defaultChecklist()));
  } catch {
    // Ignore storage quota/access errors in static mode.
  }
};

const loadPlayEffectivenessLog = () => {
  try {
    const raw = window.localStorage.getItem(PLAY_EFFECTIVENESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePlayEffectivenessLog = (entries = []) => {
  try {
    window.localStorage.setItem(PLAY_EFFECTIVENESS_KEY, JSON.stringify(entries.slice(-500)));
  } catch {
    // Ignore storage quota/access errors in static mode.
  }
};

const appendPlayEffectivenessLog = (entry) => {
  const existing = loadPlayEffectivenessLog();
  const next = [...existing, entry];
  savePlayEffectivenessLog(next);
  return next;
};

const toneFromConfidence = (score) => {
  const numeric = Number(score || 0);
  if (numeric >= 85) return 'good';
  if (numeric >= 65) return 'warn';
  return 'risk';
};

const buildConfidenceForRow = (workspace, row) => {
  const customerId = row?.customer?.id || '';
  const adoption = workspace?.adoption?.[customerId] || {};
  const engagements = workspace?.engagements?.[customerId] || [];
  const riskPlaybook = workspace?.risk?.[customerId]?.playbook || [];
  const useCases = adoption?.useCases || {};
  const timeToValue = adoption?.timeToValue || [];
  const evidenceEntries = Object.values(useCases || {});
  const evidenceCoverage = evidenceEntries.length
    ? evidenceEntries.filter((entry) => String(entry?.evidence || '').trim().length > 0).length / evidenceEntries.length
    : 0;

  const checks = [
    { key: 'renewal', label: 'Renewal date configured', ok: Boolean(String(row?.customer?.renewalDate || '').trim()) },
    { key: 'engagement', label: 'Engagement history logged', ok: engagements.length > 0 || Boolean(String(row?.lastEngagementDate || '').trim()) },
    {
      key: 'milestones',
      label: 'Time-to-value milestones captured',
      ok: (timeToValue || []).some((item) => String(item?.milestone || '').trim() && String(item?.date || '').trim())
    },
    { key: 'evidence', label: 'Use-case evidence coverage >= 50%', ok: evidenceCoverage >= 0.5 },
    {
      key: 'riskAction',
      label: 'Risk mitigation action owner + due date set',
      ok: (riskPlaybook || []).some((item) => String(item?.owner || '').trim() && String(item?.due || '').trim())
    }
  ];

  const completeCount = checks.filter((item) => item.ok).length;
  const score = Math.round((completeCount / checks.length) * 100);
  const missing = checks.filter((item) => !item.ok).map((item) => item.label);

  return {
    score,
    tone: toneFromConfidence(score),
    checks,
    missing,
    completeCount,
    evidenceCoveragePct: Math.round(evidenceCoverage * 100)
  };
};

const drillRows = (rows, confidenceMap, token) => {
  const [kindRaw, valueRaw] = String(token || '').split(':');
  const kind = String(kindRaw || '').toLowerCase();
  const value = String(valueRaw || '');
  let filtered = [...(rows || [])];
  let title = 'Drill-through results';
  let description = 'Filtered account list from chart selection.';

  if (kind === 'pte') {
    filtered = filtered.filter((row) => String(row.pteBand || '') === value);
    title = `PtE ${value} accounts`;
    description = `Accounts currently in PtE ${value}.`;
  }

  if (kind === 'ptc') {
    filtered = filtered.filter((row) => String(row.ptcBand || '') === value);
    title = `PtC ${value} accounts`;
    description = `Accounts currently in PtC ${value}.`;
  }

  if (kind === 'quadrant') {
    if (value === 'expandAndRetain') filtered = filtered.filter((row) => row.pteBand === 'High' && row.ptcBand === 'Low');
    if (value === 'growWithRisk') filtered = filtered.filter((row) => row.pteBand === 'High' && row.ptcBand !== 'Low');
    if (value === 'stabilizeThenExpand') filtered = filtered.filter((row) => row.pteBand !== 'High' && row.ptcBand === 'High');
    if (value === 'monitor') filtered = filtered.filter((row) => row.pteBand !== 'High' && row.ptcBand !== 'High');
    title = `Quadrant: ${value}`;
    description = 'Accounts in the selected PtE/PtC execution quadrant.';
  }

  if (kind === 'trigger') {
    const code = normalizeCode(value);
    filtered = filtered.filter((row) => (row.riskSignals || []).some((signal) => normalizeCode(signal.code) === code));
    title = `Trigger: ${code}`;
    description = 'Accounts with the selected active trigger.';
  }

  if (kind === 'readiness' && value === 'high') {
    filtered = filtered.filter((row) => Number(row.pteScore || 0) >= 70).sort((a, b) => Number(b.pteScore || 0) - Number(a.pteScore || 0));
    title = 'Highest readiness accounts';
    description = 'Sorted by PtE proxy descending.';
  }

  if (kind === 'readiness' && value === 'low') {
    filtered = filtered.filter((row) => Number(row.pteScore || 0) < 45).sort((a, b) => Number(a.pteScore || 0) - Number(b.pteScore || 0));
    title = 'Lowest readiness accounts';
    description = 'Sorted by PtE proxy ascending.';
  }

  if (kind === 'riskpressure' && value === 'high') {
    filtered = filtered.filter((row) => Number(row.ptcScore || 0) >= 70).sort((a, b) => Number(b.ptcScore || 0) - Number(a.ptcScore || 0));
    title = 'Highest risk pressure accounts';
    description = 'Sorted by PtC proxy descending.';
  }

  if (kind === 'riskpressure' && value === 'low') {
    filtered = filtered.filter((row) => Number(row.ptcScore || 0) < 45).sort((a, b) => Number(a.ptcScore || 0) - Number(b.ptcScore || 0));
    title = 'Lowest risk pressure accounts';
    description = 'Sorted by PtC proxy ascending.';
  }

  if (kind === 'confidence' && value === 'low') {
    filtered = filtered
      .filter((row) => Number(confidenceMap.get(row.customer.id)?.score || 0) < 65)
      .sort((a, b) => Number(confidenceMap.get(a.customer.id)?.score || 0) - Number(confidenceMap.get(b.customer.id)?.score || 0));
    title = 'Low-confidence accounts';
    description = 'Accounts where data quality confidence is below 65.';
  }

  if (kind === 'cell') {
    const [pteBand, ptcBand] = String(value || '').split(',');
    const validPte = ['High', 'Medium', 'Low'].includes(String(pteBand || '')) ? String(pteBand) : '';
    const validPtc = ['High', 'Medium', 'Low'].includes(String(ptcBand || '')) ? String(ptcBand) : '';
    filtered = filtered.filter((row) => String(row.pteBand || '') === validPte && String(row.ptcBand || '') === validPtc);
    title = `Matrix cell: PtE ${validPte} / PtC ${validPtc}`;
    description = 'Accounts mapped to the selected PtE x PtC matrix cell.';
  }

  return {
    title,
    description,
    rows: filtered.slice(0, 30)
  };
};

const recommendPlays = ({ triggerCode, pteBand, ptcBand, renewalDays, confidenceScore }) => {
  const trigger = normalizeCode(triggerCode || '');
  const pte = String(pteBand || 'Low');
  const ptc = String(ptcBand || 'Low');
  const renewal = Number.isFinite(Number(renewalDays)) ? Number(renewalDays) : 999;
  const confidence = Number.isFinite(Number(confidenceScore)) ? Number(confidenceScore) : 0;

  let primary = {
    title: 'Adoption foundation sprint',
    why: 'Default motion when confidence is limited or adoption depth is low.',
    firstStep: 'Define one 14-day use-case uplift plan with owner and dated milestones.'
  };
  let secondary = {
    title: 'Cadence stabilization',
    why: 'Maintain engagement rhythm while validating trigger signal quality.',
    firstStep: 'Schedule next customer touch and document expected outcome.'
  };
  let window = '14-30 days';
  let successMetric = 'PtE moves one band up OR PtC moves one band down by next cycle.';
  let reviewCadence = 'Weekly';

  if (ptc === 'High' || renewal <= 90 || trigger === 'RENEWAL_SOON') {
    primary = {
      title: 'Retention stabilization sprint',
      why: 'High churn pressure requires immediate risk mitigation before growth actions.',
      firstStep: 'Create top-3 risk burndown plan with owner, due date, and executive checkpoint.'
    };
    secondary = {
      title: 'Engagement recovery sequence',
      why: 'Risk plans fail without active customer touch cadence.',
      firstStep: 'Book office hours/workshop series for next two weeks.'
    };
    window = '0-14 days';
    successMetric = 'PtC High -> Medium and at least one high-severity trigger closed.';
    reviewCadence = 'Twice weekly';
  } else if (pte === 'High' && ptc === 'Low') {
    primary = {
      title: 'Expansion proposal sprint',
      why: 'High readiness with low pressure is the strongest expansion window.',
      firstStep: 'Package executive value narrative linked to measurable outcomes.'
    };
    secondary = {
      title: 'Commercial alignment checkpoint',
      why: 'Synchronize technical evidence with account team timing.',
      firstStep: 'Run expansion prep review with CSM/AE this cycle.'
    };
    window = '7-21 days';
    successMetric = 'Expansion plan accepted with sponsor, scope, and target close date.';
    reviewCadence = 'Weekly';
  } else if (trigger === 'LOW_SECURITY_ADOPTION' || trigger === 'STAGE_GAP_SECURE') {
    primary = {
      title: 'Secure baseline rollout',
      why: 'Security adoption gaps increase retention pressure and limit platform value.',
      firstStep: 'Enable baseline secure scans on one priority team and publish results.'
    };
    secondary = {
      title: 'Evidence-to-outcome mapping',
      why: 'Secure improvements need business framing to influence renewal confidence.',
      firstStep: 'Map scan adoption to risk-reduction narrative for QBR.'
    };
    window = '14-30 days';
    successMetric = 'Security use-case adoption +15 points and trigger count reduced.';
    reviewCadence = 'Weekly';
  } else if (pte === 'Medium' && ptc === 'Medium') {
    primary = {
      title: 'Targeted uplift plan',
      why: 'Balanced but fragile posture benefits from focused use-case improvement.',
      firstStep: 'Select weakest use case and run 2-week uplift milestones.'
    };
    secondary = {
      title: 'Proof-point capture',
      why: 'Need measurable wins to move into expansion-ready state.',
      firstStep: 'Capture two customer-validated outcomes for executive recap.'
    };
    window = '14-30 days';
    successMetric = 'PtE Medium -> High while PtC stays Medium or lower.';
    reviewCadence = 'Weekly';
  }

  const confidenceNote =
    confidence < 65
      ? 'Data confidence is low. Validate missing fields before committing full-motion plays.'
      : 'Data confidence is acceptable for execution decisions.';

  return { primary, secondary, window, successMetric, reviewCadence, confidenceNote };
};

const quadrantLabelForRow = (row) => {
  if (row?.pteBand === 'High' && row?.ptcBand === 'Low') return 'Expand + Retain';
  if (row?.pteBand === 'High' && row?.ptcBand !== 'Low') return 'Grow with Risk';
  if (row?.pteBand !== 'High' && row?.ptcBand === 'High') return 'Stabilize then Expand';
  return 'Monitor';
};

const primarySignalForRow = (row) =>
  [...(row?.riskSignals || [])]
    .sort((left, right) => severityRank(right?.severity) - severityRank(left?.severity))
    .find(Boolean) || null;

const buildWeeklyActionQueue = (rows, confidenceMap) =>
  [...(rows || [])]
    .map((row) => {
      const confidence = confidenceMap.get(row.customer.id) || { score: 70 };
      const primarySignal = primarySignalForRow(row);
      const renewalDays = Number(row.renewalDays ?? 999);

      let priorityScore = 0;
      if (row.ptcBand === 'High') priorityScore += 60;
      else if (row.ptcBand === 'Medium') priorityScore += 35;
      else priorityScore += 15;

      if (renewalDays <= 60) priorityScore += 22;
      else if (renewalDays <= 90) priorityScore += 14;

      if (row.pteBand === 'High' && row.ptcBand === 'Low') priorityScore += 12;
      if (row.pteBand === 'Low') priorityScore += 10;

      if (primarySignal) {
        if (severityRank(primarySignal.severity) === 3) priorityScore += 16;
        else if (severityRank(primarySignal.severity) === 2) priorityScore += 10;
        else priorityScore += 4;
      }

      if (Number(confidence.score || 0) < 65) priorityScore += 8;

      const recommendation = recommendPlays({
        triggerCode: primarySignal?.code || '',
        pteBand: row.pteBand,
        ptcBand: row.ptcBand,
        renewalDays,
        confidenceScore: confidence.score
      });

      const reasons = [];
      if (row.ptcBand === 'High') reasons.push('PtC High');
      if (renewalDays <= 90) reasons.push(`Renewal ${renewalDays}d`);
      if (primarySignal?.code) reasons.push(primarySignal.code);
      if (Number(confidence.score || 0) < 65) reasons.push('Low confidence');
      if (!reasons.length) reasons.push('Routine monitoring');

      return {
        row,
        primarySignal,
        confidence,
        recommendation,
        renewalDays,
        priorityScore,
        reasons
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 12);

const parseDateValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isClosedAction = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  return ['done', 'closed', 'complete', 'completed'].includes(normalized);
};

const buildMitigationCoverage = (rows, workspace, confidenceMap, now = new Date()) => {
  const activeRows = [...(rows || [])].filter((row) => (row.riskSignals || []).length > 0);

  const tableRows = activeRows
    .map((row) => {
      const customerId = row.customer.id;
      const riskBlock = workspace?.risk?.[customerId] || {};
      const playbook = Array.isArray(riskBlock.playbook) ? riskBlock.playbook : [];
      const actions = playbook.map((item) => {
        const due = parseDateValue(item?.due);
        return {
          owner: String(item?.owner || '').trim(),
          due,
          dueRaw: String(item?.due || '').trim(),
          status: String(item?.status || '').trim()
        };
      });
      const datedActions = actions.filter((item) => item.owner && item.due);
      const overdueOpenActions = actions.filter((item) => item.due && item.due < now && !isClosedAction(item.status)).length;
      const nextDue = actions
        .filter((item) => item.due && !isClosedAction(item.status))
        .sort((left, right) => left.due - right.due)[0];
      const activeTriggerCount = (row.riskSignals || []).length;
      const coveragePct = activeTriggerCount ? Math.min(100, Math.round((datedActions.length / activeTriggerCount) * 100)) : 0;
      const confidence = confidenceMap.get(customerId) || { score: 70 };
      const recommendation = recommendPlays({
        triggerCode: primarySignalForRow(row)?.code || '',
        pteBand: row.pteBand,
        ptcBand: row.ptcBand,
        renewalDays: Number(row.renewalDays ?? 999),
        confidenceScore: confidence.score
      });
      return {
        row,
        activeTriggerCount,
        datedActionsCount: datedActions.length,
        hasDatedPlan: datedActions.length > 0,
        overdueOpenActions,
        nextDueRaw: nextDue?.dueRaw || '',
        coveragePct,
        recommendation
      };
    })
    .sort((left, right) => {
      if (Number(left.hasDatedPlan) !== Number(right.hasDatedPlan)) return Number(left.hasDatedPlan) - Number(right.hasDatedPlan);
      if (right.overdueOpenActions !== left.overdueOpenActions) return right.overdueOpenActions - left.overdueOpenActions;
      if (right.activeTriggerCount !== left.activeTriggerCount) return right.activeTriggerCount - left.activeTriggerCount;
      return Number(right.row?.ptcScore || 0) - Number(left.row?.ptcScore || 0);
    })
    .slice(0, 20);

  const activeTriggerAccounts = activeRows.length;
  const withDatedPlan = tableRows.filter((item) => item.hasDatedPlan).length;
  const missingOwnerOrDue = Math.max(0, activeTriggerAccounts - withDatedPlan);
  const overdueAccounts = tableRows.filter((item) => item.overdueOpenActions > 0).length;
  const coveragePct = activeTriggerAccounts ? Math.round((withDatedPlan / activeTriggerAccounts) * 100) : 100;

  return {
    activeTriggerAccounts,
    withDatedPlan,
    missingOwnerOrDue,
    overdueAccounts,
    coveragePct,
    tableRows
  };
};

const diffDaysFromIso = (value, now = new Date()) => {
  const date = parseDateValue(value);
  if (!date) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)));
};

const signalAgingDays = (row, signal, now = new Date()) => {
  const detectedAging = diffDaysFromIso(signal?.detectedAt, now);
  if (detectedAging !== null && detectedAging > 0) return detectedAging;
  const code = normalizeCode(signal?.code || '');
  if (code === 'LOW_ENGAGEMENT') return Number(row?.engagementDays ?? 0);
  if (code === 'RENEWAL_SOON') {
    const renewalDays = Number(row?.renewalDays ?? 999);
    if (!Number.isFinite(renewalDays)) return 0;
    return Math.max(0, 90 - renewalDays);
  }
  return detectedAging ?? 0;
};

const triggerSlaDays = (code) => {
  const normalized = normalizeCode(code || '');
  if (normalized === 'RENEWAL_SOON') return 2;
  if (normalized === 'LOW_ENGAGEMENT') return 3;
  if (normalized === 'NO_TIME_TO_VALUE') return 7;
  if (normalized === 'LOW_CICD_ADOPTION' || normalized === 'LOW_SECURITY_ADOPTION') return 14;
  if (normalized === 'STAGE_GAP_SECURE') return 30;
  if (normalized === 'HIGH_PTE_LOW_PTC') return 7;
  if (normalized === 'HIGH_PTE_HIGH_PTC') return 2;
  return 7;
};

const lifecycleStageFromActions = (actions = [], row, primarySignal, now = new Date()) => {
  if (!primarySignal) return 'Validated';
  const normalizedStatuses = actions.map((item) => String(item?.status || '').toLowerCase());
  const hasOwner = actions.some((item) => String(item?.owner || '').trim());
  const hasDated = actions.some((item) => String(item?.owner || '').trim() && parseDateValue(item?.due));
  const hasOpen = normalizedStatuses.some((status) => !isClosedAction(status));
  const allClosed = actions.length > 0 && normalizedStatuses.every((status) => isClosedAction(status));
  if (allClosed && Number(row?.ptcScore || 0) < 55) return 'Validated';
  if (hasDated && hasOpen) return 'Mitigating';
  if (hasOwner) return 'Assigned';
  const aging = signalAgingDays(row, primarySignal, now);
  if (aging === 0 && String(primarySignal?.source || '') === 'derived') return 'Detected';
  return 'Detected';
};

const buildTriggerLifecycle = (rows, workspace, now = new Date()) => {
  const lifecycleRows = [...(rows || [])]
    .filter((row) => (row.riskSignals || []).length > 0)
    .map((row) => {
      const customerId = row.customer.id;
      const riskBlock = workspace?.risk?.[customerId] || {};
      const actions = Array.isArray(riskBlock.playbook) ? riskBlock.playbook : [];
      const primarySignal = primarySignalForRow(row);
      const stage = lifecycleStageFromActions(actions, row, primarySignal, now);
      const ageDays = signalAgingDays(row, primarySignal, now);
      const slaDays = triggerSlaDays(primarySignal?.code);
      const breach = ['Detected', 'Assigned'].includes(stage) && ageDays > slaDays;
      return {
        row,
        primarySignal,
        stage,
        ageDays,
        slaDays,
        breach,
        openActions: actions.filter((item) => !isClosedAction(item?.status)).length,
        nextDue: actions
          .map((item) => String(item?.due || '').trim())
          .filter(Boolean)
          .sort((left, right) => String(left).localeCompare(String(right)))[0] || ''
      };
    })
    .sort((left, right) => {
      if (Number(right.breach) !== Number(left.breach)) return Number(right.breach) - Number(left.breach);
      return Number(right.ageDays || 0) - Number(left.ageDays || 0);
    });

  const stageCounts = lifecycleRows.reduce(
    (acc, item) => {
      const key = String(item.stage || 'Detected');
      if (!acc[key]) acc[key] = 0;
      acc[key] += 1;
      return acc;
    },
    { Detected: 0, Assigned: 0, Mitigating: 0, Validated: 0 }
  );

  return {
    rows: lifecycleRows,
    breaches: lifecycleRows.filter((item) => item.breach).length,
    stageCounts
  };
};

const buildAccountOwnerMap = (workspace) => {
  const map = new Map();
  (workspace?.team?.cseMembers || []).forEach((member) => {
    (member?.accounts || []).forEach((customerId) => {
      map.set(customerId, String(member?.name || 'Unassigned'));
    });
  });
  return map;
};

const buildCalibrationRows = (rows, ownerMap) => {
  const triggerCodes = new Set();
  (rows || []).forEach((row) => {
    (row.riskSignals || []).forEach((signal) => triggerCodes.add(normalizeCode(signal.code)));
  });
  ['HIGH_PTE_LOW_PTC', 'HIGH_PTE_HIGH_PTC'].forEach((code) => triggerCodes.add(code));

  return [...triggerCodes]
    .map((code) => {
      const impacted = (rows || []).filter((row) => {
        if (code === 'HIGH_PTE_LOW_PTC') return row.pteBand === 'High' && row.ptcBand === 'Low';
        if (code === 'HIGH_PTE_HIGH_PTC') return row.pteBand === 'High' && row.ptcBand === 'High';
        return (row.riskSignals || []).some((signal) => normalizeCode(signal.code) === code);
      });
      if (!impacted.length) return null;

      const suggestions = impacted.map((row) => {
        const rec = recommendPlays({
          triggerCode: code,
          pteBand: row.pteBand,
          ptcBand: row.ptcBand,
          renewalDays: Number(row.renewalDays ?? 999),
          confidenceScore: 75
        });
        return {
          owner: ownerMap.get(row.customer.id) || 'Unassigned',
          play: rec.primary.title
        };
      });

      const playCounts = new Map();
      suggestions.forEach((item) => {
        playCounts.set(item.play, Number(playCounts.get(item.play) || 0) + 1);
      });
      const dominant = [...playCounts.entries()].sort((left, right) => right[1] - left[1])[0] || ['No play', 0];
      const alignedCount = suggestions.filter((item) => item.play === dominant[0]).length;
      const alignmentPct = Math.round((alignedCount / Math.max(1, suggestions.length)) * 100);
      const uniqueOwners = new Set(suggestions.map((item) => item.owner)).size;
      const playVariance = playCounts.size;

      return {
        code,
        impactedCount: impacted.length,
        owners: uniqueOwners,
        dominantPlay: dominant[0],
        playVariance,
        alignmentPct,
        slaExpectation: triggerOpsMeta[code]?.sla || 'This cycle',
        tone: alignmentPct >= 80 ? 'good' : alignmentPct >= 60 ? 'warn' : 'risk'
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.alignmentPct !== right.alignmentPct) return left.alignmentPct - right.alignmentPct;
      return right.impactedCount - left.impactedCount;
    });
};

const buildQuarterPlan = ({ pteHigh, ptcHigh, readinessDelta, riskPressureDelta, mitigationSummary, lifecycleSummary, quadrants }) => {
  const day30 = [
    ptcHigh > 0
      ? `Stabilize ${ptcHigh} PtC High account(s) with dated mitigation plans and weekly checkpoints.`
      : 'Maintain zero PtC High backlog and monitor medium-risk drift.',
    mitigationSummary.missingOwnerOrDue > 0
      ? `Close owner/date gaps on ${mitigationSummary.missingOwnerOrDue} account(s).`
      : 'Owner/date coverage is complete for active trigger accounts.',
    lifecycleSummary.breaches > 0
      ? `Clear ${lifecycleSummary.breaches} SLA breach(es) in Detected/Assigned stage.`
      : 'No SLA breaches currently open.'
  ];

  const day60 = [
    `Move at least ${Math.max(1, Math.ceil(Number(quadrants.growWithRisk || 0) * 0.4))} Grow with Risk account(s) to lower PtC bands.`,
    readinessDelta < 0
      ? 'Run targeted adoption uplift on weakest use case clusters to reverse readiness decline.'
      : 'Sustain readiness gains with measurable proof-point cadence.',
    riskPressureDelta > 0
      ? 'Add manager review cadence for risk pressure trend reversal.'
      : 'Keep risk pressure below baseline with preventive play sequencing.'
  ];

  const day90 = [
    pteHigh > 0
      ? `Convert ${Math.max(1, Math.ceil(pteHigh * 0.35))} PtE High account(s) into expansion-ready proposals.`
      : 'Build PtE High pipeline through adoption depth campaigns.',
    `Reduce Stabilize then Expand quadrant volume (currently ${Number(quadrants.stabilizeThenExpand || 0)}).`,
    'Publish quarterly executive brief linking trigger movement to revenue/retention outcomes.'
  ];

  return { day30, day60, day90 };
};

const walkthroughTemplates = {
  default: [
    { window: 'Day 0-2', cse: 'Confirm trigger root cause and set owner + due date.', manager: 'Validate urgency and capacity allocation for execution.' },
    { window: 'Day 3-7', cse: 'Execute first mitigation play and log measurable checkpoint.', manager: 'Review early signal movement and remove blockers.' },
    { window: 'Day 8-14', cse: 'Adjust play based on observed movement and evidence quality.', manager: 'Coach narrative quality and enforce SLA adherence.' }
  ],
  RENEWAL_SOON: [
    { window: 'Day 0-2', cse: 'Publish renewal risk brief with top 3 blockers.', manager: 'Confirm executive sponsor engagement and weekly cadence.' },
    { window: 'Day 3-7', cse: 'Run mitigation workshop and capture dated actions.', manager: 'Escalate if no sponsor response or blocked ownership.' },
    { window: 'Day 8-14', cse: 'Validate PtC movement and update renewal narrative.', manager: 'Approve go/no-go on expansion asks in-cycle.' }
  ],
  LOW_ENGAGEMENT: [
    { window: 'Day 0-2', cse: 'Launch re-engagement outreach with explicit outcome asks.', manager: 'Check outreach quality and channel coverage.' },
    { window: 'Day 3-7', cse: 'Host office hours/webinar touchpoint and log next step.', manager: 'Reassign support if account remains unresponsive.' },
    { window: 'Day 8-14', cse: 'Convert engagement touch into adoption action plan.', manager: 'Review recovery trend and prevent relapse.' }
  ],
  STAGE_GAP_SECURE: [
    { window: 'Day 0-2', cse: 'Set Secure baseline objective and first implementation owner.', manager: 'Confirm sponsor for Secure maturity motion.' },
    { window: 'Day 3-7', cse: 'Run secure enablement sprint with one target team.', manager: 'Verify deliverables and remove resourcing blockers.' },
    { window: 'Day 8-14', cse: 'Capture evidence and tie secure progress to outcomes.', manager: 'Coach executive narrative for broader rollout.' }
  ]
};

const evidenceExamples = [
  {
    area: 'CI/CD adoption',
    weak: '“Teams are using pipelines more now.”',
    strong: '“CICD moved 42% -> 61% across 14 projects in 30 days; 9 projects now use standardized templates.”'
  },
  {
    area: 'Security adoption',
    weak: '“Security scans were enabled.”',
    strong: '“SAST enabled in 6 services; critical findings triaged within 48h for 4 consecutive weeks.”'
  },
  {
    area: 'Engagement',
    weak: '“Had a productive call.”',
    strong: '“Workshop completed with 12 engineers, 3 dated actions assigned, next office hours scheduled for 2026-03-20.”'
  },
  {
    area: 'Business outcome',
    weak: '“Delivery has improved.”',
    strong: '“Lead time median reduced 9.2d -> 4.7d after runner standardization and MR policy rollout.”'
  }
];

const bandLevels = ['High', 'Medium', 'Low'];

const buildBandMatrix = (rows = []) => {
  const cells = {};
  bandLevels.forEach((pte) => {
    bandLevels.forEach((ptc) => {
      cells[`${pte}:${ptc}`] = {
        pte,
        ptc,
        count: 0
      };
    });
  });

  (rows || []).forEach((row) => {
    const pte = bandLevels.includes(String(row?.pteBand || '')) ? String(row.pteBand) : 'Low';
    const ptc = bandLevels.includes(String(row?.ptcBand || '')) ? String(row.ptcBand) : 'Low';
    const key = `${pte}:${ptc}`;
    if (cells[key]) cells[key].count += 1;
  });

  return cells;
};

const scenarioTemplates = [
  {
    id: 'renewal-risk',
    title: 'Renewal pressure with high churn risk',
    triggerCode: 'RENEWAL_SOON',
    pteBand: 'Medium',
    ptcBand: 'High',
    renewalDays: 45,
    confidenceScore: 72,
    why: 'Use when a renewal window is near and retention pressure is elevated.'
  },
  {
    id: 'secure-gap',
    title: 'Strong CI but Secure stage gap',
    triggerCode: 'STAGE_GAP_SECURE',
    pteBand: 'High',
    ptcBand: 'Medium',
    renewalDays: 140,
    confidenceScore: 78,
    why: 'Use when CI maturity exists but Secure adoption is lagging.'
  },
  {
    id: 'expansion-ready',
    title: 'Expansion-ready account',
    triggerCode: 'HIGH_PTE_LOW_PTC',
    pteBand: 'High',
    ptcBand: 'Low',
    renewalDays: 180,
    confidenceScore: 88,
    why: 'Use when momentum is high and risk headwind is low.'
  }
];

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const escapeMd = (value = '') => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

const buildGuideMarkdown = ({
  generatedOn,
  total,
  pteHigh,
  pteMedium,
  pteLow,
  ptcHigh,
  ptcMedium,
  ptcLow,
  quadrants,
  triggerRows,
  topSignals,
  trend
}) => {
  const triggerTable = [
    '| Trigger | Metric | Why | CSE Play | Manager Play | Response | Active |',
    '|---|---|---|---|---|---|---|',
    ...triggerRows.map(
      (item) =>
        `| ${escapeMd(item.code)} | ${escapeMd(item.metric)} | ${escapeMd(item.why)} | ${escapeMd(item.csePlay)} | ${escapeMd(
          item.managerPlay
        )} | ${escapeMd(item.response)} | ${Number(item.activeCount || 0)} |`
    )
  ].join('\n');

  const signalTable = topSignals.length
    ? [
        '| Signal | Accounts | Severity | Detail |',
        '|---|---:|---|---|',
        ...topSignals.map(
          (signal) =>
            `| ${escapeMd(signal.code)} | ${Number(signal.count || 0)} | ${escapeMd(signal.severity)} | ${escapeMd(
              signal.detail || 'Review risk timeline'
            )} |`
        )
      ].join('\n')
    : 'No active signal watchlist entries.';

  const trendTable = trend.length
    ? [
        '| Month | Readiness Proxy | Risk Pressure Proxy |',
        '|---|---:|---:|',
        ...trend.map((item) => `| ${escapeMd(item.month)} | ${Number(item.readiness || 0)} | ${Number(item.riskPressure || 0)} |`)
      ].join('\n')
    : 'No monthly snapshot trend available.';

  return `# PtE / PtC Operator Guide

Generated: ${generatedOn}

## Summary Metrics

- Portfolio rows: **${total}**
- PtE High / Medium / Low: **${pteHigh} / ${pteMedium} / ${pteLow}**
- PtC High / Medium / Low: **${ptcHigh} / ${ptcMedium} / ${ptcLow}**
- Expand + Retain: **${Number(quadrants.expandAndRetain || 0)}**
- Grow with Risk: **${Number(quadrants.growWithRisk || 0)}**
- Stabilize then Expand: **${Number(quadrants.stabilizeThenExpand || 0)}**
- Monitor: **${Number(quadrants.monitor || 0)}**

## How To Use Weekly

1. Classify by quadrant, then prioritize PtC High first.
2. Diagnose trigger drivers (renewal, engagement, adoption, risk signals).
3. Execute one dated play per trigger cluster with a named owner.
4. Verify movement weekly; change play type if flat for two cycles.

## Trigger Catalog

${triggerTable}

## Top Trigger Watchlist

${signalTable}

## Trend Proxies

Formulas:
- Readiness proxy = (adoptionAvg * 0.62) + (engagementCoverage * 0.38)
- Risk pressure proxy = (redHealthRate * 100 * 0.58) + ((100 - engagementCoverage) * 0.42)

${trendTable}

## PtE / PtC Core Formulas

### PtE (Propensity to Expand) Raw Score

PtE_raw =
- (adoptionScore * 0.32)
- + (engagementScore * 0.23)
- + ((100 - riskScore) * 0.15)
- + (cicdPercent * 0.13)
- + (securityPercent * 0.08)
- + (stageCoveragePercent * 0.09)
- + contextual adjustments:
  - +8 if renewalDays <= 120
  - +4 if renewalDays <= 180
  - -4 if renewalDays > 365
  - +min(8, openExpansionCount * 2)
  - -10 if engagementScore < 45
  - -12 if riskScore >= 70

Final:
- PtE_score = clamp(round(PtE_raw), 0, 100)
- Banding: High >= 70, Medium 45-69, Low < 45

### PtC (Propensity to Churn/Contract) Raw Score

PtC_raw =
- (riskScore * 0.42)
- + ((100 - adoptionScore) * 0.24)
- + ((100 - engagementScore) * 0.17)
- + (renewalPressureScore * 0.17)
- + contextual adjustments:
  - +8 if RENEWAL_SOON is active
  - +10 if no meaningful touch > 90 days
  - +5 if securityPercent < 30
  - -12 if engagement >= 70 AND adoption >= 70 AND risk <= 35

Where renewalPressureScore:
- <=30d: 100, <=60d: 80, <=90d: 60, <=180d: 35, >180d: 15

Final:
- PtC_score = clamp(round(PtC_raw), 0, 100)
- Banding: High >= 70, Medium 45-69, Low < 45

Why outcomes occur:
- PtE rises when adoption and engagement are strong while risk burden is controlled.
- PtC rises when risk signals, adoption/engagement gaps, and renewal pressure stack together.
- Contextual adjustments prevent misleading outcomes when urgency or momentum conditions are extreme.

## Role Checklists

### CSE
- Pair one PtC mitigation with one PtE acceleration per priority account.
- Log trigger codes consistently.
- Attach measurable evidence to every action.
- Escalate when no movement after two cycles.

### CSE Manager
- Review PtC High queue first.
- Ensure owner/date coverage for every red account.
- Protect capacity for risk-heavy quadrants.
- Use trend deltas to rebalance portfolio load.
`;
};

const buildProjectionMarkdown = ({ generatedOn, goal, selection, projection }) => {
  if (!projection) return '';
  const goalLabel = goal === 'retention' ? 'Retention first' : goal === 'expansion' ? 'Expansion first' : 'Balanced';
  const baselinePte = Number(projection?.baseline?.pte?.final || 0);
  const baselinePtc = Number(projection?.baseline?.ptc?.final || 0);
  const projectedPte = Number(projection?.projected?.pte?.final || 0);
  const projectedPtc = Number(projection?.projected?.ptc?.final || 0);
  const pteDelta = round1(projectedPte - baselinePte);
  const ptcDelta = round1(projectedPtc - baselinePtc);

  const historyTable = [
    '| Step | PtE | PtE Band | PtC | PtC Band | PtE vs Baseline | PtC vs Baseline |',
    '|---|---:|---|---:|---|---:|---:|',
    ...(projection.history || []).map((item) => {
      const pte = Number(item?.scenario?.pte?.final || 0);
      const ptc = Number(item?.scenario?.ptc?.final || 0);
      return `| ${escapeMd(item?.step || '')} | ${pte} | ${escapeMd(item?.scenario?.pte?.band || '')} | ${ptc} | ${escapeMd(
        item?.scenario?.ptc?.band || ''
      )} | ${formatSigned(round1(pte - baselinePte), 1)} | ${formatSigned(round1(ptc - baselinePtc), 1)} |`;
    })
  ].join('\n');

  return `# PtE / PtC Projection Summary

Generated: ${generatedOn}

## Plan Setup

- Optimization goal: **${goalLabel}**
- Cycles: **${Number(selection?.cycles || 0)}**
- Action sequence: **${(selection?.actions || []).map((item) => escapeMd(item)).join(' -> ') || 'None'}**

## Summary Movement

- Baseline PtE: **${baselinePte} (${projection?.baseline?.pte?.band || 'Low'})**
- Projected PtE: **${projectedPte} (${projection?.projected?.pte?.band || 'Low'})**
- PtE delta: **${formatSigned(pteDelta, 1)}**

- Baseline PtC: **${baselinePtc} (${projection?.baseline?.ptc?.band || 'Low'})**
- Projected PtC: **${projectedPtc} (${projection?.projected?.ptc?.band || 'Low'})**
- PtC delta: **${formatSigned(ptcDelta, 1)}**

## Cycle History

${historyTable}

## Interpretation

${
  pteDelta > 0 && ptcDelta <= 0
    ? 'This sequence improves expansion readiness while reducing retention pressure.'
    : pteDelta <= 0 && ptcDelta > 0
      ? 'This sequence deteriorates posture and should be replaced with stronger mitigation + adoption actions.'
      : 'This sequence has mixed outcomes; tune action order and intensity.'
}
`;
};

const buildExecutiveBriefMarkdown = ({
  generatedOn,
  baselineMonth,
  total,
  pteHigh,
  pteMedium,
  pteLow,
  ptcHigh,
  ptcMedium,
  ptcLow,
  quadrants,
  currentReadiness,
  currentRiskPressure,
  readinessDelta,
  riskPressureDelta,
  topSignals
}) => {
  const topThreeSignals = (topSignals || []).slice(0, 3);
  const trajectoryLabel =
    readinessDelta >= 0 && riskPressureDelta <= 0
      ? 'Improving'
      : readinessDelta < 0 && riskPressureDelta > 0
        ? 'Deteriorating'
        : 'Mixed';

  const priorityRows = [
    {
      title: 'Retention stabilization',
      when: ptcHigh > 0 ? 'Immediate' : 'Monitor',
      detail:
        ptcHigh > 0
          ? `Work top ${ptcHigh} PtC High account(s) first with owner/date coverage.`
          : 'No PtC High accounts currently active.'
    },
    {
      title: 'Expansion activation',
      when: quadrants.expandAndRetain > 0 ? 'This cycle' : 'After readiness uplift',
      detail:
        quadrants.expandAndRetain > 0
          ? `Advance expansion plans on ${quadrants.expandAndRetain} Expand + Retain account(s).`
          : 'No high-confidence expansion cluster in current snapshot.'
    },
    {
      title: 'Data quality backlog',
      when: 'Weekly hygiene',
      detail: 'Close missing milestone/engagement/owner gaps before major decision reviews.'
    }
  ];

  return `# PtE / PtC Executive Brief

Generated: ${generatedOn}
Baseline: ${baselineMonth || 'None'}

## Portfolio Position

- Accounts in scope: **${total}**
- PtE bands (H/M/L): **${pteHigh} / ${pteMedium} / ${pteLow}**
- PtC bands (H/M/L): **${ptcHigh} / ${ptcMedium} / ${ptcLow}**
- Quadrants:
  - Expand + Retain: **${Number(quadrants.expandAndRetain || 0)}**
  - Grow with Risk: **${Number(quadrants.growWithRisk || 0)}**
  - Stabilize then Expand: **${Number(quadrants.stabilizeThenExpand || 0)}**
  - Monitor: **${Number(quadrants.monitor || 0)}**

## Direction of Travel

- Readiness proxy: **${currentReadiness}** (${formatSigned(readinessDelta, 1)} vs baseline)
- Risk pressure proxy: **${currentRiskPressure}** (${formatSigned(riskPressureDelta, 1)} vs baseline)
- Trajectory: **${trajectoryLabel}**

## Top Trigger Signals

${
  topThreeSignals.length
    ? topThreeSignals.map((signal, index) => `${index + 1}. **${signal.code}** (${signal.count} accounts, ${signal.severity})`).join('\n')
    : '- No active trigger clusters in this snapshot.'
}

## Priority Plays

${priorityRows.map((item, index) => `${index + 1}. **${item.title}** (${item.when}) - ${item.detail}`).join('\n')}

## Manager Checkpoints

1. Confirm owner/date coverage for all red-health accounts.
2. Require one measurable proof-point update per priority account this cycle.
3. Rebalance CSE capacity if PtC High queue is flat for two consecutive reviews.
`;
};

const buildQueueMarkdown = ({ generatedOn, queueRows = [] }) => {
  const lines = [
    '# PtE / PtC Weekly Action Queue',
    '',
    `Generated: ${generatedOn}`,
    '',
    '| Priority | Account | Quadrant | Trigger | Why now | Primary play | Window |',
    '|---:|---|---|---|---|---|---|'
  ];

  queueRows.forEach((item, index) => {
    lines.push(
      `| ${index + 1} (${Number(item.priorityScore || 0)}) | ${escapeMd(item.row?.customer?.name || 'Unknown')} | ${escapeMd(
        quadrantLabelForRow(item.row)
      )} | ${escapeMd(item.primarySignal?.code || 'None')} | ${escapeMd((item.reasons || []).join(', '))} | ${escapeMd(
        item.recommendation?.primary?.title || 'No play'
      )} | ${escapeMd(item.recommendation?.window || 'This cycle')} |`
    );
  });

  return `${lines.join('\n')}\n`;
};

const buildMitigationMarkdown = ({ generatedOn, summary, mitigationRows = [] }) => {
  const lines = [
    '# PtE / PtC Trigger Mitigation Coverage',
    '',
    `Generated: ${generatedOn}`,
    '',
    `- Active trigger accounts: **${Number(summary?.activeTriggerAccounts || 0)}**`,
    `- Accounts with dated mitigation plan: **${Number(summary?.withDatedPlan || 0)}**`,
    `- Missing owner/due: **${Number(summary?.missingOwnerOrDue || 0)}**`,
    `- Accounts with overdue actions: **${Number(summary?.overdueAccounts || 0)}**`,
    `- Coverage rate: **${Number(summary?.coveragePct || 0)}%**`,
    '',
    '| Account | Active triggers | Plan coverage | Next due | Overdue actions | Suggested play |',
    '|---|---:|---:|---|---:|---|'
  ];

  mitigationRows.forEach((item) => {
    lines.push(
      `| ${escapeMd(item.row?.customer?.name || 'Unknown')} | ${Number(item.activeTriggerCount || 0)} | ${Number(item.coveragePct || 0)}% | ${escapeMd(
        item.nextDueRaw || 'Not set'
      )} | ${Number(item.overdueOpenActions || 0)} | ${escapeMd(item.recommendation?.primary?.title || 'No recommendation')} |`
    );
  });

  return `${lines.join('\n')}\n`;
};

const buildPlayEffectivenessRows = (logs, rows) => {
  const currentById = new Map((rows || []).map((row) => [row.customer.id, row]));
  const grouped = new Map();

  (logs || []).forEach((entry) => {
    const play = String(entry?.playTitle || 'Unspecified play');
    if (!grouped.has(play)) {
      grouped.set(play, {
        play,
        runs: 0,
        improved: 0,
        stable: 0,
        regressed: 0,
        pending: 0,
        pteDeltaTotal: 0,
        ptcDeltaTotal: 0,
        observed: 0
      });
    }
    const bucket = grouped.get(play);
    bucket.runs += 1;
    const current = currentById.get(entry.accountId);
    if (!current || !Number.isFinite(Number(entry.baselinePteScore)) || !Number.isFinite(Number(entry.baselinePtcScore))) {
      bucket.pending += 1;
      return;
    }
    const pteDelta = Number(current.pteScore || 0) - Number(entry.baselinePteScore || 0);
    const ptcDelta = Number(entry.baselinePtcScore || 0) - Number(current.ptcScore || 0);
    const positive = pteDelta > 0 || ptcDelta > 0;
    const negative = pteDelta < 0 || ptcDelta < 0;
    if (positive && !negative) bucket.improved += 1;
    else if (negative && !positive) bucket.regressed += 1;
    else bucket.stable += 1;
    bucket.pteDeltaTotal += pteDelta;
    bucket.ptcDeltaTotal += ptcDelta;
    bucket.observed += 1;
  });

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      avgPteDelta: item.observed ? round1(item.pteDeltaTotal / item.observed) : 0,
      avgPtcDelta: item.observed ? round1(item.ptcDeltaTotal / item.observed) : 0,
      effectivenessPct: item.runs ? Math.round((item.improved / item.runs) * 100) : 0
    }))
    .sort((left, right) => {
      if (right.effectivenessPct !== left.effectivenessPct) return right.effectivenessPct - left.effectivenessPct;
      return right.runs - left.runs;
    });
};

const openPrintWindow = (title, markdown) => {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760');
  if (!win) return false;
  win.document.open();
  win.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
      h1 { margin: 0 0 8px; font-size: 24px; }
      .meta { color: #6b7280; margin-bottom: 14px; }
      pre { white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Generated ${escapeHtml(toIsoDate(new Date()))}</p>
    <pre>${escapeHtml(markdown)}</pre>
  </body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
  return true;
};

const triggerGuide = [
  {
    code: 'RENEWAL_SOON',
    metric: 'PtC',
    trigger: 'Renewal window <= 90 days',
    why: 'Decision pressure increases quickly if value proof and executive alignment are incomplete.',
    csePlay: 'Launch renewal evidence brief: outcomes, blockers, owners, due dates.',
    managerPlay: 'Require weekly renewal risk checkpoint until pressure normalizes.',
    response: 'Start within 48 hours'
  },
  {
    code: 'LOW_ENGAGEMENT',
    metric: 'PtC',
    trigger: 'Last meaningful touch > 60 days',
    why: 'No-touch accounts lose momentum and hide blockers until late in cycle.',
    csePlay: 'Re-establish cadence with a structured office-hours or workshop sequence.',
    managerPlay: 'Reassign capacity if no customer response after two attempts.',
    response: 'Start within 3 business days'
  },
  {
    code: 'NO_TIME_TO_VALUE',
    metric: 'PtC',
    trigger: 'First pipeline run milestone not complete',
    why: 'No realized value event means low confidence in platform decision.',
    csePlay: 'Run a rapid first-value sprint focused on one production workflow.',
    managerPlay: 'Escalate enablement support and remove technical blockers.',
    response: 'Start this week'
  },
  {
    code: 'LOW_CICD_ADOPTION',
    metric: 'PtC and PtE',
    trigger: 'CI/CD adoption < 40%',
    why: 'Limited CI/CD usage weakens retention and blocks expansion narrative.',
    csePlay: 'Drive template standardization and runner governance plan.',
    managerPlay: 'Prioritize CI enablement program slots for these accounts.',
    response: '7-14 day plan'
  },
  {
    code: 'LOW_SECURITY_ADOPTION',
    metric: 'PtC and PtE',
    trigger: 'Security adoption < 30%',
    why: 'Security gaps add renewal risk and delay Secure use-case expansion.',
    csePlay: 'Adopt secure baseline pipeline with one target team first.',
    managerPlay: 'Track Secure uplift in weekly portfolio review.',
    response: '7-14 day plan'
  },
  {
    code: 'STAGE_GAP_SECURE',
    metric: 'PtC and PtE',
    trigger: 'Secure stage not started while CI/CD >= 60%',
    why: 'A mature CI estate without Secure creates avoidable platform-value gap.',
    csePlay: 'Position Secure as the next maturity step with measurable outcomes.',
    managerPlay: 'Validate executive sponsor for Secure rollout.',
    response: 'Start this month'
  },
  {
    code: 'HIGH_PTE_LOW_PTC',
    metric: 'PtE',
    trigger: 'PtE High and PtC Low',
    why: 'Best expansion timing: momentum is high and risk headwind is low.',
    csePlay: 'Convert success proof into an expansion proposal and timeline.',
    managerPlay: 'Coach QBR narrative and prioritize commercial alignment.',
    response: 'Start now'
  },
  {
    code: 'HIGH_PTE_HIGH_PTC',
    metric: 'PtE and PtC',
    trigger: 'PtE High and PtC High',
    why: 'Expansion potential exists, but retention risk can stall execution.',
    csePlay: 'Run dual-track plan: stabilize risk first, then expand.',
    managerPlay: 'Require weekly burndown of top 3 risk drivers.',
    response: 'Immediate triage'
  }
];

const triggerOpsMeta = {
  RENEWAL_SOON: {
    severity: 'High',
    owner: 'CSE + CSM',
    sla: '24-48 hours',
    escalateIf: 'No executive sponsor response or no dated mitigation plan within 7 days'
  },
  LOW_ENGAGEMENT: {
    severity: 'Medium',
    owner: 'CSE',
    sla: '3 business days',
    escalateIf: 'No customer response after two outreach attempts'
  },
  NO_TIME_TO_VALUE: {
    severity: 'High',
    owner: 'CSE',
    sla: 'This week',
    escalateIf: 'No first-value milestone date committed'
  },
  LOW_CICD_ADOPTION: {
    severity: 'Medium',
    owner: 'CSE',
    sla: '7-14 days',
    escalateIf: 'No CI uplift plan owner assigned'
  },
  LOW_SECURITY_ADOPTION: {
    severity: 'Medium',
    owner: 'CSE',
    sla: '7-14 days',
    escalateIf: 'Secure baseline still not planned by next review'
  },
  STAGE_GAP_SECURE: {
    severity: 'Medium',
    owner: 'CSE Manager',
    sla: 'This month',
    escalateIf: 'No sponsor for secure rollout'
  },
  HIGH_PTE_LOW_PTC: {
    severity: 'Medium',
    owner: 'CSE',
    sla: 'Start now',
    escalateIf: 'Expansion proposal not positioned by next cycle'
  },
  HIGH_PTE_HIGH_PTC: {
    severity: 'High',
    owner: 'CSE Manager',
    sla: 'Immediate',
    escalateIf: 'Top 3 risk drivers not closing week over week'
  }
};

const quadrantGuide = [
  {
    title: 'Expand + Retain (PtE High, PtC Low)',
    key: 'expandAndRetain',
    tone: 'good',
    cse: 'Convert proof points to an expansion proposal with named sponsor and target close date.',
    manager: 'Prioritize account for executive review and revenue planning.',
    exit: 'Expansion plan accepted and tracked with dated milestones.'
  },
  {
    title: 'Grow with Risk (PtE High, PtC Medium/High)',
    key: 'growWithRisk',
    tone: 'warn',
    cse: 'Stabilize top risk signals while preserving expansion hypothesis and timeline.',
    manager: 'Enforce weekly risk burndown plus deal-protection checkpoint.',
    exit: 'PtC drops to Low or top risks closed with owners and dates.'
  },
  {
    title: 'Stabilize then Expand (PtE Low/Medium, PtC High)',
    key: 'stabilizeThenExpand',
    tone: 'risk',
    cse: 'Run retention recovery plan focused on time-to-value and engagement cadence.',
    manager: 'Allocate additional coverage and remove org blockers fast.',
    exit: 'Health moves off Red and PtE reaches Medium or better.'
  },
  {
    title: 'Monitor (PtE Low/Medium, PtC Low/Medium)',
    key: 'monitor',
    tone: 'neutral',
    cse: 'Maintain cadence and improve one weak use case each cycle.',
    manager: 'Track trend deltas and rebalance load across CSE pool.',
    exit: 'Either PtE rises to High or PtC rises and requires escalation.'
  }
];

export const renderPropensityPage = (ctx) => {
  const { manager, workspacePortfolio, workspace, navigate, notify } = ctx;
  const rows = workspacePortfolio?.rows || manager?.portfolio?.rows || [];
  const total = rows.length;
  const pteHigh = rows.filter((row) => String(row.pteBand || '') === 'High').length;
  const pteMedium = rows.filter((row) => String(row.pteBand || '') === 'Medium').length;
  const pteLow = rows.filter((row) => String(row.pteBand || '') === 'Low').length;
  const ptcHigh = rows.filter((row) => String(row.ptcBand || '') === 'High').length;
  const ptcMedium = rows.filter((row) => String(row.ptcBand || '') === 'Medium').length;
  const ptcLow = rows.filter((row) => String(row.ptcBand || '') === 'Low').length;
  const quadrants = manager?.propensityQuadrants || {
    expandAndRetain: rows.filter((row) => row.pteBand === 'High' && row.ptcBand === 'Low').length,
    growWithRisk: rows.filter((row) => row.pteBand === 'High' && row.ptcBand !== 'Low').length,
    stabilizeThenExpand: rows.filter((row) => row.pteBand !== 'High' && row.ptcBand === 'High').length,
    monitor: rows.filter((row) => row.pteBand !== 'High' && row.ptcBand !== 'High').length
  };

  const signalWatchlist = buildSignalWatchlist(rows);
  const topSignals = signalWatchlist.slice(0, 5);
  const snapshots = Array.isArray(manager?.snapshots) ? [...manager.snapshots] : [];
  snapshots.sort((left, right) => String(left?.month || '').localeCompare(String(right?.month || '')));
  const trend = buildSnapshotTrend(snapshots);
  const snapshotByMonth = new Map(snapshots.map((item) => [String(item.month || ''), item]));
  const snapshotOptions = snapshots
    .slice()
    .reverse()
    .map((item) => `<option value="${escapeHtml(String(item.month || ''))}">${escapeHtml(String(item.month || ''))}</option>`)
    .join('');
  const signalCountByCode = new Map(signalWatchlist.map((item) => [item.code, item.count]));
  const triggerRows = triggerGuide.map((item) => ({
    ...item,
    ...(triggerOpsMeta[item.code] || {
      severity: 'Medium',
      owner: 'CSE',
      sla: item.response || 'This cycle',
      escalateIf: 'No movement after two review cycles'
    }),
    activeCount:
      item.code === 'HIGH_PTE_LOW_PTC'
        ? quadrants.expandAndRetain
        : item.code === 'HIGH_PTE_HIGH_PTC'
          ? quadrants.growWithRisk
          : Number(signalCountByCode.get(item.code) || 0)
  }));

  const slaRows = [...triggerRows].sort((left, right) => {
    const severityDiff = severityRank(right.severity) - severityRank(left.severity);
    if (severityDiff !== 0) return severityDiff;
    return Number(right.activeCount || 0) - Number(left.activeCount || 0);
  });

  const currentAdoptionAvg = rows.length
    ? round1(rows.reduce((sum, row) => sum + Number(row.adoptionScore || 0), 0) / rows.length)
    : 0;
  const currentEngagementCoverage = rows.length
    ? round1((rows.filter((row) => Number(row.engagementDays ?? 999) <= 30).length / rows.length) * 100)
    : 0;
  const currentHealthDistribution = manager?.portfolio?.healthDistribution || deriveHealthDistribution(rows);
  const currentRedRate = rows.length ? round1((Number(currentHealthDistribution.red || 0) / rows.length) * 100) : 0;

  const currentReadinessAdoption = round1(currentAdoptionAvg * 0.62);
  const currentReadinessEngagement = round1(currentEngagementCoverage * 0.38);
  const currentReadiness = computeReadinessProxy(currentAdoptionAvg, currentEngagementCoverage);

  const currentRiskRed = round1(currentRedRate * 0.58);
  const currentRiskEngagementGap = round1((100 - currentEngagementCoverage) * 0.42);
  const currentRiskPressure = computeRiskPressureProxy(currentRedRate, currentEngagementCoverage);

  const latestSnapshot = snapshots.length ? snapshots[snapshots.length - 1] : null;
  const previousAdoptionAvg = Number(latestSnapshot?.adoptionAvg || 0);
  const previousEngagementCoverage = Number(latestSnapshot?.engagementCoverage || 0);
  const previousHealthDistribution = latestSnapshot?.healthDistribution || { green: 0, yellow: 0, red: 0 };
  const previousTotal = Math.max(1, totalHealthCount(previousHealthDistribution));
  const previousRedRate = round1((Number(previousHealthDistribution.red || 0) / previousTotal) * 100);
  const previousReadinessAdoption = round1(previousAdoptionAvg * 0.62);
  const previousReadinessEngagement = round1(previousEngagementCoverage * 0.38);
  const previousReadiness = computeReadinessProxy(previousAdoptionAvg, previousEngagementCoverage);
  const previousRiskRed = round1(previousRedRate * 0.58);
  const previousRiskEngagementGap = round1((100 - previousEngagementCoverage) * 0.42);
  const previousRiskPressure = computeRiskPressureProxy(previousRedRate, previousEngagementCoverage);

  const readinessDelta = round1(currentReadiness - previousReadiness);
  const riskPressureDelta = round1(currentRiskPressure - previousRiskPressure);
  const avgPte = rows.length ? round1(rows.reduce((sum, row) => sum + Number(row.pteScore || 0), 0) / rows.length) : 0;
  const avgPtc = rows.length ? round1(rows.reduce((sum, row) => sum + Number(row.ptcScore || 0), 0) / rows.length) : 0;
  const avgAdoptionScore = rows.length ? round1(rows.reduce((sum, row) => sum + Number(row.adoptionScore || 0), 0) / rows.length) : 0;
  const avgEngagementScore = rows.length ? round1(rows.reduce((sum, row) => sum + Number(row.engagementScore || 0), 0) / rows.length) : 0;
  const avgRiskScore = rows.length ? round1(rows.reduce((sum, row) => sum + Number(row.riskScore || 0), 0) / rows.length) : 0;
  const avgCicdPercent = rows.length ? round1(rows.reduce((sum, row) => sum + Number(row.cicdPercent || 0), 0) / rows.length) : 0;
  const avgSecurityPercent = rows.length ? round1(rows.reduce((sum, row) => sum + Number(row.securityPercent || 0), 0) / rows.length) : 0;
  const avgStageCoveragePercent = rows.length
    ? round1(
        rows.reduce((sum, row) => {
          const stageTotal = Math.max(1, Number(row.stageTotal || 0));
          return sum + (Number(row.stageCoverage || 0) / stageTotal) * 100;
        }, 0) / rows.length
      )
    : 0;
  const avgOpenExpansionCount = rows.length ? round1(rows.reduce((sum, row) => sum + Number(row.openExpansionCount || 0), 0) / rows.length) : 0;
  const rowsWithRenewal = rows.filter((row) => Number.isFinite(Number(row.renewalDays)));
  const avgRenewalDays = rowsWithRenewal.length
    ? round1(rowsWithRenewal.reduce((sum, row) => sum + Number(row.renewalDays || 0), 0) / rowsWithRenewal.length)
    : null;
  const renewalPressurePreview = renewalPressureScorePreview(avgRenewalDays);
  const pteBasePreview = round1(
    avgAdoptionScore * 0.32 +
      avgEngagementScore * 0.23 +
      (100 - avgRiskScore) * 0.15 +
      avgCicdPercent * 0.13 +
      avgSecurityPercent * 0.08 +
      avgStageCoveragePercent * 0.09
  );
  const pteAdjustmentPreview = round1(
    (avgRenewalDays !== null && avgRenewalDays <= 120 ? 8 : 0) +
      (avgRenewalDays !== null && avgRenewalDays > 120 && avgRenewalDays <= 180 ? 4 : 0) +
      (avgRenewalDays !== null && avgRenewalDays > 365 ? -4 : 0) +
      Math.min(8, avgOpenExpansionCount * 2) +
      (avgEngagementScore < 45 ? -10 : 0) +
      (avgRiskScore >= 70 ? -12 : 0)
  );
  const ptePreview = round1(Math.max(0, Math.min(100, pteBasePreview + pteAdjustmentPreview)));
  const ptcBasePreview = round1(
    avgRiskScore * 0.42 + (100 - avgAdoptionScore) * 0.24 + (100 - avgEngagementScore) * 0.17 + renewalPressurePreview * 0.17
  );
  const ptcAdjustmentPreview = round1(
    (ptcHigh > 0 ? 8 : 0) +
      (rows.some((row) => Number(row.engagementDays ?? 999) > 90) ? 10 : 0) +
      (avgSecurityPercent < 30 ? 5 : 0) +
      (avgEngagementScore >= 70 && avgAdoptionScore >= 70 && avgRiskScore <= 35 ? -12 : 0)
  );
  const ptcPreview = round1(Math.max(0, Math.min(100, ptcBasePreview + ptcAdjustmentPreview)));
  const formulaSandboxBaseline = {
    adoptionScore: avgAdoptionScore,
    engagementScore: avgEngagementScore,
    riskScore: avgRiskScore,
    cicdPercent: avgCicdPercent,
    securityPercent: avgSecurityPercent,
    stageCoveragePercent: avgStageCoveragePercent,
    openExpansionCount: avgOpenExpansionCount,
    renewalDays: avgRenewalDays !== null ? avgRenewalDays : 180,
    renewalSoonSignal:
      rows.some((row) => (row.riskSignals || []).some((signal) => normalizeCode(signal.code) === 'RENEWAL_SOON')) ||
      (avgRenewalDays !== null && avgRenewalDays <= 90),
    staleEngagement90: rows.some((row) => Number(row.engagementDays ?? 999) > 90),
    secureBelow30: avgSecurityPercent < 30,
    strongMomentum: avgAdoptionScore >= 70 && avgEngagementScore >= 70 && avgRiskScore <= 35
  };
  const workedFormulaScenarios = [
    {
      id: 'expansion-ready',
      title: 'Expansion-ready profile',
      input: {
        adoptionScore: 82,
        engagementScore: 78,
        riskScore: 28,
        cicdPercent: 84,
        securityPercent: 62,
        stageCoveragePercent: 76,
        openExpansionCount: 3,
        renewalDays: 140,
        renewalSoonSignal: false,
        staleEngagement90: false,
        secureBelow30: false,
        strongMomentum: true
      },
      interpretation: 'High PtE with low PtC supports immediate expansion planning with executive alignment.'
    },
    {
      id: 'balanced-fragile',
      title: 'Balanced but fragile profile',
      input: {
        adoptionScore: 58,
        engagementScore: 54,
        riskScore: 52,
        cicdPercent: 56,
        securityPercent: 34,
        stageCoveragePercent: 50,
        openExpansionCount: 1,
        renewalDays: 105,
        renewalSoonSignal: true,
        staleEngagement90: false,
        secureBelow30: false,
        strongMomentum: false
      },
      interpretation: 'Medium PtE and Medium PtC requires targeted uplift plus risk controls before any expansion ask.'
    },
    {
      id: 'retention-risk',
      title: 'Retention pressure profile',
      input: {
        adoptionScore: 36,
        engagementScore: 30,
        riskScore: 81,
        cicdPercent: 28,
        securityPercent: 14,
        stageCoveragePercent: 26,
        openExpansionCount: 0,
        renewalDays: 45,
        renewalSoonSignal: true,
        staleEngagement90: true,
        secureBelow30: true,
        strongMomentum: false
      },
      interpretation: 'Low PtE and High PtC requires immediate stabilization, owner/date coverage, and weekly mitigation reviews.'
    }
  ].map((item) => ({
    ...item,
    output: calculateFormulaSandbox(item.input)
  }));

  const buildComparison = (snapshot) => {
    if (!snapshot) return null;
    const baselineHealth = snapshot.healthDistribution || { green: 0, yellow: 0, red: 0 };
    const baselineTotal = Math.max(1, totalHealthCount(baselineHealth));
    const baselineAdoption = round1(Number(snapshot.adoptionAvg || 0));
    const baselineEngagement = round1(Number(snapshot.engagementCoverage || 0));
    const baselineRedRate = round1((Number(baselineHealth.red || 0) / baselineTotal) * 100);
    const baselineReadiness = computeReadinessProxy(baselineAdoption, baselineEngagement);
    const baselineRiskPressure = computeRiskPressureProxy(baselineRedRate, baselineEngagement);

    const readinessChange = round1(currentReadiness - baselineReadiness);
    const riskPressureChange = round1(currentRiskPressure - baselineRiskPressure);
    const adoptionChange = round1(currentAdoptionAvg - baselineAdoption);
    const engagementChange = round1(currentEngagementCoverage - baselineEngagement);
    const redRateChange = round1(currentRedRate - baselineRedRate);

    const trajectory =
      readinessChange >= 0 && riskPressureChange <= 0
        ? 'Improving'
        : readinessChange < 0 && riskPressureChange > 0
          ? 'Deteriorating'
          : 'Mixed';

    return {
      month: String(snapshot.month || ''),
      baselineAdoption,
      baselineEngagement,
      baselineRedRate,
      baselineReadiness,
      baselineRiskPressure,
      readinessChange,
      riskPressureChange,
      adoptionChange,
      engagementChange,
      redRateChange,
      trajectory
    };
  };

  const checklist = loadChecklist();
  const confidenceById = new Map(rows.map((row) => [row.customer.id, buildConfidenceForRow(workspace, row)]));
  const confidenceScores = [...confidenceById.values()].map((item) => Number(item.score || 0));
  const avgConfidence = confidenceScores.length ? Math.round(confidenceScores.reduce((sum, value) => sum + value, 0) / confidenceScores.length) : 0;
  const lowConfidenceRows = rows
    .filter((row) => Number(confidenceById.get(row.customer.id)?.score || 0) < 65)
    .sort((left, right) => Number(confidenceById.get(left.customer.id)?.score || 0) - Number(confidenceById.get(right.customer.id)?.score || 0));
  const missingRenewalCount = rows.filter((row) => !String(row.customer?.renewalDate || '').trim()).length;
  const missingEngagementCount = rows.filter((row) => !(workspace?.engagements?.[row.customer.id] || []).length && !String(row.lastEngagementDate || '').trim()).length;
  const ownerMap = buildAccountOwnerMap(workspace);
  const weeklyQueue = buildWeeklyActionQueue(rows, confidenceById);
  const mitigationSummary = buildMitigationCoverage(rows, workspace, confidenceById);
  const lifecycleSummary = buildTriggerLifecycle(rows, workspace);
  const calibrationRows = buildCalibrationRows(rows, ownerMap);
  const quarterPlan = buildQuarterPlan({
    pteHigh,
    ptcHigh,
    readinessDelta,
    riskPressureDelta,
    mitigationSummary,
    lifecycleSummary,
    quadrants
  });
  const playEffectivenessLog = loadPlayEffectivenessLog();
  const playEffectivenessRows = buildPlayEffectivenessRows(playEffectivenessLog, rows);
  const bandMatrix = buildBandMatrix(rows);

  const accountOptions = rows
    .map((row) => `<option value="${row.customer.id}">${escapeHtml(row.customer.name)}</option>`)
    .join('');
  const formulaPlanPresets = [
    {
      id: 'stabilize-expand',
      label: 'Stabilize + Expand (90d)',
      actions: ['recover-engagement', 'reduce-risk', 'expansion-proof'],
      cycles: 3,
      note: 'Balanced recovery and growth loop for medium-risk portfolios.'
    },
    {
      id: 'risk-recovery',
      label: 'Risk Recovery (60d)',
      actions: ['renewal-escalation', 'reduce-risk', 'recover-engagement'],
      cycles: 2,
      note: 'Use when PtC is high and renewal urgency is driving action sequencing.'
    },
    {
      id: 'expansion-track',
      label: 'Expansion Track (90d)',
      actions: ['secure-rollout', 'expansion-proof', 'recover-engagement'],
      cycles: 3,
      note: 'Use when baseline PtE is medium/high and retention pressure is manageable.'
    }
  ];

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'propensity');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Guide',
      title: 'PtE / PtC Operator Guide',
      subtitle:
        'How to interpret propensity triggers, why they matter, and which plays to run for CSE and CSE Manager operations.',
      meta:
        'PtE = Propensity to Expand proxy. PtC = Propensity to Churn/Contract proxy. These are deterministic local metrics used for execution planning.',
      actionsHtml: `
        <button class="ghost-btn" type="button" data-go-home>Back to Today</button>
        <button class="ghost-btn" type="button" data-go-portfolio>Open Portfolio</button>
        <button class="ghost-btn" type="button" data-go-manager>Open Manager</button>
        <button class="ghost-btn" type="button" data-download-guide>Download Guide .md</button>
        <button class="ghost-btn" type="button" data-download-exec-brief>Download Executive Brief .md</button>
        <button class="ghost-btn" type="button" data-print-guide>Print Guide (PDF)</button>
      `
    })}

    <section class="card">
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Portfolio rows', value: total, tone: 'neutral' })}
        ${metricTile({ label: 'PtE High', value: `${pteHigh} (${safePercent(pteHigh, total)}%)`, tone: pteHigh ? 'good' : 'neutral' })}
        ${metricTile({ label: 'PtC High', value: `${ptcHigh} (${safePercent(ptcHigh, total)}%)`, tone: ptcHigh ? 'risk' : 'good' })}
        ${metricTile({ label: 'Expand + Retain', value: quadrants.expandAndRetain, tone: quadrants.expandAndRetain ? 'good' : 'neutral' })}
      </div>
      <div class="callout">
        Use PtE/PtC as a prioritization system, not a replacement for account judgment. Run one PtC mitigation play and one PtE acceleration play per priority account each cycle.
      </div>
    </section>

    <section class="card" id="section-confidence">
      <div class="metric-head">
        <h2>Confidence and Data Quality</h2>
        ${statusChip({ label: `${avgConfidence}% portfolio confidence`, tone: toneFromConfidence(avgConfidence) })}
      </div>
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Average confidence', value: `${avgConfidence}%`, tone: toneFromConfidence(avgConfidence) })}
        ${metricTile({ label: 'Low-confidence accounts', value: lowConfidenceRows.length, tone: lowConfidenceRows.length ? 'warn' : 'good' })}
        ${metricTile({ label: 'Missing renewal dates', value: missingRenewalCount, tone: missingRenewalCount ? 'warn' : 'good' })}
        ${metricTile({ label: 'Missing engagement logs', value: missingEngagementCount, tone: missingEngagementCount ? 'warn' : 'good' })}
      </div>
      <div class="callout">Confidence reflects data completeness (renewal, engagement, milestones, evidence coverage, and mitigation ownership). Use low-confidence rows as data hygiene backlog before major decisions.</div>
      ${
        lowConfidenceRows.length
          ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Confidence</th>
                    <th>Missing inputs</th>
                  </tr>
                </thead>
                <tbody>
                  ${lowConfidenceRows
                    .slice(0, 10)
                    .map((row) => {
                      const confidence = confidenceById.get(row.customer.id);
                      return `
                        <tr>
                          <td><a href="#" data-open-customer="${row.customer.id}">${escapeHtml(row.customer.name)}</a></td>
                          <td>${statusChip({ label: `${confidence?.score || 0}%`, tone: confidence?.tone || 'neutral' })}</td>
                          <td>${(confidence?.missing || []).slice(0, 3).join(' | ') || 'No gaps'}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          : '<p class="empty-text">No low-confidence accounts detected.</p>'
      }
      <div class="form-actions">
        <button class="ghost-btn" type="button" data-drill="confidence:low">Drill low-confidence accounts</button>
      </div>
    </section>

    <section class="card" id="section-evidence-quality">
      <div class="metric-head">
        <h2>Evidence Quality: Good vs Weak</h2>
        ${statusChip({ label: 'Documentation standard', tone: 'neutral' })}
      </div>
      <p class="muted">
        Use these examples to improve confidence scoring and executive narrative quality. Strong evidence is specific, dated, and measurable.
      </p>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Weak evidence</th>
              <th>Strong evidence</th>
            </tr>
          </thead>
          <tbody>
            ${evidenceExamples
              .map(
                (item) => `
                  <tr>
                    <td><strong>${escapeHtml(item.area)}</strong></td>
                    <td>${escapeHtml(item.weak)}</td>
                    <td>${escapeHtml(item.strong)}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card" id="section-start-here">
      <div class="metric-head">
        <h2>Start Here in 5 Minutes</h2>
        ${statusChip({ label: 'Quick orientation', tone: 'neutral' })}
      </div>
      <div class="flow-steps">
        <article class="flow-step">
          <strong>Step 1: Read band mix</strong>
          <p>Check whether expansion readiness (PtE) or retention pressure (PtC) dominates.</p>
          <button class="ghost-btn" type="button" data-jump-target="section-visuals">Open visuals</button>
        </article>
        <article class="flow-step">
          <strong>Step 2: Prioritize triggers</strong>
          <p>Review high-severity triggers and SLA matrix to set the weekly action queue.</p>
          <button class="ghost-btn" type="button" data-jump-target="section-trigger-catalog">Open trigger catalog</button>
        </article>
        <article class="flow-step">
          <strong>Step 3: Confirm readiness</strong>
          <p>Do not launch a play without owner, due date, success metric, and next touch scheduled.</p>
          <button class="ghost-btn" type="button" data-jump-target="section-playbook-readiness">Open readiness checklist</button>
        </article>
        <article class="flow-step">
          <strong>Step 4: Compare trend</strong>
          <p>Use delta panel to verify direction change against the last monthly snapshot.</p>
          <button class="ghost-btn" type="button" data-jump-target="section-score-delta">Open score delta</button>
        </article>
      </div>
    </section>

    <section class="card" id="section-learning-path">
      <div class="metric-head">
        <h2>Guided Learning Path (New Users)</h2>
        ${statusChip({ label: 'Read -> Drill -> Execute -> Validate -> Export', tone: 'good' })}
      </div>
      <div class="flow-steps">
        <article class="flow-step">
          <strong>1) Read metrics</strong>
          <p>Start with PtE/PtC mix and confidence quality to understand posture.</p>
          <button class="ghost-btn" type="button" data-jump-target="section-visuals">Open metrics</button>
        </article>
        <article class="flow-step">
          <strong>2) Run drill</strong>
          <p>Use chart drills to isolate account clusters behind each trigger or band.</p>
          <button class="ghost-btn" type="button" data-jump-target="section-drill">Open drill results</button>
        </article>
        <article class="flow-step">
          <strong>3) Pick play</strong>
          <p>Load account/scenario into wizard and choose deterministic primary + secondary plays.</p>
          <button class="ghost-btn" type="button" data-jump-target="section-play-wizard">Open play wizard</button>
        </article>
        <article class="flow-step">
          <strong>4) Validate movement</strong>
          <p>Compare against baseline snapshots and check lifecycle/SLA movement.</p>
          <button class="ghost-btn" type="button" data-jump-target="section-change-cycle">Open cycle comparison</button>
        </article>
        <article class="flow-step">
          <strong>5) Export narrative</strong>
          <p>Export guide/brief/queue outputs for team and executive reviews.</p>
          <button class="ghost-btn" type="button" data-download-exec-brief>Download brief</button>
        </article>
      </div>
    </section>

    <section class="card" id="section-action-queue">
      <div class="metric-head">
        <h2>Weekly Action Queue (Prioritized)</h2>
        ${statusChip({ label: `${weeklyQueue.length} queued`, tone: weeklyQueue.length ? 'warn' : 'neutral' })}
      </div>
      <p class="muted">
        Ranking combines PtC pressure, renewal proximity, trigger severity, and confidence gaps. Use this queue to decide execution order before ad-hoc requests.
      </p>
      <div class="table-wrap">
        ${
          weeklyQueue.length
            ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Account</th>
                    <th>Quadrant</th>
                    <th>Primary trigger</th>
                    <th>Why now</th>
                    <th>Primary play</th>
                    <th>Window</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${weeklyQueue
                    .map((item, index) => {
                      const row = item.row;
                      return `
                        <tr>
                          <td>${statusChip({ label: `#${index + 1} (${item.priorityScore})`, tone: item.priorityScore >= 90 ? 'risk' : item.priorityScore >= 70 ? 'warn' : 'neutral' })}</td>
                          <td><a href="#" data-open-customer="${row.customer.id}">${escapeHtml(row.customer.name)}</a></td>
                          <td>${statusChip({
                            label: quadrantLabelForRow(row),
                            tone: row.pteBand === 'High' && row.ptcBand === 'Low' ? 'good' : row.ptcBand === 'High' ? 'risk' : 'warn'
                          })}</td>
                          <td>${item.primarySignal ? `${escapeHtml(item.primarySignal.code)} (${escapeHtml(item.primarySignal.severity || 'Low')})` : 'None'}</td>
                          <td>${escapeHtml((item.reasons || []).join(', '))}</td>
                          <td>${escapeHtml(item.recommendation?.primary?.title || 'No recommendation')}</td>
                          <td>${escapeHtml(item.recommendation?.window || 'This cycle')}</td>
                          <td>
                            <div class="page-actions">
                              <button class="ghost-btn" type="button" data-open-customer="${row.customer.id}">Open</button>
                              <button class="ghost-btn" type="button" data-wizard-account="${row.customer.id}">Load in wizard</button>
                              <button class="ghost-btn" type="button" data-explain-customer="${row.customer.id}">Why this score?</button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
            : '<p class="empty-text">No queue entries available. Confirm portfolio data is loaded.</p>'
        }
      </div>
      <div class="form-actions">
        <button class="ghost-btn" type="button" data-drill="ptc:High">Drill PtC High queue</button>
        <button class="ghost-btn" type="button" data-jump-target="section-play-wizard">Jump to Play Wizard</button>
        <button class="ghost-btn" type="button" data-download-queue>Download queue .md</button>
      </div>
    </section>

    <section class="card" id="section-score-explainer">
      <div class="metric-head">
        <h2>Why This Account Scored This Way</h2>
        ${statusChip({ label: 'Score explainer drawer', tone: 'neutral' })}
      </div>
      <p class="muted">
        Click <em>Why this score?</em> from queue, mitigation, or drill rows to open account-level factor detail for PtE and PtC.
      </p>
      <div class="workspace-layout">
        <article class="card compact-card" data-explainer-main>
          <p class="empty-text">No account selected yet. Use any “Why this score?” button to load explanation.</p>
        </article>
        <aside class="drawer card compact-card" data-explainer-drawer>
          <h3>Interpreting Factors</h3>
          <ul class="drawer-list">
            <li>Positive PtE points raise expansion readiness.</li>
            <li>Positive PtC points raise churn/contract risk pressure.</li>
            <li>Renewal pressure and trigger severity drive urgency.</li>
            <li>Use this view to align CSE and manager narrative.</li>
          </ul>
        </aside>
      </div>
    </section>

    <section class="card" id="section-mitigation-coverage">
      <div class="metric-head">
        <h2>Trigger Mitigation Coverage</h2>
        ${statusChip({
          label: `${mitigationSummary.coveragePct}% coverage`,
          tone: mitigationSummary.coveragePct >= 80 ? 'good' : mitigationSummary.coveragePct >= 60 ? 'warn' : 'risk'
        })}
      </div>
      <p class="muted">
        Tracks whether accounts with active trigger signals have dated mitigation actions with clear ownership. Use this as execution hygiene before weekly reviews.
      </p>
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Active trigger accounts', value: mitigationSummary.activeTriggerAccounts, tone: mitigationSummary.activeTriggerAccounts ? 'warn' : 'good' })}
        ${metricTile({ label: 'With owner + due', value: mitigationSummary.withDatedPlan, tone: mitigationSummary.withDatedPlan ? 'good' : 'warn' })}
        ${metricTile({ label: 'Missing owner/date', value: mitigationSummary.missingOwnerOrDue, tone: mitigationSummary.missingOwnerOrDue ? 'risk' : 'good' })}
        ${metricTile({ label: 'Overdue actions', value: mitigationSummary.overdueAccounts, tone: mitigationSummary.overdueAccounts ? 'risk' : 'good' })}
      </div>
      <div class="table-wrap">
        ${
          mitigationSummary.tableRows.length
            ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Active triggers</th>
                    <th>Plan coverage</th>
                    <th>Next due</th>
                    <th>Overdue</th>
                    <th>Suggested play</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${mitigationSummary.tableRows
                    .slice(0, 12)
                    .map((item) => {
                      const row = item.row;
                      return `
                        <tr>
                          <td><a href="#" data-open-customer="${row.customer.id}">${escapeHtml(row.customer.name)}</a></td>
                          <td>${item.activeTriggerCount}</td>
                          <td>${statusChip({
                            label: `${item.coveragePct}%`,
                            tone: item.coveragePct >= 80 ? 'good' : item.coveragePct >= 50 ? 'warn' : 'risk'
                          })}</td>
                          <td>${escapeHtml(item.nextDueRaw || 'Not set')}</td>
                          <td>${statusChip({ label: `${item.overdueOpenActions}`, tone: item.overdueOpenActions ? 'risk' : 'good' })}</td>
                          <td>${escapeHtml(item.recommendation?.primary?.title || 'No recommendation')}</td>
                          <td>
                            <div class="page-actions">
                              <button class="ghost-btn" type="button" data-open-customer="${row.customer.id}">Open</button>
                              <button class="ghost-btn" type="button" data-wizard-account="${row.customer.id}">Load in wizard</button>
                              <button class="ghost-btn" type="button" data-explain-customer="${row.customer.id}">Why this score?</button>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
            : '<p class="empty-text">No active trigger accounts found in this snapshot.</p>'
        }
      </div>
      <div class="form-actions">
        <button class="ghost-btn" type="button" data-drill="ptc:High">Drill PtC High</button>
        <button class="ghost-btn" type="button" data-drill="confidence:low">Drill low-confidence accounts</button>
        <button class="ghost-btn" type="button" data-download-mitigation>Download mitigation coverage .md</button>
      </div>
    </section>

    <section class="card" id="section-trigger-lifecycle">
      <div class="metric-head">
        <h2>Trigger Lifecycle Tracker</h2>
        ${statusChip({ label: `${lifecycleSummary.breaches} SLA breach(es)`, tone: lifecycleSummary.breaches ? 'risk' : 'good' })}
      </div>
      <div class="chip-row">
        ${statusChip({ label: `Detected ${lifecycleSummary.stageCounts.Detected || 0}`, tone: 'neutral' })}
        ${statusChip({ label: `Assigned ${lifecycleSummary.stageCounts.Assigned || 0}`, tone: 'warn' })}
        ${statusChip({ label: `Mitigating ${lifecycleSummary.stageCounts.Mitigating || 0}`, tone: 'good' })}
        ${statusChip({ label: `Validated ${lifecycleSummary.stageCounts.Validated || 0}`, tone: 'good' })}
      </div>
      <p class="muted">
        Lifecycle stages: Detected -> Assigned -> Mitigating -> Validated. Aging and SLA breach flags identify where action is stalled.
      </p>
      <div class="table-wrap">
        ${
          lifecycleSummary.rows.length
            ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Trigger</th>
                    <th>Lifecycle stage</th>
                    <th>Aging (days)</th>
                    <th>SLA (days)</th>
                    <th>Breach</th>
                    <th>Next due</th>
                  </tr>
                </thead>
                <tbody>
                  ${lifecycleSummary.rows
                    .slice(0, 15)
                    .map((item) => {
                      const tone =
                        item.stage === 'Validated' ? 'good' : item.stage === 'Mitigating' ? 'good' : item.stage === 'Assigned' ? 'warn' : 'neutral';
                      return `
                        <tr>
                          <td><a href="#" data-open-customer="${item.row.customer.id}">${escapeHtml(item.row.customer.name)}</a></td>
                          <td>${escapeHtml(item.primarySignal?.code || 'None')}</td>
                          <td>${statusChip({ label: item.stage, tone })}</td>
                          <td>${item.ageDays}</td>
                          <td>${item.slaDays}</td>
                          <td>${statusChip({ label: item.breach ? 'SLA Breach' : 'On Track', tone: item.breach ? 'risk' : 'good' })}</td>
                          <td>${escapeHtml(item.nextDue || 'Not set')}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
            : '<p class="empty-text">No active trigger lifecycle entries in this snapshot.</p>'
        }
      </div>
    </section>

    <section class="card" id="section-matrix">
      <div class="metric-head">
        <h2>PtE x PtC Intervention Matrix</h2>
        ${statusChip({ label: 'Coverage map', tone: 'neutral' })}
      </div>
      <p class="muted">
        Use this matrix to see where accounts cluster. Click any cell to drill contributing accounts and run the matching play motion.
      </p>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>PtE \ PtC</th>
              ${bandLevels.map((ptc) => `<th>PtC ${ptc}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${bandLevels
              .map((pte) => {
                return `
                  <tr>
                    <td><strong>PtE ${pte}</strong></td>
                    ${bandLevels
                      .map((ptc) => {
                        const cell = bandMatrix[`${pte}:${ptc}`] || { count: 0 };
                        const tone = ptc === 'High' ? 'risk' : pte === 'High' && ptc === 'Low' ? 'good' : cell.count ? 'warn' : 'neutral';
                        return `
                          <td>
                            ${statusChip({ label: `${cell.count} account${cell.count === 1 ? '' : 's'}`, tone })}
                            <div class="form-actions">
                              <button class="ghost-btn" type="button" data-drill="cell:${pte},${ptc}">Drill cell</button>
                            </div>
                          </td>
                        `;
                      })
                      .join('')}
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="chip-row">
        ${statusChip({ label: 'Top-right (PtE High / PtC High): dual-track risk + growth', tone: 'warn' })}
        ${statusChip({ label: 'Top-left (PtE High / PtC Low): expansion now', tone: 'good' })}
        ${statusChip({ label: 'Bottom-right (PtE Low / PtC High): stabilization first', tone: 'risk' })}
      </div>
    </section>

    <section class="card" id="section-score-delta">
      <div class="metric-head">
        <h2>Why This Score Changed</h2>
        ${
          latestSnapshot
            ? statusChip({ label: `Vs ${latestSnapshot.month}`, tone: readinessDelta >= 0 ? 'good' : 'warn' })
            : statusChip({ label: 'No baseline snapshot', tone: 'neutral' })
        }
      </div>
      <div class="metric-grid kpi-4">
        ${metricTile({
          label: 'Avg PtE (current)',
          value: avgPte,
          meta: latestSnapshot ? `Direction proxy ${formatSigned(readinessDelta, 1)}` : 'Capture snapshot baseline',
          tone: readinessDelta >= 0 ? 'good' : 'warn'
        })}
        ${metricTile({
          label: 'Avg PtC (current)',
          value: avgPtc,
          meta: latestSnapshot ? `Direction proxy ${formatSigned(riskPressureDelta, 1)}` : 'Capture snapshot baseline',
          tone: riskPressureDelta > 0 ? 'risk' : 'good'
        })}
        ${metricTile({
          label: 'Readiness proxy',
          value: currentReadiness,
          meta: latestSnapshot ? `${formatSigned(readinessDelta, 1)} vs ${previousReadiness}` : 'No prior snapshot',
          tone: readinessDelta >= 0 ? 'good' : 'warn'
        })}
        ${metricTile({
          label: 'Risk pressure proxy',
          value: currentRiskPressure,
          meta: latestSnapshot ? `${formatSigned(riskPressureDelta, 1)} vs ${previousRiskPressure}` : 'No prior snapshot',
          tone: riskPressureDelta > 0 ? 'risk' : 'good'
        })}
      </div>
      ${
        latestSnapshot
          ? `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Current</th>
                    <th>Previous</th>
                    <th>Delta</th>
                    <th>Effect</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Readiness - adoption contribution (62%)</td>
                    <td>${currentReadinessAdoption}</td>
                    <td>${previousReadinessAdoption}</td>
                    <td>${formatSigned(currentReadinessAdoption - previousReadinessAdoption, 1)}</td>
                    <td>${currentReadinessAdoption >= previousReadinessAdoption ? 'Supports PtE' : 'Drags PtE'}</td>
                  </tr>
                  <tr>
                    <td>Readiness - engagement contribution (38%)</td>
                    <td>${currentReadinessEngagement}</td>
                    <td>${previousReadinessEngagement}</td>
                    <td>${formatSigned(currentReadinessEngagement - previousReadinessEngagement, 1)}</td>
                    <td>${currentReadinessEngagement >= previousReadinessEngagement ? 'Supports PtE' : 'Drags PtE'}</td>
                  </tr>
                  <tr>
                    <td>Risk pressure - red health contribution (58%)</td>
                    <td>${currentRiskRed}</td>
                    <td>${previousRiskRed}</td>
                    <td>${formatSigned(currentRiskRed - previousRiskRed, 1)}</td>
                    <td>${currentRiskRed > previousRiskRed ? 'Raises PtC pressure' : 'Lowers PtC pressure'}</td>
                  </tr>
                  <tr>
                    <td>Risk pressure - engagement gap contribution (42%)</td>
                    <td>${currentRiskEngagementGap}</td>
                    <td>${previousRiskEngagementGap}</td>
                    <td>${formatSigned(currentRiskEngagementGap - previousRiskEngagementGap, 1)}</td>
                    <td>${currentRiskEngagementGap > previousRiskEngagementGap ? 'Raises PtC pressure' : 'Lowers PtC pressure'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `
          : '<p class="empty-text">Capture a monthly snapshot in Settings to unlock score-change deltas.</p>'
      }
    </section>

    <section class="card" id="section-change-cycle">
      <div class="metric-head">
        <h2>What Changed This Cycle</h2>
        ${
          latestSnapshot
            ? statusChip({ label: `Baseline options: ${snapshots.length}`, tone: 'neutral' })
            : statusChip({ label: 'Capture snapshots to compare', tone: 'warn' })
        }
      </div>
      <p class="muted">
        Select a baseline snapshot to compare current readiness and risk pressure direction, then adjust plays based on actual movement.
      </p>
      <form class="form-grid">
        <label class="form-span">
          Baseline snapshot month
          <select data-change-baseline>
            <option value="">Select baseline</option>
            ${snapshotOptions || ''}
          </select>
        </label>
      </form>
      <div class="metric-grid kpi-4" data-change-kpis>
        ${metricTile({ label: 'Readiness delta', value: 'N/A', tone: 'neutral', meta: 'Select baseline snapshot' })}
        ${metricTile({ label: 'Risk pressure delta', value: 'N/A', tone: 'neutral', meta: 'Select baseline snapshot' })}
        ${metricTile({ label: 'Adoption delta', value: 'N/A', tone: 'neutral', meta: 'Select baseline snapshot' })}
        ${metricTile({ label: 'Red health delta', value: 'N/A', tone: 'neutral', meta: 'Select baseline snapshot' })}
      </div>
      <div class="chip-row" data-change-summary-chips></div>
      <div class="table-wrap" data-change-drivers>
        <p class="empty-text">No baseline selected. Choose a snapshot month to render comparison drivers.</p>
      </div>
      <div class="grid-cards" data-change-charts></div>
      <p class="muted" data-change-summary>
        Comparison engine uses saved monthly snapshots and current portfolio posture.
      </p>
    </section>

    <section class="card" id="section-quarter-plan">
      <div class="metric-head">
        <h2>Quarterly Planning View (30/60/90 Days)</h2>
        ${statusChip({ label: 'Sequencing beyond weekly queue', tone: 'neutral' })}
      </div>
      <p class="muted">
        Plan forward motions based on current PtE/PtC deltas and trigger pressure. Use this view to sequence recovery, uplift, and expansion over the quarter.
      </p>
      <div class="grid-cards">
        <article class="card compact-card">
          <div class="metric-head">
            <h3>Next 30 days</h3>
            ${statusChip({ label: 'Stabilize', tone: 'warn' })}
          </div>
          <ul class="simple-list">
            ${quarterPlan.day30.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>
        <article class="card compact-card">
          <div class="metric-head">
            <h3>Days 31-60</h3>
            ${statusChip({ label: 'Uplift', tone: 'neutral' })}
          </div>
          <ul class="simple-list">
            ${quarterPlan.day60.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>
        <article class="card compact-card">
          <div class="metric-head">
            <h3>Days 61-90</h3>
            ${statusChip({ label: 'Expand', tone: 'good' })}
          </div>
          <ul class="simple-list">
            ${quarterPlan.day90.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>
      </div>
    </section>

    <section class="grid-cards" id="section-visuals">
      <article class="card">
        <div class="metric-head">
          <h2>PtE Band Mix</h2>
          ${statusChip({ label: 'Expansion mix', tone: 'good' })}
        </div>
        <div class="chart-wrap">
          ${donutChartSvg([
            { label: 'High', value: pteHigh, color: '#16A34A' },
            { label: 'Medium', value: pteMedium, color: '#D97706' },
            { label: 'Low', value: pteLow, color: '#6B7280' }
          ])}
        </div>
        <div class="chip-row">
          ${statusChip({ label: `High ${pteHigh}`, tone: 'good' })}
          ${statusChip({ label: `Medium ${pteMedium}`, tone: 'warn' })}
          ${statusChip({ label: `Low ${pteLow}`, tone: 'neutral' })}
        </div>
        <p class="muted" title="Prioritize PtE High + PtC Low for near-term expansion execution.">
          How to use: prioritize High PtE accounts for expansion, then filter by PtC to avoid risk-heavy motions.
        </p>
        <div class="form-actions">
          <button class="ghost-btn" type="button" data-drill="pte:High">Drill PtE High</button>
          <button class="ghost-btn" type="button" data-drill="pte:Medium">Drill PtE Medium</button>
          <button class="ghost-btn" type="button" data-drill="pte:Low">Drill PtE Low</button>
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>PtC Band Mix</h2>
          ${statusChip({ label: 'Retention pressure mix', tone: 'risk' })}
        </div>
        <div class="chart-wrap">
          ${donutChartSvg([
            { label: 'High', value: ptcHigh, color: '#DC2626' },
            { label: 'Medium', value: ptcMedium, color: '#D97706' },
            { label: 'Low', value: ptcLow, color: '#16A34A' }
          ])}
        </div>
        <div class="chip-row">
          ${statusChip({ label: `High ${ptcHigh}`, tone: 'risk' })}
          ${statusChip({ label: `Medium ${ptcMedium}`, tone: 'warn' })}
          ${statusChip({ label: `Low ${ptcLow}`, tone: 'good' })}
        </div>
        <p class="muted" title="PtC reflects retention pressure from risk signals, engagement gaps, and renewal pressure.">
          How to use: all High PtC accounts require dated mitigation plans before expansion planning.
        </p>
        <div class="form-actions">
          <button class="ghost-btn" type="button" data-drill="ptc:High">Drill PtC High</button>
          <button class="ghost-btn" type="button" data-drill="ptc:Medium">Drill PtC Medium</button>
          <button class="ghost-btn" type="button" data-drill="ptc:Low">Drill PtC Low</button>
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Quadrant Volume</h2>
          ${statusChip({ label: 'Execution segmentation', tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${barChartSvg([
            { label: 'Expand+Retain', value: Number(quadrants.expandAndRetain || 0), color: '#16A34A' },
            { label: 'Grow+Risk', value: Number(quadrants.growWithRisk || 0), color: '#D97706' },
            { label: 'Stabilize', value: Number(quadrants.stabilizeThenExpand || 0), color: '#DC2626' },
            { label: 'Monitor', value: Number(quadrants.monitor || 0), color: '#0284C7' }
          ])}
        </div>
        <p class="muted" title="Quadrants combine PtE and PtC bands to segment account strategy.">
          How to use: assign coverage based on quadrant volume so capacity follows risk and growth opportunity.
        </p>
        <div class="form-actions">
          <button class="ghost-btn" type="button" data-drill="quadrant:expandAndRetain">Expand + Retain</button>
          <button class="ghost-btn" type="button" data-drill="quadrant:growWithRisk">Grow with Risk</button>
          <button class="ghost-btn" type="button" data-drill="quadrant:stabilizeThenExpand">Stabilize then Expand</button>
          <button class="ghost-btn" type="button" data-drill="quadrant:monitor">Monitor</button>
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Top Trigger Volume</h2>
          ${statusChip({ label: `${topSignals.length} signal types`, tone: topSignals.length ? 'warn' : 'good' })}
        </div>
        <div class="chart-wrap">
          ${
            topSignals.length
              ? barChartSvg(
                  topSignals.map((signal) => ({
                    label: signal.code.length > 12 ? `${signal.code.slice(0, 12)}...` : signal.code,
                    value: Number(signal.count || 0),
                    color:
                      String(signal.severity).toLowerCase() === 'high'
                        ? '#DC2626'
                        : String(signal.severity).toLowerCase() === 'medium'
                          ? '#D97706'
                          : '#6B7280'
                  })),
                  { width: 520 }
                )
              : '<p class="empty-text">No active trigger volume to chart.</p>'
          }
        </div>
        <p class="muted" title="High-severity trigger clusters should be addressed before low-severity volume.">
          How to use: combine volume + severity to decide which playbooks run first in the weekly queue.
        </p>
        <div class="form-actions">
          ${
            topSignals.length
              ? topSignals
                  .map(
                    (signal) =>
                      `<button class="ghost-btn" type="button" data-drill="trigger:${signal.code}">${signal.code} (${signal.count})</button>`
                  )
                  .join('')
              : '<span class="muted">No trigger drill available.</span>'
          }
        </div>
      </article>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>How to Use PtE and PtC</h2>
        ${statusChip({ label: 'Weekly operating loop', tone: 'neutral' })}
      </div>
      <div class="flow-steps">
        <article class="flow-step">
          <strong>1) Classify</strong>
          <p>Sort accounts by quadrant first, then by PtC severity. High PtC always drives first response queue.</p>
        </article>
        <article class="flow-step">
          <strong>2) Diagnose</strong>
          <p>Read top trigger drivers: renewal pressure, engagement gaps, adoption gaps, and active risk signals.</p>
        </article>
        <article class="flow-step">
          <strong>3) Execute</strong>
          <p>Assign one owner, one dated play, and one expected outcome per trigger cluster.</p>
        </article>
        <article class="flow-step">
          <strong>4) Verify</strong>
          <p>Re-check PtE/PtC movement weekly. If no change in two cycles, escalate or change play type.</p>
        </article>
      </div>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>What PtE Means</h2>
          ${statusChip({ label: 'Expansion readiness', tone: 'good' })}
        </div>
        <p class="muted">PtE increases when adoption depth, engagement quality, and near-term value narrative are strong.</p>
        <ul class="simple-list">
          <li><strong>High:</strong> run expansion motion now with concrete outcome evidence.</li>
          <li><strong>Medium:</strong> strengthen one weak use case before expansion ask.</li>
          <li><strong>Low:</strong> focus on platform adoption and cadence stability first.</li>
        </ul>
      </article>
      <article class="card">
        <div class="metric-head">
          <h2>What PtC Means</h2>
          ${statusChip({ label: 'Retention pressure', tone: 'risk' })}
        </div>
        <p class="muted">PtC increases when risk signals, adoption gaps, stale engagement, and renewal pressure accumulate.</p>
        <ul class="simple-list">
          <li><strong>High:</strong> immediate retention plan with weekly burndown checkpoints.</li>
          <li><strong>Medium:</strong> targeted risk reduction and engagement cadence reset.</li>
          <li><strong>Low:</strong> maintain health and prevent drift with proactive check-ins.</li>
        </ul>
      </article>
    </section>

    <section class="card" id="section-formulas">
      <div class="metric-head">
        <h2>Formula Reference: How PtE and PtC Are Calculated</h2>
        ${statusChip({ label: 'Deterministic scoring model', tone: 'neutral' })}
      </div>
      <p class="muted">
        These are the exact formulas used in this console. Scores are deterministic, clamped to 0-100, and then banded into High/Medium/Low.
      </p>
      <div class="grid-cards">
        <article class="card compact-card">
          <div class="metric-head">
            <h3>PtE (Propensity to Expand)</h3>
            ${statusChip({ label: `Portfolio preview ${ptePreview}`, tone: ptePreview >= 70 ? 'good' : ptePreview >= 45 ? 'warn' : 'neutral' })}
          </div>
          <p class="muted">
            <strong>Base formula:</strong><br>
            PtE_raw = (adoption * 0.32) + (engagement * 0.23) + ((100 - risk) * 0.15) + (CICD% * 0.13) + (Security% * 0.08) + (StageCoverage% * 0.09)
          </p>
          <p class="muted">
            <strong>Adjustments:</strong> +8 if renewal <=120d, +4 if <=180d, -4 if >365d, +min(8, openExpansion*2), -10 if engagement <45, -12 if risk >=70.
          </p>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Value</th>
                  <th>Weight/Rule</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Adoption score</td><td>${avgAdoptionScore}</td><td>0.32</td><td>${round1(avgAdoptionScore * 0.32)}</td></tr>
                <tr><td>Engagement score</td><td>${avgEngagementScore}</td><td>0.23</td><td>${round1(avgEngagementScore * 0.23)}</td></tr>
                <tr><td>Risk stability (100-risk)</td><td>${round1(100 - avgRiskScore)}</td><td>0.15</td><td>${round1((100 - avgRiskScore) * 0.15)}</td></tr>
                <tr><td>CI/CD adoption %</td><td>${avgCicdPercent}</td><td>0.13</td><td>${round1(avgCicdPercent * 0.13)}</td></tr>
                <tr><td>Security adoption %</td><td>${avgSecurityPercent}</td><td>0.08</td><td>${round1(avgSecurityPercent * 0.08)}</td></tr>
                <tr><td>Stage coverage %</td><td>${avgStageCoveragePercent}</td><td>0.09</td><td>${round1(avgStageCoveragePercent * 0.09)}</td></tr>
                <tr><td><strong>Base subtotal</strong></td><td>-</td><td>-</td><td><strong>${pteBasePreview}</strong></td></tr>
                <tr><td>Context adjustments</td><td>-</td><td>Rules</td><td>${formatSigned(pteAdjustmentPreview, 1)}</td></tr>
                <tr><td><strong>PtE final</strong></td><td>-</td><td>clamp(0..100)</td><td><strong>${ptePreview}</strong></td></tr>
              </tbody>
            </table>
          </div>
          <p class="muted">
            <strong>Why outcomes occur:</strong> PtE rises when adoption + engagement are strong and risk is controlled; it falls when risk/low engagement penalties apply.
          </p>
        </article>

        <article class="card compact-card">
          <div class="metric-head">
            <h3>PtC (Propensity to Churn/Contract)</h3>
            ${statusChip({ label: `Portfolio preview ${ptcPreview}`, tone: ptcPreview >= 70 ? 'risk' : ptcPreview >= 45 ? 'warn' : 'good' })}
          </div>
          <p class="muted">
            <strong>Base formula:</strong><br>
            PtC_raw = (risk * 0.42) + ((100-adoption) * 0.24) + ((100-engagement) * 0.17) + (renewalPressure * 0.17)
          </p>
          <p class="muted">
            <strong>Renewal pressure map:</strong> <=30d=100, <=60d=80, <=90d=60, <=180d=35, >180d=15.
          </p>
          <p class="muted">
            <strong>Adjustments:</strong> +8 renewal signal, +10 no-touch >90d, +5 security <30, -12 strong momentum (high adoption+engagement and low risk).
          </p>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Value</th>
                  <th>Weight/Rule</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Risk score</td><td>${avgRiskScore}</td><td>0.42</td><td>${round1(avgRiskScore * 0.42)}</td></tr>
                <tr><td>Adoption gap (100-adoption)</td><td>${round1(100 - avgAdoptionScore)}</td><td>0.24</td><td>${round1((100 - avgAdoptionScore) * 0.24)}</td></tr>
                <tr><td>Engagement gap (100-engagement)</td><td>${round1(100 - avgEngagementScore)}</td><td>0.17</td><td>${round1((100 - avgEngagementScore) * 0.17)}</td></tr>
                <tr><td>Renewal pressure</td><td>${renewalPressurePreview}</td><td>0.17</td><td>${round1(renewalPressurePreview * 0.17)}</td></tr>
                <tr><td><strong>Base subtotal</strong></td><td>-</td><td>-</td><td><strong>${ptcBasePreview}</strong></td></tr>
                <tr><td>Context adjustments</td><td>-</td><td>Rules</td><td>${formatSigned(ptcAdjustmentPreview, 1)}</td></tr>
                <tr><td><strong>PtC final</strong></td><td>-</td><td>clamp(0..100)</td><td><strong>${ptcPreview}</strong></td></tr>
              </tbody>
            </table>
          </div>
          <p class="muted">
            <strong>Why outcomes occur:</strong> PtC rises when risk signals, weak adoption/engagement, and renewal urgency stack; it drops when momentum and stability improve.
          </p>
        </article>

        <article class="card compact-card">
          <div class="metric-head">
            <h3>Related Guide Metrics</h3>
            ${statusChip({ label: 'Derived supporting formulas', tone: 'neutral' })}
          </div>
          <ul class="simple-list">
            <li><strong>Readiness proxy:</strong> (adoptionAvg * 0.62) + (engagementCoverage * 0.38)</li>
            <li><strong>Risk pressure proxy:</strong> (redHealthRate * 100 * 0.58) + ((100 - engagementCoverage) * 0.42)</li>
            <li><strong>Confidence score:</strong> (completed data checks / 5) * 100</li>
            <li><strong>Queue priority:</strong> PtC band + renewal urgency + trigger severity + confidence penalty</li>
          </ul>
          <p class="muted">
            These formulas explain why an account appears in higher-priority queues even when absolute PtE/PtC scores are similar.
          </p>
        </article>
      </div>
      <div class="chip-row">
        ${statusChip({ label: 'Banding: High >=70', tone: 'neutral' })}
        ${statusChip({ label: 'Banding: Medium 45-69', tone: 'warn' })}
        ${statusChip({ label: 'Banding: Low <45', tone: 'good' })}
      </div>
    </section>

    <section class="card" id="section-formula-examples">
      <div class="metric-head">
        <h2>Worked Examples: Why Scores Land in Each Band</h2>
        ${statusChip({ label: 'Formula walk-through', tone: 'neutral' })}
      </div>
      <p class="muted">
        These examples use fixed inputs and the exact formula engine. Use them as pattern references when coaching CSEs on trigger interpretation.
      </p>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Input profile</th>
              <th>PtE result</th>
              <th>PtC result</th>
              <th>How to use</th>
            </tr>
          </thead>
          <tbody>
            ${workedFormulaScenarios
              .map((item) => {
                const pteTone = item.output.pte.band === 'High' ? 'good' : item.output.pte.band === 'Medium' ? 'warn' : 'neutral';
                const ptcTone = item.output.ptc.band === 'High' ? 'risk' : item.output.ptc.band === 'Medium' ? 'warn' : 'good';
                return `
                  <tr>
                    <td>
                      <strong>${escapeHtml(item.title)}</strong><br>
                      <span class="muted">Renewal ${Number(item.input.renewalDays)}d</span>
                    </td>
                    <td>
                      Adoption ${Number(item.input.adoptionScore)} / Engagement ${Number(item.input.engagementScore)} / Risk ${Number(item.input.riskScore)}<br>
                      CI/CD ${Number(item.input.cicdPercent)}% | Security ${Number(item.input.securityPercent)}% | Stage ${Number(item.input.stageCoveragePercent)}%
                    </td>
                    <td>
                      ${statusChip({ label: `${item.output.pte.final} (${item.output.pte.band})`, tone: pteTone })}<br>
                      <span class="muted">Base ${item.output.pte.base}, adj ${formatSigned(item.output.pte.adjustment, 1)}</span>
                    </td>
                    <td>
                      ${statusChip({ label: `${item.output.ptc.final} (${item.output.ptc.band})`, tone: ptcTone })}<br>
                      <span class="muted">Base ${item.output.ptc.base}, adj ${formatSigned(item.output.ptc.adjustment, 1)}</span>
                    </td>
                    <td>${escapeHtml(item.interpretation)}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card" id="section-formula-sandbox">
      <div class="metric-head">
        <h2>Formula Sandbox: Test Scenarios Live</h2>
        ${statusChip({ label: 'Interactive calculator', tone: 'neutral' })}
      </div>
      <p class="muted">
        Change inputs to see exactly how PtE and PtC move. This uses the same deterministic formulas and adjustment rules shown above.
      </p>
      <form class="form-grid" data-formula-sandbox-form>
        <label>
          Adoption score (0-100)
          <input type="number" name="adoptionScore" min="0" max="100" step="0.1" value="${formulaSandboxBaseline.adoptionScore}" />
        </label>
        <label>
          Engagement score (0-100)
          <input type="number" name="engagementScore" min="0" max="100" step="0.1" value="${formulaSandboxBaseline.engagementScore}" />
        </label>
        <label>
          Risk score (0-100)
          <input type="number" name="riskScore" min="0" max="100" step="0.1" value="${formulaSandboxBaseline.riskScore}" />
        </label>
        <label>
          CI/CD adoption % (0-100)
          <input type="number" name="cicdPercent" min="0" max="100" step="0.1" value="${formulaSandboxBaseline.cicdPercent}" />
        </label>
        <label>
          Security adoption % (0-100)
          <input type="number" name="securityPercent" min="0" max="100" step="0.1" value="${formulaSandboxBaseline.securityPercent}" />
        </label>
        <label>
          Stage coverage % (0-100)
          <input type="number" name="stageCoveragePercent" min="0" max="100" step="0.1" value="${formulaSandboxBaseline.stageCoveragePercent}" />
        </label>
        <label>
          Open expansion count
          <input type="number" name="openExpansionCount" min="0" max="20" step="1" value="${formulaSandboxBaseline.openExpansionCount}" />
        </label>
        <label>
          Renewal days remaining
          <input type="number" name="renewalDays" min="0" max="999" step="1" value="${formulaSandboxBaseline.renewalDays}" />
        </label>
        <fieldset class="filter-multi form-span formula-flags">
          <legend>Adjustment flags</legend>
          <label class="formula-flag">
            <input type="checkbox" name="renewalSoonSignal" ${formulaSandboxBaseline.renewalSoonSignal ? 'checked' : ''} />
            Renewal signal active
          </label>
          <label class="formula-flag">
            <input type="checkbox" name="staleEngagement90" ${formulaSandboxBaseline.staleEngagement90 ? 'checked' : ''} />
            No-touch engagement > 90 days
          </label>
          <label class="formula-flag">
            <input type="checkbox" name="secureBelow30" ${formulaSandboxBaseline.secureBelow30 ? 'checked' : ''} />
            Security adoption below 30%
          </label>
          <label class="formula-flag">
            <input type="checkbox" name="strongMomentum" ${formulaSandboxBaseline.strongMomentum ? 'checked' : ''} />
            Strong momentum (high adoption + engagement, low risk)
          </label>
        </fieldset>
      </form>
      <div class="form-actions">
        <button class="ghost-btn" type="button" data-formula-sandbox-reset>Reset to portfolio baseline</button>
        <button class="ghost-btn" type="button" data-formula-sandbox-action="recover-engagement">Simulate: engagement recovery</button>
        <button class="ghost-btn" type="button" data-formula-sandbox-action="secure-rollout">Simulate: secure rollout</button>
        <button class="ghost-btn" type="button" data-formula-sandbox-action="reduce-risk">Simulate: risk burndown</button>
        <button class="ghost-btn" type="button" data-formula-sandbox-action="renewal-escalation">Simulate: renewal escalation</button>
        <button class="ghost-btn" type="button" data-formula-sandbox-action="expansion-proof">Simulate: expansion proof points</button>
        <button class="ghost-btn" type="button" data-formula-save-a>Save scenario A</button>
        <button class="ghost-btn" type="button" data-formula-save-b>Save scenario B</button>
        <button class="ghost-btn" type="button" data-formula-compare-clear>Clear compare</button>
      </div>
      <p class="muted">Use simulation buttons to preview how common CSE plays change PtE/PtC before you commit to an account plan.</p>
      <fieldset class="filter-multi form-span formula-plan-builder">
        <legend>Play Sequence Projection</legend>
        <p class="muted">
          Select one or more plays and cycles to preview compounded score movement (example: 30/60/90-day execution loops).
        </p>
        <div class="formula-plan-grid">
          <label class="formula-flag">
            <input type="checkbox" name="planAction" value="recover-engagement" />
            Engagement recovery
          </label>
          <label class="formula-flag">
            <input type="checkbox" name="planAction" value="secure-rollout" />
            Secure rollout
          </label>
          <label class="formula-flag">
            <input type="checkbox" name="planAction" value="reduce-risk" />
            Risk burndown
          </label>
          <label class="formula-flag">
            <input type="checkbox" name="planAction" value="renewal-escalation" />
            Renewal escalation
          </label>
          <label class="formula-flag">
            <input type="checkbox" name="planAction" value="expansion-proof" />
            Expansion proof points
          </label>
          <label>
            Number of cycles
            <input type="number" name="planCycles" min="1" max="6" step="1" value="3" />
          </label>
        </div>
        <div class="form-actions">
          <button class="ghost-btn" type="button" data-formula-plan-run>Run projection</button>
          <button class="ghost-btn" type="button" data-formula-plan-clear>Clear projection</button>
          <button class="ghost-btn" type="button" data-formula-plan-download>Download projection .md</button>
        </div>
        <div class="form-actions">
          ${formulaPlanPresets
            .map(
              (preset) =>
                `<button class="ghost-btn" type="button" data-formula-plan-preset="${preset.id}" title="${escapeHtml(preset.note)}">${escapeHtml(
                  preset.label
                )}</button>`
            )
            .join('')}
        </div>
        <div class="form-actions formula-plan-controls">
          <label class="formula-goal">
            Optimization goal
            <select name="planGoal">
              <option value="balanced">Balanced (PtE up + PtC down)</option>
              <option value="retention">Retention first (PtC reduction)</option>
              <option value="expansion">Expansion first (PtE increase)</option>
            </select>
          </label>
          <button class="ghost-btn" type="button" data-formula-plan-recommend>Recommend best preset</button>
        </div>
        <div class="section-stack" data-formula-plan-recommendation>
          <p class="empty-text">Choose an optimization goal to get a ranked preset recommendation.</p>
        </div>
      </fieldset>
      <div class="section-stack" data-formula-plan-output>
        <p class="empty-text">Run a play sequence projection to compare baseline vs projected PtE/PtC.</p>
      </div>
      <div class="section-stack" data-formula-sandbox-output></div>
      <div class="section-stack" data-formula-compare-output>
        <p class="empty-text">Save scenario A and B to compare inputs and PtE/PtC outcomes side-by-side.</p>
      </div>
    </section>

    <section class="card" id="section-drill">
      <div class="metric-head">
        <h2 data-drill-title>Chart Drill-through Results</h2>
        ${statusChip({ label: 'Select a chart control', tone: 'neutral' })}
      </div>
      <p class="muted" data-drill-description>Use any "Drill" button in the visual sections above to list contributing accounts.</p>
      <div class="table-wrap" data-drill-results>
        <p class="empty-text">No drill selection yet.</p>
      </div>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>Readiness Trend (Proxy)</h2>
          ${statusChip({ label: `${trend.length} snapshots`, tone: 'neutral' })}
        </div>
        <p class="muted">Derived from adoption average and engagement coverage. Use this trend to validate whether expansion readiness is improving.</p>
        <div class="chart-wrap">
          ${
            trend.length
              ? lineChartSvg(
                  trend.map((item) => ({
                    label: item.month,
                    value: item.readiness
                  }))
                )
              : '<p class="empty-text">No monthly snapshots available yet.</p>'
          }
        </div>
        <div class="chip-row">
          ${statusChip({ label: 'Formula: 62% adoption', tone: 'neutral' })}
          ${statusChip({ label: '38% engagement', tone: 'neutral' })}
        </div>
        <p class="muted" title="Readiness proxy = (adoptionAvg * 0.62) + (engagementCoverage * 0.38).">
          Interpretation: an upward line means the portfolio is becoming more expansion-ready.
        </p>
        <div class="form-actions">
          <button class="ghost-btn" type="button" data-drill="readiness:high">Drill highest readiness</button>
          <button class="ghost-btn" type="button" data-drill="readiness:low">Drill lowest readiness</button>
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Risk Pressure Trend (Proxy)</h2>
          ${statusChip({ label: `${trend.length} snapshots`, tone: 'warn' })}
        </div>
        <p class="muted">Derived from red-health ratio and engagement coverage decay. Rising trend means retention pressure is accumulating.</p>
        <div class="chart-wrap">
          ${
            trend.length
              ? lineChartSvg(
                  trend.map((item) => ({
                    label: item.month,
                    value: item.riskPressure
                  })),
                  { width: 520 }
                )
              : '<p class="empty-text">No monthly snapshots available yet.</p>'
          }
        </div>
        <div class="chip-row">
          ${statusChip({ label: 'Formula: 58% red-health', tone: 'neutral' })}
          ${statusChip({ label: '42% engagement gap', tone: 'neutral' })}
        </div>
        <p class="muted" title="Risk pressure proxy = (redHealthRate * 100 * 0.58) + ((100 - engagementCoverage) * 0.42).">
          Interpretation: a rising line signals accumulating churn pressure and needs manager attention.
        </p>
        <div class="form-actions">
          <button class="ghost-btn" type="button" data-drill="riskpressure:high">Drill highest risk pressure</button>
          <button class="ghost-btn" type="button" data-drill="riskpressure:low">Drill lowest risk pressure</button>
        </div>
      </article>
    </section>

    <section class="card" id="section-trigger-catalog">
      <div class="metric-head">
        <h2>Trigger Catalog: What, Why, and How to Respond</h2>
        ${statusChip({ label: 'Execution reference', tone: 'warn' })}
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Trigger</th>
              <th>Metric impact</th>
              <th>Why it matters</th>
              <th>CSE play</th>
              <th>Manager play</th>
              <th>Response target</th>
              <th>Active now</th>
            </tr>
          </thead>
          <tbody>
            ${triggerRows
              .map(
                (item) => `
                  <tr>
                    <td><strong>${item.code}</strong><br><span class="muted">${item.trigger}</span></td>
                    <td>${item.metric}</td>
                    <td>${item.why}</td>
                    <td>${item.csePlay}</td>
                    <td>${item.managerPlay}</td>
                    <td>${item.response}</td>
                    <td>${statusChip({ label: `${item.activeCount}`, tone: item.activeCount > 0 ? 'warn' : 'neutral' })}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card" id="section-trigger-sla">
      <div class="metric-head">
        <h2>Trigger Severity and SLA Matrix</h2>
        ${statusChip({ label: 'Operating guardrails', tone: 'warn' })}
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Trigger</th>
              <th>Severity</th>
              <th>Initial owner</th>
              <th>SLA to first action</th>
              <th>Escalate when</th>
              <th>Active now</th>
            </tr>
          </thead>
          <tbody>
            ${slaRows
              .map(
                (item) => `
                  <tr>
                    <td><strong>${item.code}</strong></td>
                    <td>${statusChip({ label: item.severity, tone: severityTone(item.severity) })}</td>
                    <td>${item.owner}</td>
                    <td>${item.sla}</td>
                    <td>${item.escalateIf}</td>
                    <td>${statusChip({ label: `${item.activeCount}`, tone: item.activeCount > 0 ? 'warn' : 'neutral' })}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card" id="section-role-walkthroughs">
      <div class="metric-head">
        <h2>Role-Based Play Walkthroughs (CSE vs Manager)</h2>
        ${statusChip({ label: 'Day-by-day checkpoints', tone: 'neutral' })}
      </div>
      <p class="muted">
        Select a trigger to view who does what and when. This keeps IC execution and manager governance aligned throughout the play.
      </p>
      <form class="form-grid">
        <label class="form-span">
          Trigger walkthrough
          <select data-walkthrough-trigger>
            <option value="default">General operating motion</option>
            ${triggerGuide
              .map((item) => `<option value="${item.code}">${item.code}</option>`)
              .join('')}
          </select>
        </label>
      </form>
      <div class="table-wrap" data-walkthrough-content>
        <p class="empty-text">Select a trigger to render CSE and Manager day-by-day walkthrough.</p>
      </div>
    </section>

    <section class="card" id="section-play-wizard">
      <div class="metric-head">
        <h2>Play Selection Wizard</h2>
        ${statusChip({ label: 'Deterministic recommendation', tone: 'neutral' })}
      </div>
      <p class="muted">Select an account or configure a manual scenario to get a primary/secondary play with expected impact window.</p>
      <form class="form-grid" data-play-wizard-form>
        <label class="form-span">
          Account context
          <select name="accountId">
            <option value="">Manual scenario</option>
            ${accountOptions}
          </select>
        </label>
        <label>
          Trigger
          <select name="triggerCode">
            <option value="">Select trigger</option>
            ${triggerGuide.map((item) => `<option value="${item.code}">${item.code}</option>`).join('')}
          </select>
        </label>
        <label>
          PtE band
          <select name="pteBand">
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low" selected>Low</option>
          </select>
        </label>
        <label>
          PtC band
          <select name="ptcBand">
            <option value="High">High</option>
            <option value="Medium" selected>Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>
        <label>
          Renewal days
          <input name="renewalDays" type="number" min="0" step="1" value="999" />
        </label>
        <label>
          Data confidence (%)
          <input name="confidenceScore" type="number" min="0" max="100" step="1" value="70" />
        </label>
      </form>
      <div class="form-actions">
        <button class="qa" type="button" data-run-play-wizard>Recommend plays</button>
      </div>
      <div data-play-wizard-output>
        <p class="empty-text">Run the wizard to generate recommended primary and secondary plays.</p>
      </div>
    </section>

    <section class="card" id="section-practice-scenarios">
      <div class="metric-head">
        <h2>Practice Scenarios</h2>
        ${statusChip({ label: `${scenarioTemplates.length} guided examples`, tone: 'neutral' })}
      </div>
      <p class="muted">
        Use these preset scenarios to train CSEs and managers on trigger interpretation and play selection. Each scenario loads directly into the wizard.
      </p>
      <div class="grid-cards">
        ${scenarioTemplates
          .map(
            (scenario) => `
              <article class="card compact-card">
                <div class="metric-head">
                  <h3>${escapeHtml(scenario.title)}</h3>
                  ${statusChip({ label: scenario.triggerCode, tone: scenario.ptcBand === 'High' ? 'risk' : scenario.pteBand === 'High' ? 'good' : 'warn' })}
                </div>
                <ul class="simple-list">
                  <li><strong>PtE:</strong> ${scenario.pteBand}</li>
                  <li><strong>PtC:</strong> ${scenario.ptcBand}</li>
                  <li><strong>Renewal window:</strong> ${scenario.renewalDays} days</li>
                  <li><strong>Confidence:</strong> ${scenario.confidenceScore}%</li>
                </ul>
                <p class="muted">${escapeHtml(scenario.why)}</p>
                <div class="form-actions">
                  <button class="ghost-btn" type="button" data-load-scenario="${scenario.id}">Load scenario in wizard</button>
                </div>
              </article>
            `
          )
          .join('')}
      </div>
    </section>

    <section class="card" id="section-manager-calibration">
      <div class="metric-head">
        <h2>Manager Calibration Checks</h2>
        ${statusChip({
          label: `${calibrationRows.filter((item) => item.alignmentPct < 80).length} trigger(s) need coaching`,
          tone: calibrationRows.some((item) => item.alignmentPct < 80) ? 'warn' : 'good'
        })}
      </div>
      <p class="muted">
        Calibration verifies that same trigger clusters lead to consistent play recommendations and SLA expectations across CSE owners.
      </p>
      <div class="table-wrap">
        ${
          calibrationRows.length
            ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Trigger</th>
                    <th>Impacted accounts</th>
                    <th>Owners</th>
                    <th>Dominant play</th>
                    <th>Play variance</th>
                    <th>Alignment</th>
                    <th>SLA expectation</th>
                  </tr>
                </thead>
                <tbody>
                  ${calibrationRows
                    .map(
                      (item) => `
                        <tr>
                          <td><strong>${item.code}</strong></td>
                          <td>${item.impactedCount}</td>
                          <td>${item.owners}</td>
                          <td>${escapeHtml(item.dominantPlay)}</td>
                          <td>${item.playVariance}</td>
                          <td>${statusChip({ label: `${item.alignmentPct}%`, tone: item.tone })}</td>
                          <td>${escapeHtml(item.slaExpectation)}</td>
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            `
            : '<p class="empty-text">No trigger cohorts available for calibration yet.</p>'
        }
      </div>
    </section>

    <section class="card" id="section-play-effectiveness">
      <div class="metric-head">
        <h2>Play Outcome Effectiveness</h2>
        ${statusChip({ label: `${playEffectivenessRows.length} tracked play type(s)`, tone: playEffectivenessRows.length ? 'neutral' : 'warn' })}
      </div>
      <p class="muted">
        Tracks whether logged play runs correlate with PtE increases and PtC decreases on observed accounts. Use this to tune play selection over time.
      </p>
      <div class="table-wrap" data-play-effectiveness>
        ${
          playEffectivenessRows.length
            ? `
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Play type</th>
                    <th>Runs</th>
                    <th>Improved</th>
                    <th>Stable</th>
                    <th>Regressed</th>
                    <th>Pending</th>
                    <th>Avg PtE delta</th>
                    <th>Avg PtC delta</th>
                    <th>Effectiveness</th>
                  </tr>
                </thead>
                <tbody>
                  ${playEffectivenessRows
                    .map(
                      (item) => `
                        <tr>
                          <td>${escapeHtml(item.play)}</td>
                          <td>${item.runs}</td>
                          <td>${item.improved}</td>
                          <td>${item.stable}</td>
                          <td>${item.regressed}</td>
                          <td>${item.pending}</td>
                          <td>${formatSigned(item.avgPteDelta, 1)}</td>
                          <td>${formatSigned(item.avgPtcDelta, 1)}</td>
                          <td>${statusChip({ label: `${item.effectivenessPct}%`, tone: item.effectivenessPct >= 60 ? 'good' : item.effectivenessPct >= 40 ? 'warn' : 'risk' })}</td>
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            `
            : '<p class="empty-text">No logged play runs yet. Use the wizard and click “Log play run” to start tracking outcomes.</p>'
        }
      </div>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>Live Trigger Watchlist</h2>
          ${statusChip({ label: `${signalWatchlist.length} active types`, tone: signalWatchlist.length ? 'warn' : 'good' })}
        </div>
        ${
          signalWatchlist.length
            ? `
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Signal</th>
                      <th>Accounts</th>
                      <th>Severity</th>
                      <th>Why (sample detail)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${signalWatchlist
                      .slice(0, 8)
                      .map(
                        (signal) => `
                          <tr>
                            <td><strong>${signal.code}</strong></td>
                            <td>${signal.count}</td>
                            <td>${statusChip({ label: signal.severity, tone: severityTone(signal.severity) })}</td>
                            <td>${signal.detail || 'Review account risk timeline for this signal.'}</td>
                          </tr>
                        `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
            : '<p class="empty-text">No active risk signals detected in this snapshot.</p>'
        }
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Plays by Time Horizon</h2>
          ${statusChip({ label: 'Response cadence', tone: 'neutral' })}
        </div>
        <div class="timeline">
          <div class="timeline-item">
            <strong>0-48 hours</strong>
            <span>Triage all PtC High accounts. Assign owner, due date, and first mitigation action.</span>
            <span class="muted">Owner: CSE</span>
          </div>
          <div class="timeline-item">
            <strong>Week 1</strong>
            <span>Complete one risk burndown play and confirm next customer touch is scheduled.</span>
            <span class="muted">Owner: CSE + CSM</span>
          </div>
          <div class="timeline-item">
            <strong>Week 2</strong>
            <span>For PtE High accounts, package value narrative and expansion path with sponsors.</span>
            <span class="muted">Owner: CSE</span>
          </div>
          <div class="timeline-item">
            <strong>Monthly review</strong>
            <span>Manager checks trend: PtC High down, PtE High up, and no unowned triggers.</span>
            <span class="muted">Owner: Manager</span>
          </div>
        </div>
      </article>
    </section>

    <section class="card" id="section-playbook-readiness">
      <div class="metric-head">
        <h2>Playbook Readiness Checklist</h2>
        ${statusChip({
          label: `${
            [checklist.owner, checklist.dueDate, checklist.successMetric, checklist.nextTouchDate].filter(Boolean).length
          }/4 required fields`,
          tone:
            [checklist.owner, checklist.dueDate, checklist.successMetric, checklist.nextTouchDate].filter(Boolean).length === 4
              ? 'good'
              : 'warn'
        })}
      </div>
      <p class="muted">Before launching a play, confirm owner, due date, success metric, and next touch are all defined.</p>
      <form class="form-grid" data-readiness-form>
        <label class="form-span">
          Playbook / motion
          <input name="playName" type="text" value="${escapeHtml(checklist.playName || '')}" placeholder="e.g., Renewal recovery sprint" />
        </label>
        <label>
          Owner
          <input name="owner" type="text" value="${escapeHtml(checklist.owner || '')}" placeholder="CSE name" />
        </label>
        <label>
          Due date
          <input name="dueDate" type="date" value="${escapeHtml(checklist.dueDate || '')}" />
        </label>
        <label class="form-span">
          Success metric
          <input
            name="successMetric"
            type="text"
            value="${escapeHtml(checklist.successMetric || '')}"
            placeholder="e.g., PtC from High to Medium in 14 days"
          />
        </label>
        <label>
          Next customer touch
          <input name="nextTouchDate" type="date" value="${escapeHtml(checklist.nextTouchDate || '')}" />
        </label>
      </form>
      <div class="chip-row" data-readiness-status></div>
      <div class="form-actions">
        <button class="qa" type="button" data-save-readiness>Save checklist</button>
        <button class="ghost-btn" type="button" data-reset-readiness>Reset checklist</button>
        <button class="ghost-btn" type="button" data-go-playbooks>Open Playbooks</button>
      </div>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>CSE Checklist</h2>
          ${statusChip({ label: 'Execution quality', tone: 'good' })}
        </div>
        <ul class="simple-list">
          <li>Always pair one PtC mitigation with one PtE acceleration step.</li>
          <li>Use trigger code in notes so trend analysis stays consistent.</li>
          <li>Attach measurable evidence (adoption %, milestone, or engagement date) to each play.</li>
          <li>If score movement is flat for two cycles, change play type, not just follow-up frequency.</li>
        </ul>
      </article>
      <article class="card">
        <div class="metric-head">
          <h2>CSE Manager Checklist</h2>
          ${statusChip({ label: 'Portfolio governance', tone: 'warn' })}
        </div>
        <ul class="simple-list">
          <li>Review PtC High queue first; enforce owner/date coverage on every red account.</li>
          <li>Protect capacity for accounts in Grow with Risk and Stabilize then Expand quadrants.</li>
          <li>Coach narrative quality: triggers -> play -> measurable outcome -> next decision.</li>
          <li>Use monthly trendline to rebalance load and escalate systemic blockers.</li>
        </ul>
      </article>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Quadrant Plays and Exit Criteria</h2>
        ${statusChip({ label: 'Decision framework', tone: 'neutral' })}
      </div>
      <div class="grid-cards">
        ${quadrantGuide
          .map(
            (item) => `
              <article class="card compact-card">
                <div class="metric-head">
                  <h3>${item.title}</h3>
                  ${statusChip({ label: `${quadrants[item.key] || 0} accounts`, tone: item.tone })}
                </div>
                <ul class="simple-list">
                  <li><strong>CSE:</strong> ${item.cse}</li>
                  <li><strong>Manager:</strong> ${item.manager}</li>
                  <li><strong>Exit when:</strong> ${item.exit}</li>
                </ul>
              </article>
            `
          )
          .join('')}
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Bands and Portfolio Distribution</h2>
        ${statusChip({ label: `${total} customers`, tone: 'neutral' })}
      </div>
      <div class="grid-cards">
        <article class="card compact-card">
          <h3>Band thresholds</h3>
          <ul class="simple-list">
            <li><strong>High:</strong> 70-100</li>
            <li><strong>Medium:</strong> 45-69</li>
            <li><strong>Low:</strong> 0-44</li>
          </ul>
        </article>
        <article class="card compact-card">
          <h3>PtE distribution</h3>
          <ul class="simple-list">
            <li>High: <strong>${pteHigh}</strong></li>
            <li>Medium: <strong>${pteMedium}</strong></li>
            <li>Low: <strong>${pteLow}</strong></li>
          </ul>
        </article>
        <article class="card compact-card">
          <h3>PtC distribution</h3>
          <ul class="simple-list">
            <li>High: <strong>${ptcHigh}</strong></li>
            <li>Medium: <strong>${ptcMedium}</strong></li>
            <li>Low: <strong>${ptcLow}</strong></li>
          </ul>
        </article>
      </div>
    </section>
  `;

  const guideMarkdown = buildGuideMarkdown({
    generatedOn: toIsoDate(new Date()),
    total,
    pteHigh,
    pteMedium,
    pteLow,
    ptcHigh,
    ptcMedium,
    ptcLow,
    quadrants,
    triggerRows,
    topSignals,
    trend
  });

  const executiveBriefMarkdown = buildExecutiveBriefMarkdown({
    generatedOn: toIsoDate(new Date()),
    baselineMonth: latestSnapshot?.month || '',
    total,
    pteHigh,
    pteMedium,
    pteLow,
    ptcHigh,
    ptcMedium,
    ptcLow,
    quadrants,
    currentReadiness,
    currentRiskPressure,
    readinessDelta,
    riskPressureDelta,
    topSignals
  });

  const queueMarkdown = buildQueueMarkdown({
    generatedOn: toIsoDate(new Date()),
    queueRows: weeklyQueue
  });

  const mitigationMarkdown = buildMitigationMarkdown({
    generatedOn: toIsoDate(new Date()),
    summary: mitigationSummary,
    mitigationRows: mitigationSummary.tableRows
  });

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));
  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));
  wrapper.querySelector('[data-go-manager]')?.addEventListener('click', () => navigate('manager'));
  wrapper.querySelector('[data-go-playbooks]')?.addEventListener('click', () => navigate('playbooks'));

  wrapper.querySelectorAll('[data-jump-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-jump-target');
      if (!target) return;
      const node = wrapper.querySelector(`#${target}`);
      if (!node) return;
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const explainerMain = wrapper.querySelector('[data-explainer-main]');
  const explainerDrawer = wrapper.querySelector('[data-explainer-drawer]');
  const walkthroughTrigger = wrapper.querySelector('[data-walkthrough-trigger]');
  const walkthroughContent = wrapper.querySelector('[data-walkthrough-content]');
  const playEffectivenessContainer = wrapper.querySelector('[data-play-effectiveness]');
  let livePlayEffectivenessLog = [...playEffectivenessLog];
  let lastWizardRun = null;

  const renderPlayEffectivenessTable = () => {
    if (!playEffectivenessContainer) return;
    const effectivenessRows = buildPlayEffectivenessRows(livePlayEffectivenessLog, rows);
    playEffectivenessContainer.innerHTML = effectivenessRows.length
      ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Play type</th>
                <th>Runs</th>
                <th>Improved</th>
                <th>Stable</th>
                <th>Regressed</th>
                <th>Pending</th>
                <th>Avg PtE delta</th>
                <th>Avg PtC delta</th>
                <th>Effectiveness</th>
              </tr>
            </thead>
            <tbody>
              ${effectivenessRows
                .map(
                  (item) => `
                    <tr>
                      <td>${escapeHtml(item.play)}</td>
                      <td>${item.runs}</td>
                      <td>${item.improved}</td>
                      <td>${item.stable}</td>
                      <td>${item.regressed}</td>
                      <td>${item.pending}</td>
                      <td>${formatSigned(item.avgPteDelta, 1)}</td>
                      <td>${formatSigned(item.avgPtcDelta, 1)}</td>
                      <td>${statusChip({ label: `${item.effectivenessPct}%`, tone: item.effectivenessPct >= 60 ? 'good' : item.effectivenessPct >= 40 ? 'warn' : 'risk' })}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        `
      : '<p class="empty-text">No logged play runs yet. Use the wizard and click “Log play run” to start tracking outcomes.</p>';
  };

  const renderScoreExplainer = (customerId) => {
    if (!explainerMain || !explainerDrawer) return;
    const row = rows.find((item) => item.customer.id === customerId);
    if (!row) return;
    const pte = computePtEProxy(workspace, customerId, new Date());
    const ptc = computePtCProxy(workspace, customerId, new Date());
    const primarySignal = primarySignalForRow(row);
    const owner = ownerMap.get(customerId) || 'Unassigned';
    explainerMain.innerHTML = `
      <div class="metric-head">
        <h3>${escapeHtml(row.customer.name)}</h3>
        ${statusChip({ label: `Health ${row.health || 'Unknown'}`, tone: String(row.health || '').toLowerCase() === 'green' ? 'good' : String(row.health || '').toLowerCase() === 'red' ? 'risk' : 'warn' })}
      </div>
      <div class="chip-row">
        ${statusChip({ label: `PtE ${row.pteScore} (${row.pteBand})`, tone: row.pteBand === 'High' ? 'good' : row.pteBand === 'Medium' ? 'warn' : 'neutral' })}
        ${statusChip({ label: `PtC ${row.ptcScore} (${row.ptcBand})`, tone: row.ptcBand === 'High' ? 'risk' : row.ptcBand === 'Medium' ? 'warn' : 'good' })}
        ${statusChip({ label: `Owner ${owner}`, tone: 'neutral' })}
      </div>
      <p class="muted"><strong>PtE driver:</strong> ${escapeHtml(pte.driver || row.pteDriver || 'No driver')}</p>
      <p class="muted"><strong>PtC driver:</strong> ${escapeHtml(ptc.driver || row.ptcDriver || 'No driver')}</p>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Factor</th>
              <th>PtE points</th>
              <th>PtC points</th>
            </tr>
          </thead>
          <tbody>
            ${[...new Set([...(pte.factors || []).map((f) => f.label), ...(ptc.factors || []).map((f) => f.label)])]
              .map((label) => {
                const pteFactor = (pte.factors || []).find((item) => item.label === label);
                const ptcFactor = (ptc.factors || []).find((item) => item.label === label);
                return `
                  <tr>
                    <td>${escapeHtml(label)}</td>
                    <td>${pteFactor ? formatSigned(Number(pteFactor.points || 0), 1) : '-'}</td>
                    <td>${ptcFactor ? formatSigned(Number(ptcFactor.points || 0), 1) : '-'}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
    explainerDrawer.innerHTML = `
      <h3>Interpretation</h3>
      <ul class="drawer-list">
        <li><strong>Primary trigger:</strong> ${escapeHtml(primarySignal?.code || 'None')}</li>
        <li><strong>Renewal window:</strong> ${Number.isFinite(Number(row.renewalDays)) ? `${row.renewalDays} days` : 'Not configured'}</li>
        <li><strong>Engagement recency:</strong> ${Number(row.engagementDays ?? 999) === 999 ? 'No recent touch' : `${row.engagementDays} days ago`}</li>
        ${(row.why || []).slice(0, 6).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
      </ul>
      <div class="drawer-actions">
        <button class="ghost-btn" type="button" data-open-customer="${row.customer.id}">Open account</button>
        <button class="ghost-btn" type="button" data-wizard-account="${row.customer.id}">Load in wizard</button>
      </div>
    `;
    wrapper.querySelector('#section-score-explainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderWalkthrough = (code) => {
    if (!walkthroughContent) return;
    const normalized = normalizeCode(code || '');
    const rows = walkthroughTemplates[normalized] || walkthroughTemplates.default;
    walkthroughContent.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Window</th>
            <th>CSE actions</th>
            <th>Manager actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (item) => `
                <tr>
                  <td><strong>${escapeHtml(item.window)}</strong></td>
                  <td>${escapeHtml(item.cse)}</td>
                  <td>${escapeHtml(item.manager)}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `;
  };

  if (walkthroughTrigger instanceof HTMLSelectElement) {
    walkthroughTrigger.addEventListener('change', () => {
      renderWalkthrough(walkthroughTrigger.value);
    });
    const firstCode = topSignals[0]?.code || 'default';
    walkthroughTrigger.value = triggerGuide.some((item) => item.code === firstCode) ? firstCode : 'default';
    renderWalkthrough(walkthroughTrigger.value);
  }

  renderPlayEffectivenessTable();

  wrapper.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const logPlayButton = event.target.closest('[data-log-play-run]');
    if (logPlayButton) {
      event.preventDefault();
      if (!lastWizardRun) {
        notify?.('Run a play recommendation first.');
        return;
      }
      const row = rows.find((item) => item.customer.id === lastWizardRun.input.accountId);
      const entry = {
        id: `play_${Date.now()}`,
        ts: new Date().toISOString(),
        accountId: row?.customer?.id || '',
        accountName: row?.customer?.name || 'Manual scenario',
        triggerCode: normalizeCode(lastWizardRun.input.triggerCode || ''),
        playTitle: String(lastWizardRun.recommendation?.primary?.title || ''),
        baselinePteScore: Number(row?.pteScore ?? Number.NaN),
        baselinePtcScore: Number(row?.ptcScore ?? Number.NaN)
      };
      livePlayEffectivenessLog = appendPlayEffectivenessLog(entry);
      renderPlayEffectivenessTable();
      notify?.('Play run logged for effectiveness tracking.');
      return;
    }
    const scenarioButton = event.target.closest('[data-load-scenario]');
    if (scenarioButton) {
      event.preventDefault();
      const scenarioId = scenarioButton.getAttribute('data-load-scenario');
      if (scenarioId) loadScenarioIntoWizard(scenarioId);
      return;
    }
    const explainButton = event.target.closest('[data-explain-customer]');
    if (explainButton) {
      event.preventDefault();
      const customerId = explainButton.getAttribute('data-explain-customer');
      if (customerId) renderScoreExplainer(customerId);
      return;
    }
    const wizardButton = event.target.closest('[data-wizard-account]');
    if (wizardButton) {
      event.preventDefault();
      const customerId = wizardButton.getAttribute('data-wizard-account');
      if (customerId) {
        const accountField = wrapper.querySelector('[data-play-wizard-form] [name="accountId"]');
        if (accountField && 'value' in accountField) accountField.value = customerId;
        setWizardValuesFromAccount(customerId);
        const section = wrapper.querySelector('#section-play-wizard');
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        notify?.(`Wizard loaded for ${rows.find((item) => item.customer.id === customerId)?.customer?.name || 'selected account'}.`);
      }
      return;
    }
    const accountLink = event.target.closest('[data-open-customer]');
    if (accountLink) {
      event.preventDefault();
      const customerId = accountLink.getAttribute('data-open-customer');
      if (customerId) navigate('customer', { id: customerId });
    }
  });

  const changeBaselineSelect = wrapper.querySelector('[data-change-baseline]');
  const changeKpis = wrapper.querySelector('[data-change-kpis]');
  const changeSummaryChips = wrapper.querySelector('[data-change-summary-chips]');
  const changeDrivers = wrapper.querySelector('[data-change-drivers]');
  const changeCharts = wrapper.querySelector('[data-change-charts]');
  const changeSummary = wrapper.querySelector('[data-change-summary]');

  const renderCycleComparison = (month) => {
    if (!changeKpis || !changeSummaryChips || !changeDrivers || !changeCharts || !changeSummary) return;
    const snapshot = snapshotByMonth.get(String(month || '')) || null;
    const comparison = buildComparison(snapshot);
    if (!comparison) {
      changeKpis.innerHTML = `
        ${metricTile({ label: 'Readiness delta', value: 'N/A', tone: 'neutral', meta: 'Select baseline snapshot' })}
        ${metricTile({ label: 'Risk pressure delta', value: 'N/A', tone: 'neutral', meta: 'Select baseline snapshot' })}
        ${metricTile({ label: 'Adoption delta', value: 'N/A', tone: 'neutral', meta: 'Select baseline snapshot' })}
        ${metricTile({ label: 'Red health delta', value: 'N/A', tone: 'neutral', meta: 'Select baseline snapshot' })}
      `;
      changeSummaryChips.innerHTML = '';
      changeDrivers.innerHTML = '<p class="empty-text">No baseline selected. Choose a snapshot month to render comparison drivers.</p>';
      changeCharts.innerHTML = '';
      changeSummary.textContent = 'Comparison engine uses saved monthly snapshots and current portfolio posture.';
      return;
    }

    const readinessTone = comparison.readinessChange >= 0 ? 'good' : 'warn';
    const riskTone = comparison.riskPressureChange <= 0 ? 'good' : 'risk';
    const adoptionTone = comparison.adoptionChange >= 0 ? 'good' : 'warn';
    const redTone = comparison.redRateChange <= 0 ? 'good' : 'risk';

    changeKpis.innerHTML = `
      ${metricTile({ label: `Readiness delta vs ${comparison.month}`, value: formatSigned(comparison.readinessChange, 1), tone: readinessTone })}
      ${metricTile({ label: `Risk pressure delta vs ${comparison.month}`, value: formatSigned(comparison.riskPressureChange, 1), tone: riskTone })}
      ${metricTile({ label: `Adoption delta vs ${comparison.month}`, value: formatSigned(comparison.adoptionChange, 1), tone: adoptionTone })}
      ${metricTile({ label: `Red health delta vs ${comparison.month}`, value: formatSigned(comparison.redRateChange, 1), tone: redTone })}
    `;

    changeSummaryChips.innerHTML = `
      ${statusChip({ label: `Trajectory: ${comparison.trajectory}`, tone: comparison.trajectory === 'Improving' ? 'good' : comparison.trajectory === 'Deteriorating' ? 'risk' : 'warn' })}
      ${statusChip({ label: `Baseline ${comparison.month}`, tone: 'neutral' })}
      ${statusChip({ label: `Current readiness ${currentReadiness}`, tone: 'neutral' })}
      ${statusChip({ label: `Current risk pressure ${currentRiskPressure}`, tone: 'neutral' })}
    `;

    changeDrivers.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Current</th>
            <th>Baseline (${comparison.month})</th>
            <th>Delta</th>
            <th>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Adoption average</td>
            <td>${currentAdoptionAvg}</td>
            <td>${comparison.baselineAdoption}</td>
            <td>${formatSigned(comparison.adoptionChange, 1)}</td>
            <td>${comparison.adoptionChange >= 0 ? 'Adoption depth improving' : 'Adoption depth declining'}</td>
          </tr>
          <tr>
            <td>Engagement coverage (30d)</td>
            <td>${currentEngagementCoverage}%</td>
            <td>${comparison.baselineEngagement}%</td>
            <td>${formatSigned(comparison.engagementChange, 1)} pts</td>
            <td>${comparison.engagementChange >= 0 ? 'Recent engagement improving' : 'Recent engagement weakening'}</td>
          </tr>
          <tr>
            <td>Readiness proxy</td>
            <td>${currentReadiness}</td>
            <td>${comparison.baselineReadiness}</td>
            <td>${formatSigned(comparison.readinessChange, 1)}</td>
            <td>${comparison.readinessChange >= 0 ? 'Supports PtE increase' : 'Drags PtE'}</td>
          </tr>
          <tr>
            <td>Risk pressure proxy</td>
            <td>${currentRiskPressure}</td>
            <td>${comparison.baselineRiskPressure}</td>
            <td>${formatSigned(comparison.riskPressureChange, 1)}</td>
            <td>${comparison.riskPressureChange <= 0 ? 'Retention pressure easing' : 'Retention pressure rising'}</td>
          </tr>
          <tr>
            <td>Red health rate</td>
            <td>${currentRedRate}%</td>
            <td>${comparison.baselineRedRate}%</td>
            <td>${formatSigned(comparison.redRateChange, 1)} pts</td>
            <td>${comparison.redRateChange <= 0 ? 'Red account ratio improving' : 'Red account ratio worsening'}</td>
          </tr>
        </tbody>
      </table>
    `;

    changeCharts.innerHTML = `
      <article class="card compact-card">
        <div class="metric-head">
          <h3>Readiness comparison</h3>
          ${statusChip({ label: `${comparison.month} -> now`, tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${lineChartSvg(
            [
              { label: comparison.month, value: comparison.baselineReadiness },
              { label: 'Now', value: currentReadiness }
            ],
            { width: 420, height: 210 }
          )}
        </div>
      </article>
      <article class="card compact-card">
        <div class="metric-head">
          <h3>Risk pressure comparison</h3>
          ${statusChip({ label: `${comparison.month} -> now`, tone: 'warn' })}
        </div>
        <div class="chart-wrap">
          ${lineChartSvg(
            [
              { label: comparison.month, value: comparison.baselineRiskPressure },
              { label: 'Now', value: currentRiskPressure }
            ],
            { width: 420, height: 210 }
          )}
        </div>
      </article>
    `;

    changeSummary.textContent = `Compared to ${comparison.month}, trajectory is ${comparison.trajectory.toLowerCase()}. Prioritize plays where deltas moved in the wrong direction.`;
  };

  if (changeBaselineSelect instanceof HTMLSelectElement) {
    changeBaselineSelect.addEventListener('change', () => {
      renderCycleComparison(changeBaselineSelect.value);
    });
    if (latestSnapshot?.month) {
      changeBaselineSelect.value = String(latestSnapshot.month);
      renderCycleComparison(String(latestSnapshot.month));
    } else {
      renderCycleComparison('');
    }
  }

  const drillTitle = wrapper.querySelector('[data-drill-title]');
  const drillDescription = wrapper.querySelector('[data-drill-description]');
  const drillResults = wrapper.querySelector('[data-drill-results]');

  const renderDrillResults = (token) => {
    if (!drillResults || !drillTitle || !drillDescription) return;
    const result = drillRows(rows, confidenceById, token);
    drillTitle.textContent = result.title;
    drillDescription.textContent = `${result.description} (${result.rows.length} account${result.rows.length === 1 ? '' : 's'}).`;
    if (!result.rows.length) {
      drillResults.innerHTML = '<p class="empty-text">No accounts match this drill selection.</p>';
      return;
    }
    drillResults.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Health</th>
            <th>PtE</th>
            <th>PtC</th>
            <th>Primary trigger</th>
            <th>Confidence</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${result.rows
            .map((row) => {
              const confidence = confidenceById.get(row.customer.id);
              const trigger = (row.riskSignals || [])[0];
              return `
                <tr>
                  <td><a href="#" data-open-customer="${row.customer.id}">${escapeHtml(row.customer.name)}</a></td>
                  <td>${statusChip({ label: row.health || 'Unknown', tone: String(row.health || '').toLowerCase() === 'green' ? 'good' : String(row.health || '').toLowerCase() === 'red' ? 'risk' : 'warn' })}</td>
                  <td>${statusChip({ label: `${row.pteScore || 0} (${row.pteBand || 'Low'})`, tone: row.pteBand === 'High' ? 'good' : row.pteBand === 'Medium' ? 'warn' : 'neutral' })}</td>
                  <td>${statusChip({ label: `${row.ptcScore || 0} (${row.ptcBand || 'Low'})`, tone: row.ptcBand === 'High' ? 'risk' : row.ptcBand === 'Medium' ? 'warn' : 'good' })}</td>
                  <td>${trigger ? `${escapeHtml(trigger.code)} (${escapeHtml(trigger.severity || 'Low')})` : 'None'}</td>
                  <td>${statusChip({ label: `${confidence?.score || 0}%`, tone: confidence?.tone || 'neutral' })}</td>
                  <td>
                    <div class="page-actions">
                      <button class="ghost-btn" type="button" data-open-customer="${row.customer.id}">Open</button>
                      <button class="ghost-btn" type="button" data-explain-customer="${row.customer.id}">Why this score?</button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  };

  wrapper.querySelectorAll('[data-drill]').forEach((button) => {
    button.addEventListener('click', () => {
      const token = button.getAttribute('data-drill');
      if (!token) return;
      renderDrillResults(token);
      const section = wrapper.querySelector('#section-drill');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const formulaSandboxForm = wrapper.querySelector('[data-formula-sandbox-form]');
  const formulaSandboxOutput = wrapper.querySelector('[data-formula-sandbox-output]');
  const formulaSandboxReset = wrapper.querySelector('[data-formula-sandbox-reset]');
  const formulaSandboxActions = wrapper.querySelectorAll('[data-formula-sandbox-action]');
  const formulaSaveA = wrapper.querySelector('[data-formula-save-a]');
  const formulaSaveB = wrapper.querySelector('[data-formula-save-b]');
  const formulaCompareClear = wrapper.querySelector('[data-formula-compare-clear]');
  const formulaCompareOutput = wrapper.querySelector('[data-formula-compare-output]');
  const formulaPlanRun = wrapper.querySelector('[data-formula-plan-run]');
  const formulaPlanClear = wrapper.querySelector('[data-formula-plan-clear]');
  const formulaPlanDownload = wrapper.querySelector('[data-formula-plan-download]');
  const formulaPlanOutput = wrapper.querySelector('[data-formula-plan-output]');
  const formulaPlanPresetButtons = wrapper.querySelectorAll('[data-formula-plan-preset]');
  const formulaPlanRecommend = wrapper.querySelector('[data-formula-plan-recommend]');
  const formulaPlanRecommendation = wrapper.querySelector('[data-formula-plan-recommendation]');
  let formulaCompareA = null;
  let formulaCompareB = null;
  let lastFormulaPlanProjection = null;
  let lastFormulaPlanSelection = null;
  let lastFormulaPlanGoal = 'balanced';

  const readFormulaSandboxState = () => {
    if (!(formulaSandboxForm instanceof HTMLFormElement)) return { ...formulaSandboxBaseline };
    const readNumber = (name, fallback = 0) => {
      const field = formulaSandboxForm.elements.namedItem(name);
      if (!field || !('value' in field)) return fallback;
      const numeric = Number(field.value);
      return Number.isFinite(numeric) ? numeric : fallback;
    };
    const readCheckbox = (name, fallback = false) => {
      const field = formulaSandboxForm.elements.namedItem(name);
      return field && 'checked' in field ? Boolean(field.checked) : fallback;
    };
    return {
      adoptionScore: readNumber('adoptionScore', formulaSandboxBaseline.adoptionScore),
      engagementScore: readNumber('engagementScore', formulaSandboxBaseline.engagementScore),
      riskScore: readNumber('riskScore', formulaSandboxBaseline.riskScore),
      cicdPercent: readNumber('cicdPercent', formulaSandboxBaseline.cicdPercent),
      securityPercent: readNumber('securityPercent', formulaSandboxBaseline.securityPercent),
      stageCoveragePercent: readNumber('stageCoveragePercent', formulaSandboxBaseline.stageCoveragePercent),
      openExpansionCount: readNumber('openExpansionCount', formulaSandboxBaseline.openExpansionCount),
      renewalDays: readNumber('renewalDays', formulaSandboxBaseline.renewalDays),
      renewalSoonSignal: readCheckbox('renewalSoonSignal', formulaSandboxBaseline.renewalSoonSignal),
      staleEngagement90: readCheckbox('staleEngagement90', formulaSandboxBaseline.staleEngagement90),
      secureBelow30: readCheckbox('secureBelow30', formulaSandboxBaseline.secureBelow30),
      strongMomentum: readCheckbox('strongMomentum', formulaSandboxBaseline.strongMomentum)
    };
  };

  const setFormulaSandboxState = (state = {}) => {
    if (!(formulaSandboxForm instanceof HTMLFormElement)) return;
    const setValue = (name, value) => {
      const field = formulaSandboxForm.elements.namedItem(name);
      if (field && 'value' in field) field.value = String(value ?? '');
    };
    const setChecked = (name, value) => {
      const field = formulaSandboxForm.elements.namedItem(name);
      if (field && 'checked' in field) field.checked = Boolean(value);
    };
    setValue('adoptionScore', state.adoptionScore);
    setValue('engagementScore', state.engagementScore);
    setValue('riskScore', state.riskScore);
    setValue('cicdPercent', state.cicdPercent);
    setValue('securityPercent', state.securityPercent);
    setValue('stageCoveragePercent', state.stageCoveragePercent);
    setValue('openExpansionCount', state.openExpansionCount);
    setValue('renewalDays', state.renewalDays);
    setChecked('renewalSoonSignal', state.renewalSoonSignal);
    setChecked('staleEngagement90', state.staleEngagement90);
    setChecked('secureBelow30', state.secureBelow30);
    setChecked('strongMomentum', state.strongMomentum);
  };

  const renderFormulaSandboxOutput = () => {
    if (!formulaSandboxOutput) return;
    const scenario = calculateFormulaSandbox(readFormulaSandboxState());
    const { inputs, pte, ptc } = scenario;
    const sensitivity = calculateFormulaSensitivity(inputs);
    const baselineRules = deriveFormulaRuleStates(formulaSandboxBaseline);
    const baselineRuleById = new Map(baselineRules.map((item) => [item.id, item]));
    const currentRules = deriveFormulaRuleStates(inputs);
    const targetGuidance = deriveBandTargetGuidance(scenario, sensitivity);
    const maxSensitivityImpact = Math.max(
      1,
      ...sensitivity.map((item) => Math.max(Math.abs(Number(item.pteDelta || 0)), Math.abs(Number(item.ptcDelta || 0))))
    );
    const strongestPteLever = [...sensitivity].sort((left, right) => Number(right.pteDelta || 0) - Number(left.pteDelta || 0))[0];
    const strongestPtcPressure = [...sensitivity].sort((left, right) => Number(right.ptcDelta || 0) - Number(left.ptcDelta || 0))[0];
    const pteTone = pte.band === 'High' ? 'good' : pte.band === 'Medium' ? 'warn' : 'neutral';
    const ptcTone = ptc.band === 'High' ? 'risk' : ptc.band === 'Medium' ? 'warn' : 'good';
    const pteWhy =
      pte.band === 'High'
        ? 'Expansion readiness is high because weighted adoption/engagement drivers and context adjustments keep the score above 70.'
        : pte.band === 'Medium'
          ? 'Expansion readiness is moderate. Improve one major input (adoption, engagement, or risk stability) to move above 70.'
          : 'Expansion readiness is low because weighted drivers are not yet strong enough or penalties are reducing the final score.';
    const ptcWhy =
      ptc.band === 'High'
        ? 'Retention pressure is high because risk, adoption/engagement gaps, and renewal urgency stack into a high final score.'
        : ptc.band === 'Medium'
          ? 'Retention pressure is moderate. Closing trigger adjustments and reducing gap metrics should move this toward Low.'
          : 'Retention pressure is low because risk burden and gap metrics remain controlled after adjustments.';

    formulaSandboxOutput.innerHTML = `
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'PtE base', value: pte.base, tone: 'neutral' })}
        ${metricTile({ label: 'PtE final', value: `${pte.final} (${pte.band})`, tone: pteTone })}
        ${metricTile({ label: 'PtC base', value: ptc.base, tone: 'neutral' })}
        ${metricTile({ label: 'PtC final', value: `${ptc.final} (${ptc.band})`, tone: ptcTone })}
      </div>
      <div class="grid-cards">
        <article class="card compact-card">
          <div class="metric-head">
            <h3>PtE contribution breakdown</h3>
            ${statusChip({ label: `Adjustment ${formatSigned(pte.adjustment, 1)}`, tone: pte.adjustment >= 0 ? 'good' : 'warn' })}
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Input</th>
                  <th>Weight/Rule</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Adoption score</td><td>${inputs.adoptionScore}</td><td>0.32</td><td>${round1(inputs.adoptionScore * 0.32)}</td></tr>
                <tr><td>Engagement score</td><td>${inputs.engagementScore}</td><td>0.23</td><td>${round1(inputs.engagementScore * 0.23)}</td></tr>
                <tr><td>Risk stability (100-risk)</td><td>${round1(100 - inputs.riskScore)}</td><td>0.15</td><td>${round1((100 - inputs.riskScore) * 0.15)}</td></tr>
                <tr><td>CI/CD adoption %</td><td>${inputs.cicdPercent}</td><td>0.13</td><td>${round1(inputs.cicdPercent * 0.13)}</td></tr>
                <tr><td>Security adoption %</td><td>${inputs.securityPercent}</td><td>0.08</td><td>${round1(inputs.securityPercent * 0.08)}</td></tr>
                <tr><td>Stage coverage %</td><td>${inputs.stageCoveragePercent}</td><td>0.09</td><td>${round1(inputs.stageCoveragePercent * 0.09)}</td></tr>
                <tr><td><strong>Base subtotal</strong></td><td>-</td><td>-</td><td><strong>${pte.base}</strong></td></tr>
                <tr><td>Rule adjustment</td><td>-</td><td>Context rules</td><td>${formatSigned(pte.adjustment, 1)}</td></tr>
                <tr><td><strong>Final PtE</strong></td><td>-</td><td>clamp(0..100)</td><td><strong>${pte.final}</strong></td></tr>
              </tbody>
            </table>
          </div>
          <p class="muted"><strong>Outcome logic:</strong> ${pteWhy}</p>
        </article>
        <article class="card compact-card">
          <div class="metric-head">
            <h3>PtC contribution breakdown</h3>
            ${statusChip({ label: `Adjustment ${formatSigned(ptc.adjustment, 1)}`, tone: ptc.adjustment > 0 ? 'risk' : ptc.adjustment < 0 ? 'good' : 'neutral' })}
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Input</th>
                  <th>Weight/Rule</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Risk score</td><td>${inputs.riskScore}</td><td>0.42</td><td>${round1(inputs.riskScore * 0.42)}</td></tr>
                <tr><td>Adoption gap (100-adoption)</td><td>${round1(100 - inputs.adoptionScore)}</td><td>0.24</td><td>${round1((100 - inputs.adoptionScore) * 0.24)}</td></tr>
                <tr><td>Engagement gap (100-engagement)</td><td>${round1(100 - inputs.engagementScore)}</td><td>0.17</td><td>${round1((100 - inputs.engagementScore) * 0.17)}</td></tr>
                <tr><td>Renewal pressure</td><td>${inputs.renewalPressure}</td><td>0.17</td><td>${round1(inputs.renewalPressure * 0.17)}</td></tr>
                <tr><td><strong>Base subtotal</strong></td><td>-</td><td>-</td><td><strong>${ptc.base}</strong></td></tr>
                <tr><td>Rule adjustment</td><td>-</td><td>Signals/momentum</td><td>${formatSigned(ptc.adjustment, 1)}</td></tr>
                <tr><td><strong>Final PtC</strong></td><td>-</td><td>clamp(0..100)</td><td><strong>${ptc.final}</strong></td></tr>
              </tbody>
            </table>
          </div>
          <p class="muted"><strong>Outcome logic:</strong> ${ptcWhy}</p>
        </article>
      </div>
      <div class="chip-row">
        ${statusChip({ label: `Renewal pressure ${inputs.renewalPressure}`, tone: inputs.renewalPressure >= 60 ? 'warn' : 'neutral' })}
        ${statusChip({ label: `Flags on: ${[inputs.renewalSoonSignal, inputs.staleEngagement90, inputs.secureBelow30, inputs.strongMomentum].filter(Boolean).length}/4`, tone: 'neutral' })}
      </div>
      <article class="card compact-card">
        <div class="metric-head">
          <h3>Sensitivity Analysis: Which Inputs Move Scores Most</h3>
          ${statusChip({ label: 'Scenario delta view', tone: 'neutral' })}
        </div>
        <p class="muted">
          Each row applies one test change to the current scenario. Larger deltas mean stronger formula leverage for that input.
        </p>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Input probe</th>
                <th>Change</th>
                <th>PtE delta</th>
                <th>PtC delta</th>
                <th>Why outcome occurs</th>
              </tr>
            </thead>
            <tbody>
              ${sensitivity
                .map((item) => {
                  const pteWidth = Math.max(4, Math.round((Math.abs(Number(item.pteDelta || 0)) / maxSensitivityImpact) * 100));
                  const ptcWidth = Math.max(4, Math.round((Math.abs(Number(item.ptcDelta || 0)) / maxSensitivityImpact) * 100));
                  return `
                    <tr>
                      <td><strong>${escapeHtml(item.label)}</strong></td>
                      <td>${escapeHtml(item.step)}</td>
                      <td>
                        <div class="formula-impact-cell">
                          <div class="formula-impact"><i style="width:${pteWidth}%"></i></div>
                          <strong>${formatSigned(item.pteDelta, 1)}</strong>
                        </div>
                      </td>
                      <td>
                        <div class="formula-impact-cell">
                          <div class="formula-impact formula-impact--risk"><i style="width:${ptcWidth}%"></i></div>
                          <strong>${formatSigned(item.ptcDelta, 1)}</strong>
                        </div>
                      </td>
                      <td>${escapeHtml(item.why)}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
        <div class="callout">
          <strong>Top PtE lever:</strong> ${escapeHtml(strongestPteLever?.label || 'N/A')} (${formatSigned(strongestPteLever?.pteDelta || 0, 1)}).<br>
          <strong>Top PtC pressure lever:</strong> ${escapeHtml(strongestPtcPressure?.label || 'N/A')} (${formatSigned(
            strongestPtcPressure?.ptcDelta || 0,
            1
          )}).
        </div>
      </article>
      <article class="card compact-card">
        <div class="metric-head">
          <h3>Band Target Guidance</h3>
          ${statusChip({ label: 'Action translation', tone: 'warn' })}
        </div>
        <div class="grid-cards">
          <article class="card compact-card">
            <div class="metric-head">
              <h4>Move PtE upward</h4>
              ${statusChip({ label: `Gap ${targetGuidance.pte.gap}`, tone: targetGuidance.pte.gap > 0 ? 'warn' : 'good' })}
            </div>
            ${
              targetGuidance.pte.gap > 0 && targetGuidance.pte.bestLever
                ? `<p class="muted">
                    Need about <strong>${targetGuidance.pte.gap}</strong> points to reach PtE High (70).<br>
                    Best current lever: <strong>${escapeHtml(targetGuidance.pte.bestLever.label)}</strong> (${formatSigned(
                      targetGuidance.pte.bestLever.pteDelta,
                      1
                    )} per probe).<br>
                    Rough effort: repeat equivalent uplift <strong>${targetGuidance.pte.repeats}x</strong>.
                  </p>`
                : '<p class="muted">PtE already High. Maintain momentum and protect engagement quality.</p>'
            }
          </article>
          <article class="card compact-card">
            <div class="metric-head">
              <h4>Reduce PtC pressure</h4>
              ${statusChip({ label: `Gap ${targetGuidance.ptc.gap}`, tone: targetGuidance.ptc.gap > 0 ? 'risk' : 'good' })}
            </div>
            ${
              targetGuidance.ptc.gap > 0 && targetGuidance.ptc.bestLever
                ? `<p class="muted">
                    Need about <strong>${targetGuidance.ptc.gap}</strong> points down to exit current PtC band.<br>
                    Strongest reduction lever: <strong>${escapeHtml(targetGuidance.ptc.bestLever.label)}</strong> (${formatSigned(
                      targetGuidance.ptc.bestLever.ptcDelta,
                      1
                    )} per probe).<br>
                    Rough effort: repeat equivalent mitigation <strong>${targetGuidance.ptc.repeats}x</strong>.
                  </p>`
                : '<p class="muted">PtC already Low. Keep renewal and engagement protections in place to prevent drift.</p>'
            }
          </article>
        </div>
      </article>
      <article class="card compact-card">
        <div class="metric-head">
          <h3>Rule Activation Delta vs Baseline</h3>
          ${statusChip({ label: 'Why score changed', tone: 'neutral' })}
        </div>
        <p class="muted">
          This compares adjustment rules against portfolio baseline defaults. Use it to explain exactly which triggers moved PtE/PtC.
        </p>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Metric</th>
                <th>Baseline</th>
                <th>Current</th>
                <th>Points</th>
                <th>Why it matters</th>
              </tr>
            </thead>
            <tbody>
              ${currentRules
                .map((rule) => {
                  const baselineRule = baselineRuleById.get(rule.id);
                  const baselineActive = Boolean(baselineRule?.active);
                  const currentActive = Boolean(rule.active);
                  const stateTone = currentActive ? (Number(rule.points || 0) >= 0 ? 'good' : 'risk') : 'neutral';
                  return `
                    <tr>
                      <td><strong>${escapeHtml(rule.label)}</strong></td>
                      <td>${escapeHtml(rule.metric)}</td>
                      <td>${statusChip({ label: baselineActive ? 'Active' : 'Inactive', tone: baselineActive ? 'warn' : 'neutral' })}</td>
                      <td>${statusChip({ label: currentActive ? 'Active' : 'Inactive', tone: stateTone })}</td>
                      <td>${formatSigned(rule.points, 1)}</td>
                      <td>${escapeHtml(rule.why)}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </article>
    `;
  };

  const readFormulaPlanSelection = () => {
    const actions = [...wrapper.querySelectorAll('input[name="planAction"]:checked')].map((input) => String(input.value || '').trim());
    const cycleField = wrapper.querySelector('input[name="planCycles"]');
    const cyclesRaw = cycleField && 'value' in cycleField ? Number(cycleField.value) : 3;
    const cycles = Number.isFinite(cyclesRaw) ? Math.max(1, Math.min(6, Math.floor(cyclesRaw))) : 3;
    if (cycleField && 'value' in cycleField) cycleField.value = String(cycles);
    return { actions, cycles };
  };

  const setFormulaPlanSelection = (actions = [], cycles = 3) => {
    const selected = new Set([...(actions || [])].map((item) => String(item || '').trim()));
    wrapper.querySelectorAll('input[name="planAction"]').forEach((input) => {
      if ('checked' in input) input.checked = selected.has(String(input.value || '').trim());
    });
    const cycleField = wrapper.querySelector('input[name="planCycles"]');
    const safeCycles = Number.isFinite(Number(cycles)) ? Math.max(1, Math.min(6, Math.floor(Number(cycles)))) : 3;
    if (cycleField && 'value' in cycleField) cycleField.value = String(safeCycles);
  };

  const readFormulaPlanGoal = () => {
    const goalField = wrapper.querySelector('select[name="planGoal"]');
    const value = goalField && 'value' in goalField ? String(goalField.value || 'balanced') : 'balanced';
    return ['balanced', 'retention', 'expansion'].includes(value) ? value : 'balanced';
  };

  const normalizeFormulaScenarioInput = (state = {}) => calculateFormulaSandbox(state).inputs;

  const renderFormulaCompareOutput = () => {
    if (!formulaCompareOutput) return;
    if (!formulaCompareA && !formulaCompareB) {
      formulaCompareOutput.innerHTML =
        '<p class="empty-text">Save scenario A and B to compare inputs and PtE/PtC outcomes side-by-side.</p>';
      return;
    }

    const scenarioA = formulaCompareA ? calculateFormulaSandbox(formulaCompareA) : null;
    const scenarioB = formulaCompareB ? calculateFormulaSandbox(formulaCompareB) : null;

    if (!scenarioA || !scenarioB) {
      const partial = scenarioA || scenarioB;
      const label = scenarioA ? 'A' : 'B';
      formulaCompareOutput.innerHTML = `
        <article class="card compact-card">
          <div class="metric-head">
            <h3>Scenario ${label} saved</h3>
            ${statusChip({ label: 'Need both A and B', tone: 'warn' })}
          </div>
          <div class="metric-grid kpi-4">
            ${metricTile({ label: `Scenario ${label} PtE`, value: `${partial?.pte?.final || 0} (${partial?.pte?.band || 'Low'})`, tone: partial?.pte?.band === 'High' ? 'good' : partial?.pte?.band === 'Medium' ? 'warn' : 'neutral' })}
            ${metricTile({ label: `Scenario ${label} PtC`, value: `${partial?.ptc?.final || 0} (${partial?.ptc?.band || 'Low'})`, tone: partial?.ptc?.band === 'High' ? 'risk' : partial?.ptc?.band === 'Medium' ? 'warn' : 'good' })}
          </div>
          <p class="muted">Save the other scenario to unlock side-by-side delta analysis.</p>
          <div class="form-actions">
            <button class="ghost-btn" type="button" data-formula-load="${label}">Load scenario ${label} into sandbox</button>
          </div>
        </article>
      `;
      return;
    }

    const boolLabel = (value) => (value ? 'Yes' : 'No');
    const diffFields = [
      { key: 'adoptionScore', label: 'Adoption score' },
      { key: 'engagementScore', label: 'Engagement score' },
      { key: 'riskScore', label: 'Risk score' },
      { key: 'cicdPercent', label: 'CI/CD adoption %' },
      { key: 'securityPercent', label: 'Security adoption %' },
      { key: 'stageCoveragePercent', label: 'Stage coverage %' },
      { key: 'openExpansionCount', label: 'Open expansion count' },
      { key: 'renewalDays', label: 'Renewal days' },
      { key: 'renewalSoonSignal', label: 'Renewal signal active', boolean: true },
      { key: 'staleEngagement90', label: 'No-touch > 90 days', boolean: true },
      { key: 'secureBelow30', label: 'Security < 30%', boolean: true },
      { key: 'strongMomentum', label: 'Strong momentum', boolean: true }
    ];
    const pteDelta = round1(Number(scenarioB.pte.final || 0) - Number(scenarioA.pte.final || 0));
    const ptcDelta = round1(Number(scenarioB.ptc.final || 0) - Number(scenarioA.ptc.final || 0));

    formulaCompareOutput.innerHTML = `
      <article class="card compact-card">
        <div class="metric-head">
          <h3>Scenario Compare (B - A)</h3>
          ${statusChip({ label: 'What-if delta', tone: 'neutral' })}
        </div>
        <div class="metric-grid kpi-4">
          ${metricTile({ label: 'Scenario A PtE/PtC', value: `${scenarioA.pte.final}/${scenarioA.ptc.final}`, tone: 'neutral' })}
          ${metricTile({ label: 'Scenario B PtE/PtC', value: `${scenarioB.pte.final}/${scenarioB.ptc.final}`, tone: 'neutral' })}
          ${metricTile({ label: 'PtE delta', value: formatSigned(pteDelta, 1), tone: pteDelta > 0 ? 'good' : pteDelta < 0 ? 'warn' : 'neutral' })}
          ${metricTile({ label: 'PtC delta', value: formatSigned(ptcDelta, 1), tone: ptcDelta < 0 ? 'good' : ptcDelta > 0 ? 'risk' : 'neutral' })}
        </div>
        <div class="form-actions">
          <button class="ghost-btn" type="button" data-formula-load="A">Load scenario A into sandbox</button>
          <button class="ghost-btn" type="button" data-formula-load="B">Load scenario B into sandbox</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Input</th>
                <th>Scenario A</th>
                <th>Scenario B</th>
                <th>Delta (B - A)</th>
              </tr>
            </thead>
            <tbody>
              ${diffFields
                .map((field) => {
                  const left = scenarioA.inputs[field.key];
                  const right = scenarioB.inputs[field.key];
                  const delta = field.boolean ? (left === right ? 'No change' : `${boolLabel(left)} -> ${boolLabel(right)}`) : formatSigned(round1(Number(right || 0) - Number(left || 0)), 1);
                  return `
                    <tr>
                      <td><strong>${escapeHtml(field.label)}</strong></td>
                      <td>${field.boolean ? boolLabel(Boolean(left)) : Number(left)}</td>
                      <td>${field.boolean ? boolLabel(Boolean(right)) : Number(right)}</td>
                      <td>${delta}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </article>
    `;
  };

  const renderFormulaPlanProjection = () => {
    if (!formulaPlanOutput) return;
    const selection = readFormulaPlanSelection();
    const goal = readFormulaPlanGoal();
    if (!selection.actions.length) {
      formulaPlanOutput.innerHTML = '<p class="empty-text">Select at least one play to run projection.</p>';
      lastFormulaPlanProjection = null;
      lastFormulaPlanSelection = null;
      lastFormulaPlanGoal = goal;
      return;
    }
    const projection = calculateFormulaPlanProjection(readFormulaSandboxState(), selection.actions, selection.cycles);
    lastFormulaPlanProjection = projection;
    lastFormulaPlanSelection = selection;
    lastFormulaPlanGoal = goal;
    const baseline = projection.baseline;
    const projected = projection.projected;
    const pteDelta = round1(Number(projected.pte.final || 0) - Number(baseline.pte.final || 0));
    const ptcDelta = round1(Number(projected.ptc.final || 0) - Number(baseline.ptc.final || 0));
    const pteHistoryPoints = projection.history.map((item) => ({
      label: item.step === 'Baseline' ? 'Base' : `C${item.cycle}`,
      value: Number(item.scenario?.pte?.final || 0)
    }));
    const ptcHistoryPoints = projection.history.map((item) => ({
      label: item.step === 'Baseline' ? 'Base' : `C${item.cycle}`,
      value: Number(item.scenario?.ptc?.final || 0)
    }));

    formulaPlanOutput.innerHTML = `
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Projected PtE', value: `${projected.pte.final} (${projected.pte.band})`, tone: projected.pte.band === 'High' ? 'good' : projected.pte.band === 'Medium' ? 'warn' : 'neutral' })}
        ${metricTile({ label: 'Projected PtC', value: `${projected.ptc.final} (${projected.ptc.band})`, tone: projected.ptc.band === 'High' ? 'risk' : projected.ptc.band === 'Medium' ? 'warn' : 'good' })}
        ${metricTile({ label: 'PtE movement', value: formatSigned(pteDelta, 1), tone: pteDelta > 0 ? 'good' : pteDelta < 0 ? 'warn' : 'neutral' })}
        ${metricTile({ label: 'PtC movement', value: formatSigned(ptcDelta, 1), tone: ptcDelta < 0 ? 'good' : ptcDelta > 0 ? 'risk' : 'neutral' })}
      </div>
      <div class="callout">
        <strong>Sequence:</strong> ${projection.actions.map((action) => escapeHtml(action)).join(' → ')}<br>
        <strong>Cycles:</strong> ${projection.cycles} | <strong>Interpretation:</strong> ${
          pteDelta > 0 && ptcDelta <= 0
            ? 'Projected posture improves for both expansion readiness and retention stability.'
            : pteDelta <= 0 && ptcDelta > 0
              ? 'Projected posture deteriorates; reconsider play mix or execution order.'
              : 'Projected outcome is mixed; pair risk reduction with adoption/engagement lifts.'
        }
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Step</th>
              <th>PtE</th>
              <th>PtC</th>
              <th>PtE vs baseline</th>
              <th>PtC vs baseline</th>
            </tr>
          </thead>
          <tbody>
            ${projection.history
              .map((item) => {
                const pteValue = Number(item.scenario?.pte?.final || 0);
                const ptcValue = Number(item.scenario?.ptc?.final || 0);
                return `
                  <tr>
                    <td><strong>${escapeHtml(item.step)}</strong></td>
                    <td>${statusChip({ label: `${pteValue} (${item.scenario?.pte?.band || 'Low'})`, tone: item.scenario?.pte?.band === 'High' ? 'good' : item.scenario?.pte?.band === 'Medium' ? 'warn' : 'neutral' })}</td>
                    <td>${statusChip({ label: `${ptcValue} (${item.scenario?.ptc?.band || 'Low'})`, tone: item.scenario?.ptc?.band === 'High' ? 'risk' : item.scenario?.ptc?.band === 'Medium' ? 'warn' : 'good' })}</td>
                    <td>${formatSigned(round1(pteValue - Number(baseline.pte.final || 0)), 1)}</td>
                    <td>${formatSigned(round1(ptcValue - Number(baseline.ptc.final || 0)), 1)}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="grid-cards">
        <article class="card compact-card">
          <div class="metric-head">
            <h3>Projected PtE trajectory</h3>
            ${statusChip({ label: `Δ ${formatSigned(pteDelta, 1)}`, tone: pteDelta > 0 ? 'good' : pteDelta < 0 ? 'warn' : 'neutral' })}
          </div>
          <div class="chart-wrap">
            ${lineChartSvg(pteHistoryPoints, { width: 420, height: 220 })}
          </div>
        </article>
        <article class="card compact-card">
          <div class="metric-head">
            <h3>Projected PtC trajectory</h3>
            ${statusChip({ label: `Δ ${formatSigned(ptcDelta, 1)}`, tone: ptcDelta < 0 ? 'good' : ptcDelta > 0 ? 'risk' : 'neutral' })}
          </div>
          <div class="chart-wrap">
            ${lineChartSvg(ptcHistoryPoints, { width: 420, height: 220 })}
          </div>
        </article>
      </div>
    `;
  };

  const renderFormulaPlanRecommendation = () => {
    if (!formulaPlanRecommendation) return;
    const goal = readFormulaPlanGoal();
    const ranked = recommendProjectionPresets(readFormulaSandboxState(), formulaPlanPresets, goal).slice(0, 3);
    if (!ranked.length) {
      formulaPlanRecommendation.innerHTML = '<p class="empty-text">No presets available for recommendation.</p>';
      return;
    }
    formulaPlanRecommendation.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Preset</th>
              <th>Fit score</th>
              <th>Projected PtE</th>
              <th>Projected PtC</th>
              <th>Delta (PtE / PtC)</th>
              <th>Why recommended</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${ranked
              .map(
                (item) => `
                  <tr>
                    <td><strong>${escapeHtml(item.label)}</strong><br><span class="muted">${escapeHtml(item.note)}</span></td>
                    <td>${statusChip({ label: `${item.score}`, tone: Number(item.score || 0) >= 70 ? 'good' : Number(item.score || 0) >= 50 ? 'warn' : 'neutral' })}</td>
                    <td>${statusChip({ label: `${item.projection.projected.pte.final} (${item.projection.projected.pte.band})`, tone: item.projection.projected.pte.band === 'High' ? 'good' : item.projection.projected.pte.band === 'Medium' ? 'warn' : 'neutral' })}</td>
                    <td>${statusChip({ label: `${item.projection.projected.ptc.final} (${item.projection.projected.ptc.band})`, tone: item.projection.projected.ptc.band === 'High' ? 'risk' : item.projection.projected.ptc.band === 'Medium' ? 'warn' : 'good' })}</td>
                    <td>${formatSigned(item.pteDelta, 1)} / ${formatSigned(item.ptcDelta, 1)}</td>
                    <td>${escapeHtml(item.rationale)}</td>
                    <td><button class="ghost-btn" type="button" data-apply-plan-preset="${item.id}">Apply</button></td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  if (formulaSandboxForm instanceof HTMLFormElement) {
    formulaSandboxForm.addEventListener('input', () => renderFormulaSandboxOutput());
    formulaSandboxForm.addEventListener('change', () => renderFormulaSandboxOutput());
    renderFormulaSandboxOutput();
  }

  renderFormulaCompareOutput();

  const applyFormulaSandboxAction = (actionId) => {
    const clampPct = (value) => Math.max(0, Math.min(100, Number(value || 0)));
    const current = readFormulaSandboxState();
    const next = { ...current };

    if (actionId === 'recover-engagement') {
      next.engagementScore = clampPct(next.engagementScore + 12);
      next.staleEngagement90 = false;
    } else if (actionId === 'secure-rollout') {
      next.securityPercent = clampPct(next.securityPercent + 20);
      next.riskScore = clampPct(next.riskScore - 8);
    } else if (actionId === 'reduce-risk') {
      next.riskScore = clampPct(next.riskScore - 15);
      next.engagementScore = clampPct(next.engagementScore + 4);
    } else if (actionId === 'renewal-escalation') {
      next.renewalDays = Math.max(0, Number(next.renewalDays || 0) - 60);
      next.renewalSoonSignal = true;
    } else if (actionId === 'expansion-proof') {
      next.adoptionScore = clampPct(next.adoptionScore + 10);
      next.engagementScore = clampPct(next.engagementScore + 8);
      next.openExpansionCount = Math.max(0, Number(next.openExpansionCount || 0) + 2);
      next.riskScore = clampPct(next.riskScore - 5);
    } else {
      return;
    }

    next.secureBelow30 = next.securityPercent < 30;
    next.renewalSoonSignal = next.renewalSoonSignal || Number(next.renewalDays || 0) <= 90;
    next.strongMomentum = next.adoptionScore >= 70 && next.engagementScore >= 70 && next.riskScore <= 35;
    if (Number(next.engagementScore || 0) >= 50) next.staleEngagement90 = false;

    setFormulaSandboxState(next);
    renderFormulaSandboxOutput();
  };

  formulaSandboxReset?.addEventListener('click', () => {
    setFormulaSandboxState(formulaSandboxBaseline);
    renderFormulaSandboxOutput();
    notify?.('Formula sandbox reset to portfolio baseline.');
  });

  formulaSaveA?.addEventListener('click', () => {
    formulaCompareA = normalizeFormulaScenarioInput(readFormulaSandboxState());
    renderFormulaCompareOutput();
    notify?.('Scenario A saved.');
  });

  formulaSaveB?.addEventListener('click', () => {
    formulaCompareB = normalizeFormulaScenarioInput(readFormulaSandboxState());
    renderFormulaCompareOutput();
    notify?.('Scenario B saved.');
  });

  formulaCompareClear?.addEventListener('click', () => {
    formulaCompareA = null;
    formulaCompareB = null;
    renderFormulaCompareOutput();
    notify?.('Scenario compare cleared.');
  });

  formulaSandboxActions.forEach((button) => {
    button.addEventListener('click', () => {
      const actionId = button.getAttribute('data-formula-sandbox-action');
      if (!actionId) return;
      applyFormulaSandboxAction(actionId);
      const label = String(button.textContent || 'play simulation').trim();
      notify?.(`${label} applied.`);
    });
  });

  formulaCompareOutput?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const loadButton = event.target.closest('[data-formula-load]');
    if (!loadButton) return;
    const slot = String(loadButton.getAttribute('data-formula-load') || '').trim();
    const source = slot === 'A' ? formulaCompareA : slot === 'B' ? formulaCompareB : null;
    if (!source) return;
    setFormulaSandboxState(source);
    renderFormulaSandboxOutput();
    notify?.(`Loaded scenario ${slot} into sandbox.`);
  });

  formulaPlanRun?.addEventListener('click', () => {
    renderFormulaPlanProjection();
    notify?.('Play sequence projection updated.');
  });

  formulaPlanClear?.addEventListener('click', () => {
    wrapper.querySelectorAll('input[name="planAction"]').forEach((input) => {
      if ('checked' in input) input.checked = false;
    });
    const cycleField = wrapper.querySelector('input[name="planCycles"]');
    if (cycleField && 'value' in cycleField) cycleField.value = '3';
    if (formulaPlanOutput) formulaPlanOutput.innerHTML = '<p class="empty-text">Run a play sequence projection to compare baseline vs projected PtE/PtC.</p>';
    notify?.('Projection selection cleared.');
  });

  formulaPlanPresetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const presetId = String(button.getAttribute('data-formula-plan-preset') || '').trim();
      const preset = formulaPlanPresets.find((item) => item.id === presetId);
      if (!preset) return;
      setFormulaPlanSelection(preset.actions, preset.cycles);
      renderFormulaPlanProjection();
      notify?.(`Preset applied: ${preset.label}`);
    });
  });

  formulaPlanRecommend?.addEventListener('click', () => {
    renderFormulaPlanRecommendation();
    notify?.('Preset recommendation updated.');
  });

  formulaPlanRecommendation?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const applyButton = event.target.closest('[data-apply-plan-preset]');
    if (!applyButton) return;
    const presetId = String(applyButton.getAttribute('data-apply-plan-preset') || '').trim();
    const preset = formulaPlanPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setFormulaPlanSelection(preset.actions, preset.cycles);
    renderFormulaPlanProjection();
    notify?.(`Recommended preset applied: ${preset.label}`);
  });

  formulaPlanDownload?.addEventListener('click', () => {
    if (!lastFormulaPlanProjection || !lastFormulaPlanSelection) {
      notify?.('Run a projection first, then download the summary.');
      return;
    }
    const markdown = buildProjectionMarkdown({
      generatedOn: new Date().toISOString(),
      goal: lastFormulaPlanGoal,
      selection: lastFormulaPlanSelection,
      projection: lastFormulaPlanProjection
    });
    triggerDownload(`pte-ptc-projection-${toIsoDate(new Date())}.md`, markdown, 'text/markdown;charset=utf-8');
    notify?.('Projection markdown downloaded.');
  });

  const playWizardForm = wrapper.querySelector('[data-play-wizard-form]');
  const playWizardOutput = wrapper.querySelector('[data-play-wizard-output]');

  const applyWizardPreset = (preset = {}) => {
    if (!(playWizardForm instanceof HTMLFormElement)) return;
    const set = (name, value) => {
      const field = playWizardForm.elements.namedItem(name);
      if (field && 'value' in field && value !== undefined && value !== null) field.value = String(value);
    };
    set('triggerCode', preset.triggerCode || '');
    set('pteBand', preset.pteBand || 'Low');
    set('ptcBand', preset.ptcBand || 'Medium');
    set('renewalDays', Number(preset.renewalDays ?? 999));
    set('confidenceScore', Number(preset.confidenceScore ?? 70));
  };

  const setWizardValuesFromAccount = (customerId) => {
    if (!(playWizardForm instanceof HTMLFormElement)) return;
    const row = rows.find((item) => item.customer.id === customerId);
    if (!row) return;
    const trigger = normalizeCode((row.riskSignals || [])[0]?.code || '');
    const confidence = confidenceById.get(customerId);
    applyWizardPreset({
      triggerCode: trigger || '',
      pteBand: row.pteBand || 'Low',
      ptcBand: row.ptcBand || 'Medium',
      renewalDays: Number(row.renewalDays ?? 999),
      confidenceScore: Number(confidence?.score ?? 70)
    });
  };

  const loadScenarioIntoWizard = (scenarioId) => {
    const scenario = scenarioTemplates.find((item) => item.id === scenarioId);
    if (!scenario) return;
    if (!(playWizardForm instanceof HTMLFormElement)) return;
    const accountField = playWizardForm.elements.namedItem('accountId');
    if (accountField && 'value' in accountField) accountField.value = '';
    applyWizardPreset(scenario);
    const input = getWizardInput();
    const recommendation = renderWizardOutput(input);
    lastWizardRun = { input, recommendation };
    const section = wrapper.querySelector('#section-play-wizard');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    notify?.(`Scenario loaded: ${scenario.title}`);
  };

  const getWizardInput = () => {
    if (!(playWizardForm instanceof HTMLFormElement)) {
      return { triggerCode: '', pteBand: 'Low', ptcBand: 'Medium', renewalDays: 999, confidenceScore: 70 };
    }
    const read = (name) => String(playWizardForm.elements.namedItem(name)?.value || '').trim();
    return {
      accountId: read('accountId'),
      triggerCode: read('triggerCode'),
      pteBand: read('pteBand') || 'Low',
      ptcBand: read('ptcBand') || 'Medium',
      renewalDays: Number(read('renewalDays') || 999),
      confidenceScore: Number(read('confidenceScore') || 70)
    };
  };

  const renderWizardOutput = (input) => {
    if (!playWizardOutput) return;
    const recommendation = recommendPlays(input);
    playWizardOutput.innerHTML = `
      <section class="grid-cards">
        <article class="card compact-card">
          <div class="metric-head">
            <h3>Primary play</h3>
            ${statusChip({ label: recommendation.window, tone: 'warn' })}
          </div>
          <p><strong>${recommendation.primary.title}</strong></p>
          <p class="muted">${recommendation.primary.why}</p>
          <p class="muted"><strong>First step:</strong> ${recommendation.primary.firstStep}</p>
        </article>
        <article class="card compact-card">
          <div class="metric-head">
            <h3>Secondary play</h3>
            ${statusChip({ label: recommendation.reviewCadence, tone: 'neutral' })}
          </div>
          <p><strong>${recommendation.secondary.title}</strong></p>
          <p class="muted">${recommendation.secondary.why}</p>
          <p class="muted"><strong>First step:</strong> ${recommendation.secondary.firstStep}</p>
        </article>
      </section>
      <div class="callout">
        <strong>Success metric:</strong> ${recommendation.successMetric}<br>
        <strong>Confidence note:</strong> ${recommendation.confidenceNote}
      </div>
      <div class="form-actions">
        <button class="ghost-btn" type="button" data-log-play-run>Log play run</button>
      </div>
    `;
    return recommendation;
  };

  if (playWizardForm instanceof HTMLFormElement) {
    playWizardForm.elements.namedItem('accountId')?.addEventListener('change', (event) => {
      const customerId = String(event?.target?.value || '');
      if (!customerId) return;
      setWizardValuesFromAccount(customerId);
    });
  }

  wrapper.querySelector('[data-run-play-wizard]')?.addEventListener('click', () => {
    const input = getWizardInput();
    const recommendation = renderWizardOutput(input);
    lastWizardRun = { input, recommendation };
    notify?.('Play recommendation generated.');
  });

  const readinessForm = wrapper.querySelector('[data-readiness-form]');
  const readinessStatus = wrapper.querySelector('[data-readiness-status]');
  const requiredChecklistItems = (value) => {
    const state = value || defaultChecklist();
    return [
      { label: 'Owner assigned', complete: Boolean(String(state.owner || '').trim()) },
      { label: 'Due date set', complete: Boolean(String(state.dueDate || '').trim()) },
      { label: 'Success metric defined', complete: Boolean(String(state.successMetric || '').trim()) },
      { label: 'Next touch scheduled', complete: Boolean(String(state.nextTouchDate || '').trim()) }
    ];
  };

  const checklistStateFromForm = () => {
    if (!(readinessForm instanceof HTMLFormElement)) return defaultChecklist();
    const read = (name) => String(readinessForm.elements.namedItem(name)?.value || '').trim();
    return {
      playName: read('playName'),
      owner: read('owner'),
      dueDate: read('dueDate'),
      successMetric: read('successMetric'),
      nextTouchDate: read('nextTouchDate')
    };
  };

  const renderReadinessStatus = (value) => {
    if (!readinessStatus) return;
    const items = requiredChecklistItems(value);
    const completeCount = items.filter((item) => item.complete).length;
    readinessStatus.innerHTML = `
      ${items
        .map((item) => statusChip({ label: item.label, tone: item.complete ? 'good' : 'warn', icon: item.complete }))
        .join('')}
      ${statusChip({
        label: `${completeCount}/4 ready`,
        tone: completeCount === 4 ? 'good' : completeCount >= 2 ? 'warn' : 'risk'
      })}
    `;
  };

  renderReadinessStatus(checklist);

  readinessForm?.addEventListener('input', () => {
    renderReadinessStatus(checklistStateFromForm());
  });

  wrapper.querySelector('[data-save-readiness]')?.addEventListener('click', () => {
    const next = checklistStateFromForm();
    saveChecklist(next);
    renderReadinessStatus(next);
    notify?.('Playbook readiness checklist saved.');
  });

  wrapper.querySelector('[data-reset-readiness]')?.addEventListener('click', () => {
    const reset = defaultChecklist();
    if (readinessForm instanceof HTMLFormElement) {
      ['playName', 'owner', 'dueDate', 'successMetric', 'nextTouchDate'].forEach((name) => {
        const field = readinessForm.elements.namedItem(name);
        if (field && 'value' in field) field.value = '';
      });
    }
    saveChecklist(reset);
    renderReadinessStatus(reset);
    notify?.('Playbook readiness checklist reset.');
  });

  wrapper.querySelectorAll('[data-download-guide]').forEach((button) => {
    button.addEventListener('click', () => {
      triggerDownload(`pte-ptc-guide-${toIsoDate(new Date())}.md`, guideMarkdown, 'text/markdown;charset=utf-8');
      notify?.('PtE/PtC guide markdown downloaded.');
    });
  });
  wrapper.querySelectorAll('[data-download-queue]').forEach((button) => {
    button.addEventListener('click', () => {
      triggerDownload(`pte-ptc-action-queue-${toIsoDate(new Date())}.md`, queueMarkdown, 'text/markdown;charset=utf-8');
      notify?.('PtE/PtC weekly action queue downloaded.');
    });
  });
  wrapper.querySelectorAll('[data-download-mitigation]').forEach((button) => {
    button.addEventListener('click', () => {
      triggerDownload(`pte-ptc-mitigation-coverage-${toIsoDate(new Date())}.md`, mitigationMarkdown, 'text/markdown;charset=utf-8');
      notify?.('PtE/PtC mitigation coverage downloaded.');
    });
  });
  wrapper.querySelectorAll('[data-download-exec-brief]').forEach((button) => {
    button.addEventListener('click', () => {
      triggerDownload(`pte-ptc-exec-brief-${toIsoDate(new Date())}.md`, executiveBriefMarkdown, 'text/markdown;charset=utf-8');
      notify?.('PtE/PtC executive brief downloaded.');
    });
  });
  wrapper.querySelector('[data-print-guide]')?.addEventListener('click', () => {
    const opened = openPrintWindow('PtE / PtC Operator Guide', guideMarkdown);
    if (!opened) {
      notify?.('Popup blocked. Enable popups to print guide.');
      return;
    }
    notify?.('Print dialog opened for PtE/PtC guide.');
  });

  return wrapper;
};

export const propensityCommandEntries = () => [
  { id: 'propensity-open', label: 'Open PtE / PtC Guide', meta: 'Reference', action: { route: 'propensity' } }
];
