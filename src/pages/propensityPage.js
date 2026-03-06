import { pageHeader } from '../components/pageHeader.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip } from '../components/statusChip.js';
import { barChartSvg, donutChartSvg, lineChartSvg } from '../lib/charts.js';
import { toIsoDate } from '../lib/date.js';
import { triggerDownload } from '../lib/exports.js';

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
  const weeklyQueue = buildWeeklyActionQueue(rows, confidenceById);
  const mitigationSummary = buildMitigationCoverage(rows, workspace, confidenceById);
  const bandMatrix = buildBandMatrix(rows);

  const accountOptions = rows
    .map((row) => `<option value="${row.customer.id}">${escapeHtml(row.customer.name)}</option>`)
    .join('');

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

  wrapper.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const scenarioButton = event.target.closest('[data-load-scenario]');
    if (scenarioButton) {
      event.preventDefault();
      const scenarioId = scenarioButton.getAttribute('data-load-scenario');
      if (scenarioId) loadScenarioIntoWizard(scenarioId);
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
    renderWizardOutput(input);
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
    `;
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
    renderWizardOutput(input);
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

  wrapper.querySelector('[data-download-guide]')?.addEventListener('click', () => {
    triggerDownload(`pte-ptc-guide-${toIsoDate(new Date())}.md`, guideMarkdown, 'text/markdown;charset=utf-8');
    notify?.('PtE/PtC guide markdown downloaded.');
  });
  wrapper.querySelector('[data-download-queue]')?.addEventListener('click', () => {
    triggerDownload(`pte-ptc-action-queue-${toIsoDate(new Date())}.md`, queueMarkdown, 'text/markdown;charset=utf-8');
    notify?.('PtE/PtC weekly action queue downloaded.');
  });
  wrapper.querySelector('[data-download-mitigation]')?.addEventListener('click', () => {
    triggerDownload(`pte-ptc-mitigation-coverage-${toIsoDate(new Date())}.md`, mitigationMarkdown, 'text/markdown;charset=utf-8');
    notify?.('PtE/PtC mitigation coverage downloaded.');
  });
  wrapper.querySelector('[data-download-exec-brief]')?.addEventListener('click', () => {
    triggerDownload(`pte-ptc-exec-brief-${toIsoDate(new Date())}.md`, executiveBriefMarkdown, 'text/markdown;charset=utf-8');
    notify?.('PtE/PtC executive brief downloaded.');
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
