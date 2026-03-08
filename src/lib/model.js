import { toIsoDate } from './date.js';
import { maturityForPercent } from '../data/adoptionStages.js';
import { normalizeEngagementType } from '../config/engagementTypes.js';
import { DEFAULT_PT_CALIBRATION, ensurePtCalibration } from '../config/ptCalibration.js';

export const WORKSPACE_VERSION = '3.0.0';

export const DEVSECOPS_STAGES = ['Plan', 'Create', 'Verify', 'Package', 'Secure', 'Release', 'Configure', 'Monitor'];
export const STAGE_STATUSES = ['Not Started', 'Planned', 'In Progress', 'Adopted'];
export const USE_CASE_KEYS = ['SCM', 'CICD', 'Security', 'Compliance', 'ReleaseAutomation', 'Observability'];
export const LIFECYCLE_STAGES = ['Align', 'Onboard', 'Adopt', 'Enable', 'Expand', 'Renew'];

const toId = (value, prefix = 'item') =>
  `${prefix}_${String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`;

const pick = (value, fallback = '') => (value === null || value === undefined ? fallback : value);

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const ensureObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const defaultStageStatuses = () =>
  DEVSECOPS_STAGES.reduce((acc, stage) => {
    acc[stage] = 'Not Started';
    return acc;
  }, {});

const defaultUseCases = () =>
  USE_CASE_KEYS.reduce((acc, useCase) => {
    acc[useCase] = { percent: 0, evidence: 'Not started' };
    return acc;
  }, {});

export const createDefaultWorkspace = () => ({
  version: WORKSPACE_VERSION,
  updatedAt: new Date().toISOString(),
  portfolio: {
    name: 'CSE Portfolio',
    region: 'AMER',
    segment: 'Commercial',
    owner: 'CSE On-Demand'
  },
  customers: [],
  adoption: {},
  successPlans: {},
  programs: [],
  engagements: {},
  risk: {},
  expansion: {},
  voc: [],
  team: {
    cseMembers: []
  },
  snapshots: [],
  settings: {
    riskPlaybookTemplates: [
      { id: 'tpl_recovery', name: 'Recovery Motion', action: 'Run technical recovery workshop', owner: 'CSE', daysToDue: 14 },
      { id: 'tpl_renewal', name: 'Renewal Readiness', action: 'Prepare renewal evidence summary', owner: 'CSM', daysToDue: 21 }
    ],
    programTemplates: [
      { id: 'prog_template_lab', name: 'Adoption Lab', type: 'Lab' },
      { id: 'prog_template_webinar', name: 'Executive Webinar', type: 'Webinar' }
    ],
    scoringWeights: {
      adoption: 45,
      engagement: 30,
      risk: 25
    },
    ptCalibration: ensurePtCalibration(DEFAULT_PT_CALIBRATION)
  }
});

const mapUseCaseStatus = (score) => {
  const value = Number(score || 0);
  if (value >= 75) return 'Adopted';
  if (value >= 50) return 'In Progress';
  if (value > 0) return 'Planned';
  return 'Not Started';
};

const mapStageFromUseCases = (scores = {}) => ({
  Plan: Number(scores.SCM || 0) >= 50 ? 'Adopted' : 'In Progress',
  Create: mapUseCaseStatus(scores.SCM),
  Verify: mapUseCaseStatus(scores.CI),
  Package: mapUseCaseStatus(scores.CD),
  Secure: mapUseCaseStatus(scores.Secure),
  Release: mapUseCaseStatus(scores.CD),
  Configure: Number(scores.CI || 0) >= 60 ? 'In Progress' : 'Planned',
  Monitor: Number(scores.Secure || 0) >= 60 ? 'In Progress' : 'Not Started'
});

const mapLegacyLifecycle = (value) => {
  const stage = String(value || '').trim().toLowerCase();
  if (stage === 'align') return 'Align';
  if (stage === 'onboard') return 'Onboard';
  if (stage === 'adopt') return 'Adopt';
  if (stage === 'enable') return 'Enable';
  if (stage === 'expand' || stage === 'optimize') return 'Expand';
  if (stage === 'renew') return 'Renew';
  return 'Enable';
};

