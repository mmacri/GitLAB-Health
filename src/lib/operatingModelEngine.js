import { daysUntil, diffInDays, toIsoDate } from './date.js';

const PRIORITY_RANK = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const isMissing = (value) => value === null || value === undefined || String(value).trim() === '';

const useCaseGreenCount = (account) =>
  Object.values(account?.adoption?.use_case_scores || {}).filter((score) => Number(score) >= 75).length;

const hasValueMetricGaps = (account) => {
  const metrics = account?.outcomes?.value_metrics || {};
  const dora = metrics?.dora || {};
  return (
    isMissing(metrics.pipeline_speed) ||
    isMissing(metrics.security_coverage) ||
    Number(metrics.time_saved_hours || 0) <= 0 ||
    isMissing(dora.deployment_frequency) ||
    isMissing(dora.lead_time)
  );
};

const signalContext = (account, signal, now) => {
  const greenCount = Number(signal?.greenUseCaseCount ?? useCaseGreenCount(account));
  const health = normalize(account?.health?.overall || signal?.health || 'yellow');
  const renewalDays = Number(signal?.renewalDays ?? daysUntil(account?.renewal_date, now) ?? 999);
  const lastTouchGap = Number(signal?.touchStaleDays ?? diffInDays(account?.engagement?.last_touch_date, now) ?? 999);
  const adoptionScore = Number(account?.adoption?.platform_adoption_score || 0);
  const validationStatus = normalize(account?.outcomes?.validation_status);
  const nextEbrDays = Number(signal?.nextEbrDays ?? daysUntil(account?.engagement?.next_ebr_date, now) ?? 999);
  const objectiveRiskCount = (account?.outcomes?.objectives || []).filter((item) => normalize(item.status) === 'at_risk').length;

  return {
    account_id: account?.id || '',
    account_name: account?.name || 'Account',
    health_overall: health || 'unknown',
    health_is_yellow_or_red: ['yellow', 'red'].includes(health),
    renewal_days: Number.isFinite(renewalDays) ? renewalDays : 999,
    days_since_last_touch: Number.isFinite(lastTouchGap) ? lastTouchGap : 999,
    next_ebr_days: Number.isFinite(nextEbrDays) ? nextEbrDays : 999,
    use_case_green_count: greenCount,
    platform_value_score: adoptionScore,
    adoption_high: greenCount >= 3 || adoptionScore >= 75,
    value_metrics_missing: hasValueMetricGaps(account),
    executive_alignment_missing:
      validationStatus !== 'customer confirmed' || isMissing(account?.engagement?.next_ebr_date) || nextEbrDays > 120,
    objective_risk_count: objectiveRiskCount
  };
};

const operators = {
  '<': (left, right) => Number(left) < Number(right),
  '<=': (left, right) => Number(left) <= Number(right),
  '>': (left, right) => Number(left) > Number(right),
  '>=': (left, right) => Number(left) >= Number(right),
  '==': (left, right) => left === right,
  '!=': (left, right) => left !== right,
  includes: (left, right) => String(left || '').toLowerCase().includes(String(right || '').toLowerCase()),
  missing: (left) => isMissing(left),
  exists: (left) => !isMissing(left)
};

const evaluateCondition = (condition, signals) => {
  const operator = operators[condition?.operator];
  if (!operator) return false;
  const left = signals?.[condition?.key];
  if (condition?.operator === 'missing' || condition?.operator === 'exists') return operator(left);
  return operator(left, condition?.value);
};

const fillTemplate = (text, signals) =>
  String(text || '').replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key) => {
    const value = signals?.[key];
    return value === null || value === undefined ? '' : String(value);
  });

const findPlaybook = (playbooks, rule) =>
  (playbooks || []).find((playbook) => normalize(playbook.title) === normalize(rule.playbook_hint)) || null;

const findResource = (resources, rule) => {
  if (!rule?.resource?.url) return null;
  const urlKey = String(rule.resource.url).trim().toLowerCase().replace(/\/+$/, '');
  const fromRegistry = (resources || []).find(
    (item) => String(item.url || '').trim().toLowerCase().replace(/\/+$/, '') === urlKey
  );
  return fromRegistry
    ? { title: fromRegistry.title, url: fromRegistry.url }
    : { title: rule.resource.title || rule.resource.url, url: rule.resource.url };
};

const recommendationIssueTemplate = (rule, account, signals, why) => {
  const replacementScope = {
    ...signals,
    why,
    recommendation: rule.recommendation
  };
  if (rule.issue_template) return fillTemplate(rule.issue_template, replacementScope);

  return [
    `# ${rule.title}`,
    '',
    `- Account: ${account?.name || 'Account'}`,
    `- Rule ID: ${rule.id}`,
    `- Priority: ${rule.priority}`,
    '',
    '## Why now',
    why,
    '',
    '## Recommended action',
    rule.recommendation,
    '',
    '## Checklist',
    '- [ ] Confirm owner and due date',
    '- [ ] Execute playbook motion',
    '- [ ] Capture outcome evidence'
  ].join('\n');
};

export const evaluateOperatingModelEngine = ({ account, signal, rules = [], playbooks = [], resources = [], now = new Date() }) => {
  if (!account) {
    return {
      generated_on: toIsoDate(now),
      signals: {},
      recommendations: []
    };
  }

  const signals = signalContext(account, signal, now);
  const matched = (rules || [])
    .filter((rule) => Array.isArray(rule.conditions) && rule.conditions.length)
    .filter((rule) => rule.conditions.every((condition) => evaluateCondition(condition, signals)))
    .map((rule) => {
      const why = fillTemplate(rule.why_template || '', signals);
      const playbook = findPlaybook(playbooks, rule);
      const resource = findResource(resources, rule);
      return {
        id: rule.id,
        title: rule.title,
        category: rule.category,
        priority: rule.priority || 'medium',
        recommendation: rule.recommendation,
        why,
        playbook_title: playbook?.title || rule.playbook_hint || 'Open playbooks',
        playbook_route: 'playbooks',
        resource,
        issue_template: recommendationIssueTemplate(rule, account, signals, why)
      };
    })
    .sort((left, right) => (PRIORITY_RANK[normalize(right.priority)] || 0) - (PRIORITY_RANK[normalize(left.priority)] || 0));

  const deduped = [];
  const seen = new Set();
  matched.forEach((item) => {
    const key = `${normalize(item.id)}::${normalize(item.title)}::${normalize(item.recommendation)}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });

  return {
    generated_on: toIsoDate(now),
    signals,
    recommendations: deduped
  };
};
