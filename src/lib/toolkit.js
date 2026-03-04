import { formatDate, toIsoDate } from './date.js';
import { redactAccountForCustomer } from './redaction.js';

const asList = (value) =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const valueOr = (value, fallback = 'Not provided') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const accountScope = (account, customerSafe) => {
  if (!account) return null;
  return customerSafe ? redactAccountForCustomer(account) : account;
};

const useCaseSummary = (account) => {
  const scores = account?.adoption?.use_case_scores || {};
  const names = ['SCM', 'CI', 'CD', 'Secure'];
  return names.map((name) => `${name}: ${scores[name] ?? 'n/a'}`).join(' | ');
};

export const buildSuccessPlanMarkdown = ({
  account,
  lifecycleStage,
  objectives = [],
  successMetrics = [],
  initiatives = [],
  milestones = []
}) => {
  const titleAccount = account?.name || 'Selected account';
  const lines = [
    `# Customer Success Plan - ${titleAccount}`,
    '',
    `- Stage: ${valueOr(lifecycleStage || account?.lifecycle_stage)}`,
    `- Renewal Date: ${formatDate(account?.renewal_date)}`,
    `- Platform Adoption: ${valueOr(account?.adoption?.platform_adoption_level)}`,
    '',
    '## Objectives',
    ...(objectives.length ? objectives.map((item) => `- [ ] ${item}`) : ['- [ ] Define objective']),
    '',
    '## Success Metrics',
    ...(successMetrics.length ? successMetrics.map((item) => `- ${item}`) : ['- Metric not defined']),
    '',
    '## Initiatives',
    ...(initiatives.length ? initiatives.map((item) => `- ${item}`) : ['- Initiative not defined']),
    '',
    '## Milestones',
    ...(milestones.length
      ? milestones.map((item) => `- ${valueOr(item.date)}: ${valueOr(item.description)}`)
      : ['- Milestones pending']),
    '',
    '## Notes',
    '- Keep outcomes tied to measurable adoption and business value.'
  ];
  return lines.join('\n');
};

export const buildExecutiveSnapshotMarkdown = ({ account, nextSteps = [], customerSafe = true }) => {
  const scoped = accountScope(account, customerSafe);
  const valueMetrics = scoped?.outcomes?.value_metrics || {};
  const lines = [
    `# Executive Adoption Snapshot - ${valueOr(scoped?.name, 'Account')}`,
    '',
    `- Segment: ${valueOr(scoped?.segment)}`,
    `- Lifecycle Stage: ${valueOr(scoped?.lifecycle_stage || scoped?.health?.lifecycle_stage)}`,
    `- Renewal Date: ${formatDate(scoped?.renewal_date)}`,
    `- Health: ${valueOr(scoped?.health?.overall)}`,
    '',
    '## Adoption',
    `- ${valueOr(scoped?.adoption?.platform_adoption_level)}`,
    `- ${useCaseSummary(scoped)}`,
    '',
    '## Outcomes',
    `- Time saved: ${valueOr(valueMetrics.time_saved_hours, 'n/a')} hours`,
    `- Pipeline speed: ${valueOr(valueMetrics.pipeline_speed)}`,
    `- Security coverage: ${valueOr(valueMetrics.security_coverage)}`,
    '',
    '## Next Steps',
    ...(nextSteps.length ? nextSteps.map((item) => `- ${item}`) : ['- Confirm next technical enablement motion'])
  ];
  return lines.join('\n');
};

export const buildWorkshopPlanMarkdown = ({
  account,
  workshopType,
  audienceRoles = [],
  prerequisites = []
}) => {
  const type = valueOr(workshopType, 'Platform Foundations');
  const lines = [
    `# Workshop Plan - ${type}`,
    '',
    `- Account: ${valueOr(account?.name, 'General')}`,
    `- Date: ${toIsoDate(new Date())}`,
    '',
    '## Audience',
    ...(audienceRoles.length ? audienceRoles.map((item) => `- ${item}`) : ['- Engineering leads']),
    '',
    '## Agenda',
    '- 00:00-00:10 Outcome alignment and success criteria',
    '- 00:10-00:35 Hands-on implementation walkthrough',
    '- 00:35-00:50 Troubleshooting and optimization',
    '- 00:50-01:00 Commitments, owners, and follow-up',
    '',
    '## Prerequisites',
    ...(prerequisites.length ? prerequisites.map((item) => `- [ ] ${item}`) : ['- [ ] Access and permissions confirmed']),
    '',
    '## Follow-up Actions',
    '- [ ] Share recap and implementation checklist',
    '- [ ] Log adoption delta after 2 weeks',
    '- [ ] Route blockers into collaboration issue'
  ];
  return lines.join('\n');
};

export const buildRenewalChecklistMarkdown = ({
  account,
  renewalDate,
  health,
  execSponsorStatus,
  valueProofStatus
}) => {
  const renewal = renewalDate || account?.renewal_date;
  const lines = [
    `# Renewal Readiness Checklist - ${valueOr(account?.name, 'Account')}`,
    '',
    `- Renewal Date: ${formatDate(renewal)}`,
    `- Current Health: ${valueOr(health || account?.health?.overall)}`,
    `- Executive Sponsor: ${valueOr(execSponsorStatus)}`,
    `- Value Proof: ${valueOr(valueProofStatus)}`,
    '',
    '## Adoption',
    '- [ ] 3+ green platform use cases validated',
    '- [ ] Lowest use case has remediation plan with owner/date',
    '',
    '## Engagement',
    '- [ ] Engagement cadence current (last touch <= 14 days)',
    '- [ ] Executive stakeholder session completed',
    '',
    '## Value',
    '- [ ] Outcome metrics validated with customer',
    '- [ ] Executive summary approved for renewal motion',
    '',
    '## Risks',
    '- [ ] Active risks have mitigations and next update dates',
    '- [ ] Escalations reviewed and closed or accepted',
    '',
    '## Blockers',
    '- Add blockers here with owner and ETA.'
  ];
  return lines.join('\n');
};

export const buildCollaborationIssueBody = ({
  account,
  title,
  description,
  lifecycleStage,
  desiredOutcome,
  definitionOfDone,
  nextActions = []
}) => {
  const lines = [
    '# CSE Collaboration Issue',
    '',
    `- Account: ${valueOr(account?.name)}`,
    `- Account ID: ${valueOr(account?.id)}`,
    `- Lifecycle Stage: ${valueOr(lifecycleStage || account?.lifecycle_stage || account?.health?.lifecycle_stage)}`,
    `- Renewal Date: ${formatDate(account?.renewal_date)}`,
    '',
    '## Context',
    valueOr(description),
    '',
    '## Desired Outcome',
    valueOr(desiredOutcome),
    '',
    '## Definition of Done',
    valueOr(definitionOfDone),
    '',
    '## Next Actions',
    ...(nextActions.length ? nextActions.map((item) => `- [ ] ${item}`) : ['- [ ] Confirm owner, timeline, and success metric'])
  ];
  if (title) {
    lines.unshift(`> Issue Title: ${title}`, '');
  }
  return lines.join('\n');
};

export const buildGitLabIssueDraftUrl = ({ baseUrl, projectPath, title, body }) => {
  const cleanBase = String(baseUrl || '').trim().replace(/\/+$/, '');
  const cleanProject = String(projectPath || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
  if (!cleanBase || !cleanProject) return '';
  const query = new URLSearchParams();
  if (title) query.set('issue[title]', title);
  if (body) query.set('issue[description]', body);
  return `${cleanBase}/${cleanProject}/-/issues/new?${query.toString()}`;
};

export const parseMultilineItems = asList;