const mapLegacyMilestones = (account) =>
  ensureArray(account?.journey?.milestones).map((item, index) => ({
    milestone: pick(item.label, `Milestone ${index + 1}`),
    date: pick(account?.health?.last_updated, toIsoDate(new Date())),
    status: String(item.status || '').toLowerCase() === 'done' ? 'Done' : 'Planned'
  }));

const mapLegacyOutcomeStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'complete' || value === 'completed' || value === 'done') return 'Complete';
  if (value === 'at_risk' || value === 'risk') return 'At Risk';
  return 'On Track';
};

const mapLegacyRiskSignals = (account) => {
  const escalations = ensureArray(account?.internal_only?.escalations);
  const trend = Number(account?.adoption?.trend_30d || 0);
  const signals = escalations.map((item) => ({
    code: toId(item.issue, 'manual'),
    severity: String(item.severity || 'Medium').toUpperCase().startsWith('P1') ? 'High' : 'Medium',
    detectedAt: pick(item.next_update_due, new Date().toISOString()),
    detail: pick(item.issue, 'Escalation logged'),
    source: 'manual'
  }));
  if (trend < -5) {
    signals.push({
      code: 'LOW_PIPELINE_ACTIVITY',
      severity: trend < -12 ? 'High' : 'Medium',
      detectedAt: new Date().toISOString(),
      detail: `Pipeline activity trend ${trend}% over 30 days`,
      source: 'derived'
    });
  }
  return signals;
};

const mapLegacyEngagements = (account) => {
  const events = [];
  if (account?.engagement?.last_touch_date) {
    events.push({
      id: `eng_${account.id}_last_touch`,
      ts: `${account.engagement.last_touch_date}T12:00:00.000Z`,
      type: '1:1',
      summary: `Cadence touchpoint completed (${account.engagement.cadence || 'cadence'})`,
      tags: ['cadence'],
      nextSteps: ['Confirm next touch and update action items'],
      owner: 'CSE'
    });
  }
  if (account?.engagement?.next_ebr_date) {
    events.push({
      id: `eng_${account.id}_ebr_planned`,
      ts: `${account.engagement.next_ebr_date}T12:00:00.000Z`,
      type: '1:many',
      summary: 'Executive business review planned',
      tags: ['ebr', 'executive'],
      nextSteps: ['Prepare value realization summary'],
      owner: 'CSM'
    });
  }
  return events;
};

const mapLegacyCustomer = (account) => ({
  id: toId(account.id || account.name || 'customer', 'cust'),
  name: pick(account.name, 'Unnamed Customer'),
  tier: account.segment === 'Strategic' ? 'Premium' : account.segment === 'Enterprise' ? 'Premium' : 'Standard',
  renewalDate: pick(account.renewal_date, ''),
  arrBand: account.segment === 'Strategic' ? '$250K-$500K' : account.segment === 'Enterprise' ? '$100K-$250K' : '$50K-$100K',
  arr: account.segment === 'Strategic' ? 420000 : account.segment === 'Enterprise' ? 180000 : 80000,
  stage: mapLegacyLifecycle(account.lifecycle_stage || account?.health?.lifecycle_stage),
  primaryUseCase: Number(account?.adoption?.use_case_scores?.CI || 0) >= Number(account?.adoption?.use_case_scores?.Secure || 0) ? 'CI/CD' : 'Security',
  contacts: [
    {
      name: `${account.name.split(' ')[0]} Platform Lead`,
      role: 'Platform Engineering',
      email: `${account.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`
    }
  ],
  notes: account?.outcomes?.executive_summary || '',
  internalNotes: account?.internal_only?.sentiment_notes || '',
  tags: ensureArray(account?.adoption ? ['SCM', 'CI', 'Security'] : []),
  contractEndDate: pick(account.renewal_date, ''),
  renewalRisk: String(account?.health?.overall || '').toLowerCase() === 'red' ? 'High' : 'Moderate',
  churnProbability: String(account?.health?.overall || '').toLowerCase() === 'red' ? 62 : 28,
  healthRawScore: Number(account?.adoption?.platform_adoption_score || 0),
  licenseCount: account.segment === 'Strategic' ? 420 : account.segment === 'Enterprise' ? 210 : 90,
  npsScore: String(account?.health?.overall || '').toLowerCase() === 'green' ? 48 : 27,
  escalationFlag: ensureArray(account?.internal_only?.escalations).length > 0,
  ownerEmail: `${String(account?.name || 'owner').toLowerCase().replace(/[^a-z0-9]/g, '')}.owner@example.com`,
  cseName: 'Assigned GitLab CSE',
  engagementType: normalizeEngagementType(Number(account?.engagement?.program_attendance?.labs || 0) > 0 ? 'HANDS_ON_LAB' : 'ON_DEMAND'),
  engagementStatus: 'SCHEDULED',
  engagementDate: pick(account?.engagement?.next_touch_date, toIsoDate(new Date())),
  requestedBy: 'CSM',
  adoptionProfile: {
    SCM: maturityForPercent(account?.adoption?.use_case_scores?.SCM || 0),
    CI: maturityForPercent(account?.adoption?.use_case_scores?.CI || 0),
    CD: maturityForPercent(account?.adoption?.use_case_scores?.CD || 0),
    DevSecOps: maturityForPercent(account?.adoption?.use_case_scores?.Secure || 0),
    'Agile Planning': maturityForPercent(Math.max(0, Number(account?.adoption?.platform_adoption_score || 0) - 20))
  }
});

const mapLegacyAdoption = (account) => {
  const scores = ensureObject(account?.adoption?.use_case_scores);
  return {
    devsecopsStages: mapStageFromUseCases(scores),
    useCases: {
      SCM: { percent: Number(scores.SCM || 0), evidence: 'Repository migration and merge request workflows in use' },
      CICD: { percent: Number(scores.CI || 0), evidence: 'Pipeline execution active across priority projects' },
      Security: { percent: Number(scores.Secure || 0), evidence: 'Security scans configured in selected pipelines' },
      Compliance: { percent: Math.max(0, Number(scores.Secure || 0) - 20), evidence: 'Compliance policy mapping in progress' },
      ReleaseAutomation: { percent: Number(scores.CD || 0), evidence: 'Release orchestration using GitLab delivery patterns' },
      Observability: { percent: Math.max(0, Number(scores.CD || 0) - 25), evidence: 'Operational telemetry baseline in progress' }
    },
    timeToValue: mapLegacyMilestones(account)
  };
};

const mapLegacySuccessPlan = (account) => {
  const outcomes = ensureArray(account?.outcomes?.objectives).map((objective, index) => ({
    id: `out_${account.id}_${index + 1}`,
    statement: objective.title,
    metric: index === 0 ? 'Lead time' : index === 1 ? 'Security coverage' : 'Adoption progress',
    target: index === 0 ? '-30%' : index === 1 ? '+20%' : 'Milestone complete',
    due: pick(objective.due_date, ''),
    status: mapLegacyOutcomeStatus(objective.status)
  }));

  const milestones = ensureArray(account?.journey?.milestones).map((item, index) => ({
    id: `ms_${account.id}_${index + 1}`,
    outcomeId: outcomes[Math.min(index, Math.max(0, outcomes.length - 1))]?.id || null,
    title: `${item.label} implementation checkpoint`,
    owner: index % 2 === 0 ? 'CSE' : 'Customer',
    due: pick(account?.renewal_date, ''),
    status: String(item.status || '').toLowerCase() === 'done' ? 'Complete' : 'In Progress'
  }));

  return { outcomes, milestones };
};

const mapLegacyPrograms = (programs, customerIds) =>
  ensureArray(programs).map((program, index) => ({
    id: toId(program.program_id || program.title, 'prog'),
    legacyProgramId: pick(program.program_id, ''),
    name: program.title,
    type: String(program.type || 'webinar')
      .replace(/\b\w/g, (match) => match.toUpperCase())
      .replace('-', ' '),
    startDate: pick(program.date?.slice(0, 10), ''),
    endDate: pick(program.date?.slice(0, 10), ''),
    objective: pick(program.followup_steps?.[0], `Improve ${(program.target_use_cases || []).join(', ')} adoption`),
    cohortCustomerIds: customerIds.filter((_, i) => i % 2 === index % 2).slice(0, Math.max(2, Math.floor(customerIds.length / 2))),
    funnel: {
      invited: Number(program.registration_count || 0),
      attended: Number(program.attendance_count || 0),
      completed: Math.max(0, Math.floor(Number(program.attendance_count || 0) * 0.72))
    },
    adoptionImpact: {
      CICD: (program.target_use_cases || []).includes('CI') ? 12 : 4,
      Security: (program.target_use_cases || []).includes('Secure') ? 10 : 2
    },
    sessions: [
      {
        date: pick(program.date?.slice(0, 10), ''),
        title: `${program.title} session`,
        artifact: `artifacts/${toId(program.title)}.pdf`
      }
    ]
  }));

const mapLegacyExpansion = (account, customerId) => {
  const scores = ensureObject(account?.adoption?.use_case_scores);
  const expansionItems = [];
  if (Number(scores.Secure || 0) < 30) {
    expansionItems.push({
      id: `exp_${customerId}_security`,
      type: 'UseCaseAdd',
      title: 'Enable SAST in default pipeline',
      rationale: 'Security use-case adoption is below 30%',
      estImpact: 'Reduce vulnerability feedback loop time',
      status: 'Open'
    });
  }
  if (Number(scores.CI || 0) < 40) {
    expansionItems.push({
      id: `exp_${customerId}_cicd`,
      type: 'Optimization',
      title: 'Standardize CI templates across teams',
      rationale: 'CI/CD adoption is below 40%',
      estImpact: 'Increase deployment reliability and speed',
      status: 'Open'
    });
  }
  return expansionItems;
};

const mapLegacyVoc = (accounts) =>
  ensureArray(accounts)
    .slice(0, 6)
    .map((account, index) => ({
      id: `voc_${index + 1}`,
      customerId: toId(account.id || account.name || `voc_${index + 1}`, 'cust'),
      area: index % 2 === 0 ? 'CI/CD' : 'Security',
      request:
        index % 2 === 0
          ? 'Need better visibility into cross-project pipeline bottlenecks'
          : 'Need secure policy templates aligned to compliance controls',
      impact:
        index % 2 === 0
          ? 'Delivery teams lose time diagnosing failure hotspots'
          : 'Security enablement rollout slowed for regulated workloads',
      createdAt: new Date(Date.now() - index * 86400000 * 3).toISOString(),
      status: index < 2 ? 'In Review' : 'Captured'
    }));

export const buildWorkspaceFromLegacy = ({ accounts = [], programs = [] } = {}) => {
  const workspace = createDefaultWorkspace();
  const customers = ensureArray(accounts).map(mapLegacyCustomer);
  workspace.customers = customers;
  const customerIds = customers.map((item) => item.id);

  customers.forEach((customer, index) => {
    const account = accounts[index] || {};
    workspace.adoption[customer.id] = mapLegacyAdoption(account);
    workspace.successPlans[customer.id] = mapLegacySuccessPlan(account);
    workspace.engagements[customer.id] = mapLegacyEngagements(account);
    workspace.risk[customer.id] = {
      signals: mapLegacyRiskSignals(account),
      playbook: [
        {
          action: 'Run technical enablement checkpoint',
          owner: 'CSE',
          due: account?.engagement?.next_touch_date || account?.renewal_date || toIsoDate(new Date()),
          status: 'Planned'
        }
      ],
      overrideHealth: null
    };
    workspace.expansion[customer.id] = mapLegacyExpansion(account, customer.id);
  });

  workspace.programs = mapLegacyPrograms(programs, customerIds);
  workspace.voc = mapLegacyVoc(accounts);
  workspace.team.cseMembers = [
    {
      id: 'cse_mike',
      name: 'Mike Macri',
      region: 'AMER',
      accounts: customerIds
    }
  ];
  workspace.updatedAt = new Date().toISOString();
  return workspace;
};

const normalizeStageStatuses = (value) => {
  const source = ensureObject(value);
  const defaults = defaultStageStatuses();
  DEVSECOPS_STAGES.forEach((stage) => {
    const status = String(source[stage] || defaults[stage]);
    defaults[stage] = STAGE_STATUSES.includes(status) ? status : defaults[stage];
  });
  return defaults;
};

const normalizeUseCases = (value) => {
  const source = ensureObject(value);
  const defaults = defaultUseCases();
  USE_CASE_KEYS.forEach((useCase) => {
    const row = ensureObject(source[useCase]);
    defaults[useCase] = {
      percent: Math.max(0, Math.min(100, Number(row.percent || 0))),
      evidence: pick(row.evidence, 'Not started')
    };
  });
  return defaults;
};

const normalizePrograms = (programs) =>
  ensureArray(programs).map((program, index) => {
    const source = ensureObject(program);
    const fallbackId = toId(
      source.id || source.legacyProgramId || source.program_id || source.name || source.title || `program_${index + 1}`,
      'prog'
    );
    const normalizedId = pick(source.id, fallbackId);
    const startDate = String(pick(source.startDate, pick(source.date, ''))).slice(0, 10);
    const endDate = String(pick(source.endDate, startDate)).slice(0, 10);
    const fallbackInvited = Number(pick(source.registration_count, 0));
    const fallbackAttended = Number(pick(source.attendance_count, 0));
    const funnelSource = ensureObject(source.funnel);

    return {
      id: normalizedId,
      legacyProgramId: pick(source.legacyProgramId, pick(source.program_id, '')),
      name: pick(source.name, pick(source.title, `Program ${index + 1}`)),
      type: pick(source.type, 'Webinar'),
      startDate,
      endDate,
      objective: pick(
        source.objective,
        pick(source.invite_blurb, pick(ensureArray(source.followup_steps)[0], 'Improve adoption outcomes through enablement.'))
      ),
      cohortCustomerIds: ensureArray(source.cohortCustomerIds).map((value) => String(value || '')).filter(Boolean),
      funnel: {
        invited: Math.max(0, Number(pick(funnelSource.invited, fallbackInvited))),
        attended: Math.max(0, Number(pick(funnelSource.attended, fallbackAttended))),
        completed: Math.max(
          0,
          Number(pick(funnelSource.completed, Math.floor(Number(pick(funnelSource.attended, fallbackAttended)) * 0.72)))
        )
      },
      adoptionImpact: ensureObject(source.adoptionImpact),
      sessions: ensureArray(source.sessions).map((session, sessionIndex) => {
        const sessionSource = ensureObject(session);
        return {
          date: String(pick(sessionSource.date, startDate)).slice(0, 10),
          title: pick(sessionSource.title, `${pick(source.name, pick(source.title, `Program ${index + 1}`))} session ${sessionIndex + 1}`),
          artifact: pick(sessionSource.artifact, '')
        };
      })
    };
  });

export const ensureWorkspaceShape = (workspace, fallback = null) => {
  const base = ensureObject(workspace);
  const defaults = fallback || createDefaultWorkspace();
  const output = {
    ...defaults,
    ...base,
    version: WORKSPACE_VERSION,
    updatedAt: pick(base.updatedAt, defaults.updatedAt),
    portfolio: { ...defaults.portfolio, ...ensureObject(base.portfolio) },
    customers: ensureArray(base.customers).map((customer, index) => ({
      id: pick(customer.id, toId(customer.name || `customer_${index + 1}`, 'cust')),
      name: pick(customer.name, `Customer ${index + 1}`),
      tier: pick(customer.tier, 'Standard'),
      renewalDate: pick(customer.renewalDate, ''),
      arrBand: pick(customer.arrBand, '$50K-$100K'),
      arr: Number(pick(customer.arr, 0)),
      stage: LIFECYCLE_STAGES.includes(String(customer.stage || '')) ? customer.stage : 'Enable',
      primaryUseCase: pick(customer.primaryUseCase, 'CI/CD'),
      contacts: ensureArray(customer.contacts),
      notes: pick(customer.notes, ''),
      internalNotes: pick(customer.internalNotes, ''),
      tags: ensureArray(customer.tags),
      contractEndDate: pick(customer.contractEndDate, pick(customer.renewalDate, '')),
      renewalRisk: pick(customer.renewalRisk, 'Moderate'),
      churnProbability: Number(pick(customer.churnProbability, 0)),
      healthRawScore: Number(pick(customer.healthRawScore, 0)),
      licenseCount: Number(pick(customer.licenseCount, 0)),
      npsScore: Number(pick(customer.npsScore, 0)),
      escalationFlag: Boolean(customer.escalationFlag),
      ownerEmail: pick(customer.ownerEmail, ''),
      cseName: pick(customer.cseName, 'Assigned GitLab CSE'),
      engagementType: normalizeEngagementType(pick(customer.engagementType, 'ON_DEMAND')),
      engagementStatus: String(pick(customer.engagementStatus, 'REQUESTED')).toUpperCase(),
      engagementDate: pick(customer.engagementDate, ''),
      requestedBy: String(pick(customer.requestedBy, 'CSM')).toUpperCase(),
      adoptionProfile: {
        SCM: String(customer?.adoptionProfile?.SCM || 'NOT_STARTED').toUpperCase(),
        CI: String(customer?.adoptionProfile?.CI || 'NOT_STARTED').toUpperCase(),
        CD: String(customer?.adoptionProfile?.CD || 'NOT_STARTED').toUpperCase(),
        DevSecOps: String(customer?.adoptionProfile?.DevSecOps || 'NOT_STARTED').toUpperCase(),
        'Agile Planning': String(customer?.adoptionProfile?.['Agile Planning'] || 'NOT_STARTED').toUpperCase()
      }
    })),
    adoption: ensureObject(base.adoption),
    successPlans: ensureObject(base.successPlans),
    programs: normalizePrograms(base.programs),
    engagements: ensureObject(base.engagements),
    risk: ensureObject(base.risk),
    expansion: ensureObject(base.expansion),
    voc: ensureArray(base.voc),
    team: {
      cseMembers: ensureArray(base?.team?.cseMembers || defaults.team.cseMembers)
    },
    snapshots: ensureArray(base.snapshots),
    settings: {
      ...defaults.settings,
      ...ensureObject(base.settings),
      scoringWeights: {
        ...defaults.settings.scoringWeights,
        ...ensureObject(base?.settings?.scoringWeights)
      },
      ptCalibration: ensurePtCalibration(base?.settings?.ptCalibration || defaults.settings.ptCalibration)
    }
  };

  output.customers.forEach((customer) => {
    const customerId = customer.id;
    const adoption = ensureObject(output.adoption[customerId]);
    output.adoption[customerId] = {
      devsecopsStages: normalizeStageStatuses(adoption.devsecopsStages),
      useCases: normalizeUseCases(adoption.useCases),
      timeToValue: ensureArray(adoption.timeToValue)
    };

    const successPlan = ensureObject(output.successPlans[customerId]);
    output.successPlans[customerId] = {
      outcomes: ensureArray(successPlan.outcomes),
      milestones: ensureArray(successPlan.milestones)
    };

    if (!Array.isArray(output.engagements[customerId])) {
      output.engagements[customerId] = [];
    }
    const risk = ensureObject(output.risk[customerId]);
    output.risk[customerId] = {
      signals: ensureArray(risk.signals),
      playbook: ensureArray(risk.playbook),
      dismissals: ensureArray(risk.dismissals),
      overrideHealth: risk.overrideHealth || null
    };
    if (!Array.isArray(output.expansion[customerId])) {
      output.expansion[customerId] = [];
    }
  });

  return output;
};

export const validateWorkspace = (workspace) => {
  const errors = [];
  const model = ensureWorkspaceShape(workspace);
  if (!model.customers.length) errors.push('Workspace has no customers.');

  model.customers.forEach((customer) => {
    if (!customer.id) errors.push('Customer missing id.');
    if (!customer.name) errors.push(`Customer ${customer.id || '(unknown)'} missing name.`);
    if (!model.adoption[customer.id]) errors.push(`Missing adoption map for ${customer.id}.`);
    if (!model.successPlans[customer.id]) errors.push(`Missing success plan for ${customer.id}.`);
    if (!model.risk[customer.id]) errors.push(`Missing risk map for ${customer.id}.`);
  });

  return errors;
};
