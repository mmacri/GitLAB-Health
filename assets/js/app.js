const DEFAULT_DATA = {
  meta: {
    last_updated: '2025-10-08'
  },
  customer: {
    name: 'Northwind Industries',
    plan: 'Ultimate',
    csm: 'Jordan Lee',
    start_date: '2025-08-27'
  },
  licenses: {
    purchased: 500,
    active: 40
  },
  projects: {
    total: 120,
    ci_enabled: 30,
    deploying: 4,
    security_scans: 6
  },
  teams: {
    total: 30,
    scm_adopted: 12
  },
  usage: {
    monthly_active_users: 34,
    merge_requests_month: 120,
    issues_month: 260
  },
  onboarding: {
    tasks: [
      { name: 'Kickoff and stakeholder alignment', done: true, date: '2025-08-29' },
      { name: 'GitLab instance deployed', done: true, date: '2025-09-10' },
      { name: 'SSO configured', done: true, date: '2025-09-12' },
      { name: 'Pilot teams onboarded', done: true, date: '2025-09-20' },
      { name: 'Repository migration', done: true, date: '2025-09-25' },
      { name: 'CI runners configured', done: true, date: '2025-09-28' },
      { name: 'First pipelines running', done: true, date: '2025-10-02' },
      { name: 'Security baseline defined', done: true, date: '2025-10-05' },
      { name: 'Training sessions complete', done: false, date: '' },
      { name: 'Success plan validated', done: false, date: '' }
    ]
  },
  milestones: {
    engagement: { date: '2025-09-01' },
    infra_ready: { date: '2025-09-15' },
    onboarding_complete: { date: '' },
    first_value: { date: '', expected_date: '2025-10-15' },
    outcome: { date: '', expected_date: '2025-12-15' }
  },
  targets: {
    engage_days: 14,
    onboard_days: 45,
    first_value_days: 30,
    license_utilization: { watch: 0.5, good: 0.8 },
    scm_adoption: { watch: 0.25, good: 0.4 },
    ci_adoption: { watch: 0.25, good: 0.75 },
    security_adoption: { watch: 0.1, good: 0.2 },
    deployment_adoption: { watch: 0.1, good: 0.3 }
  },
  dora: {
    deploy_freq_per_day: 0.2,
    lead_time_days: 7,
    change_failure_pct: 12,
    mttr_hours: 12
  },
  outcomes: {
    narrative:
      'CI coverage reached 25% of projects. Next focus is enabling security scans and expanding deployment automation to improve lead time and MTTR.'
  }
};

const numberFormat = new Intl.NumberFormat('en-US');
const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const safeDivide = (numerator, denominator) => {
  if (!denominator) return 0;
  return numerator / denominator;
};

const clamp = (value) => Math.max(0, Math.min(1, value));

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDate(value);
  return date ? dateFormat.format(date) : '';
};

const formatPercent = (value) => `${Math.round(value * 100)}%`;

const formatDecimal = (value, digits = 1) => {
  if (typeof value !== 'number') return '';
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(digits);
};

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  return Math.round((end - start) / MS_PER_DAY);
};

const getValue = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

const milestoneText = (date, expectedDate, targetDays, startDate, referenceDate) => {
  const parsedDate = parseDate(date);
  const parsedExpected = parseDate(expectedDate);
  if (parsedDate) {
    const day = daysBetween(startDate, parsedDate);
    return `Day ${day} | ${formatDate(parsedDate)}`;
  }

  let detail = '';
  if (targetDays) {
    detail = `Target Day ${targetDays}`;
  }
  if (parsedExpected) {
    detail = detail ? `${detail} | Expected ${formatDate(parsedExpected)}` : `Expected ${formatDate(parsedExpected)}`;
  }
  if (!detail) {
    const elapsed = daysBetween(startDate, referenceDate);
    detail = elapsed !== null ? `Day ${elapsed}` : 'In progress';
  }
  return detail;
};

const milestoneStatus = (date, targetDays, startDate, referenceDate) => {
  const parsedDate = parseDate(date);
  if (parsedDate) return { status: 'Complete', statusKey: 'complete' };
  if (targetDays && startDate && referenceDate) {
    const elapsed = daysBetween(startDate, referenceDate);
    if (elapsed !== null && elapsed > targetDays) {
      return { status: 'Overdue', statusKey: 'overdue' };
    }
  }
  return { status: 'In progress', statusKey: 'in_progress' };
};

const statusForMetric = (value, thresholds) => {
  if (!thresholds) return 'watch';
  if (value >= thresholds.good) return 'good';
  if (value >= thresholds.watch) return 'watch';
  return 'risk';
};

const labelForStatus = (status) => {
  switch (status) {
    case 'good':
      return 'On track';
    case 'risk':
      return 'At risk';
    default:
      return 'Watch';
  }
};

const loadData = async () => {
  try {
    const response = await fetch('data/metrics.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load data');
    return await response.json();
  } catch (error) {
    return DEFAULT_DATA;
  }
};

const buildView = (data) => {
  const startDate = parseDate(data.customer.start_date);
  const updatedDate = parseDate(data.meta.last_updated) || new Date();

  const licenseUtil = safeDivide(data.licenses.active, data.licenses.purchased);
  const scmAdoption = safeDivide(data.teams.scm_adopted, data.teams.total);
  const ciAdoption = safeDivide(data.projects.ci_enabled, data.projects.total);
  const securityAdoption = safeDivide(data.projects.security_scans, data.projects.total);
  const deploymentAdoption = safeDivide(data.projects.deploying, data.projects.total);
  const engagement = safeDivide(data.usage.monthly_active_users, data.licenses.purchased);

  const onboardingTotal = data.onboarding.tasks.length;
  const onboardingCompleted = data.onboarding.tasks.filter((task) => task.done).length;
  const onboardingCompletion = safeDivide(onboardingCompleted, onboardingTotal);

  const adoptionIndex = (scmAdoption + ciAdoption + securityAdoption + deploymentAdoption) / 4;
  const firstValueThreshold = 0.1;
  const firstValueProgress = clamp(licenseUtil / firstValueThreshold);

  const engagementDays = daysBetween(startDate, parseDate(data.milestones.engagement.date));
  const onboardDays = daysBetween(startDate, parseDate(data.milestones.onboarding_complete.date));
  const infraDays = daysBetween(startDate, parseDate(data.milestones.infra_ready.date));
  const daysSinceStart = daysBetween(startDate, updatedDate);

  const milestones = {
    engagement: {
      ...milestoneStatus(data.milestones.engagement.date, data.targets.engage_days, startDate, updatedDate),
      detail: milestoneText(
        data.milestones.engagement.date,
        data.milestones.engagement.expected_date,
        data.targets.engage_days,
        startDate,
        updatedDate
      )
    },
    infra_ready: {
      ...milestoneStatus(data.milestones.infra_ready.date, null, startDate, updatedDate),
      detail: milestoneText(
        data.milestones.infra_ready.date,
        data.milestones.infra_ready.expected_date,
        null,
        startDate,
        updatedDate
      )
    },
    onboarding_complete: {
      ...milestoneStatus(data.milestones.onboarding_complete.date, data.targets.onboard_days, startDate, updatedDate),
      detail: milestoneText(
        data.milestones.onboarding_complete.date,
        data.milestones.onboarding_complete.expected_date,
        data.targets.onboard_days,
        startDate,
        updatedDate
      )
    },
    first_value: {
      ...milestoneStatus(data.milestones.first_value.date, data.targets.first_value_days, startDate, updatedDate),
      detail: milestoneText(
        data.milestones.first_value.date,
        data.milestones.first_value.expected_date,
        data.targets.first_value_days,
        startDate,
        updatedDate
      )
    },
    outcome: {
      ...milestoneStatus(data.milestones.outcome.date, null, startDate, updatedDate),
      detail: milestoneText(
        data.milestones.outcome.date,
        data.milestones.outcome.expected_date,
        null,
        startDate,
        updatedDate
      )
    }
  };

  const milestoneOrder = [
    { key: 'engagement', title: 'Engagement' },
    { key: 'infra_ready', title: 'Infrastructure ready' },
    { key: 'onboarding_complete', title: 'Onboarding complete' },
    { key: 'first_value', title: 'First value' },
    { key: 'outcome', title: 'Outcome achieved' }
  ];

  const nextMilestone = milestoneOrder.find((item) => !parseDate(data.milestones[item.key].date)) || milestoneOrder[4];

  return {
    customer: {
      name: data.customer.name,
      plan: data.customer.plan,
      csm: data.customer.csm
    },
    dates: {
      start: formatDate(data.customer.start_date),
      updated: formatDate(data.meta.last_updated)
    },
    licenses: {
      purchased: numberFormat.format(data.licenses.purchased),
      active: numberFormat.format(data.licenses.active)
    },
    projects: {
      total: numberFormat.format(data.projects.total),
      ci_enabled: numberFormat.format(data.projects.ci_enabled),
      deploying: numberFormat.format(data.projects.deploying),
      security_scans: numberFormat.format(data.projects.security_scans)
    },
    teams: {
      total: numberFormat.format(data.teams.total),
      scm_adopted: numberFormat.format(data.teams.scm_adopted)
    },
    usage: {
      monthly_active_users: numberFormat.format(data.usage.monthly_active_users),
      merge_requests_month: numberFormat.format(data.usage.merge_requests_month),
      issues_month: numberFormat.format(data.usage.issues_month)
    },
    onboarding: {
      summary: `${onboardingCompleted} of ${onboardingTotal} tasks complete`
    },
    signals: {
      time_to_engage: engagementDays !== null ? `${engagementDays} days` : 'Pending',
      time_to_onboard: onboardDays !== null ? `${onboardDays} days` : daysSinceStart !== null ? `In progress (Day ${daysSinceStart})` : 'In progress',
      infra_ready: infraDays !== null ? `Day ${infraDays}` : 'Pending',
      first_value: `${formatPercent(licenseUtil)} licenses active`
    },
    metrics: {
      license_utilization_pct: formatPercent(licenseUtil),
      adoption_index_pct: formatPercent(adoptionIndex),
      first_value_status: `${formatPercent(licenseUtil)} license activation (target 10%)`
    },
    milestones: {
      ...milestones,
      next: {
        title: nextMilestone.title,
        detail: milestones[nextMilestone.key].detail
      }
    },
    dora: {
      deploy_freq: `${formatDecimal(data.dora.deploy_freq_per_day, 1)} / day`,
      lead_time: `${formatDecimal(data.dora.lead_time_days, 0)} days`,
      change_failure: `${formatDecimal(data.dora.change_failure_pct, 0)}%`,
      mttr: `${formatDecimal(data.dora.mttr_hours, 0)} hours`
    },
    outcomes: data.outcomes,
    progressValues: {
      license_utilization: licenseUtil,
      scm_adoption: scmAdoption,
      ci_adoption: ciAdoption,
      security_adoption: securityAdoption,
      deployment_adoption: deploymentAdoption,
      engagement,
      onboarding_completion: onboardingCompletion,
      adoption_index: adoptionIndex,
      first_value_progress: firstValueProgress
    },
    statusMap: {
      license_utilization: statusForMetric(licenseUtil, data.targets.license_utilization),
      scm_adoption: statusForMetric(scmAdoption, data.targets.scm_adoption),
      ci_adoption: statusForMetric(ciAdoption, data.targets.ci_adoption),
      security_adoption: statusForMetric(securityAdoption, data.targets.security_adoption),
      deployment_adoption: statusForMetric(deploymentAdoption, data.targets.deployment_adoption),
      engagement: statusForMetric(engagement, data.targets.license_utilization)
    },
    additional: {
      onboardingCompletion,
      adoptionIndex,
      firstValueProgress,
      licenseUtil
    }
  };
};

const renderTasks = (tasks) => {
  const list = document.querySelector('[data-list="onboarding-tasks"]');
  if (!list) return;
  list.innerHTML = '';
  tasks.forEach((task) => {
    const item = document.createElement('li');
    item.className = `task${task.done ? ' is-done' : ''}`;
    const metaText = task.done && task.date ? formatDate(task.date) : 'Pending';
    item.innerHTML = `
      <span class="task-indicator" aria-hidden="true"></span>
      <div>
        <div class="task-title">${task.name}</div>
        <div class="task-meta">${metaText}</div>
      </div>
    `;
    list.appendChild(item);
  });
};

const updateBindings = (view) => {
  document.querySelectorAll('[data-field]').forEach((element) => {
    const value = getValue(view, element.dataset.field);
    if (value !== undefined && value !== null && value !== '') {
      element.textContent = value;
    }
  });
};

const updateProgressBars = (progressValues) => {
  document.querySelectorAll('[data-progress]').forEach((element) => {
    const key = element.dataset.progress;
    const value = progressValues[key] ?? 0;
    element.style.setProperty('--value', value);
    element.setAttribute('aria-valuenow', Math.round(value * 100));
  });
};

const updateRing = (value) => {
  const ring = document.querySelector('[data-ring="license_utilization"]');
  if (ring) {
    ring.style.setProperty('--value', value);
  }
};

const updateChips = (view) => {
  const onboardingStatus = view.additional.onboardingCompletion >= 0.9 ? 'good' : view.additional.onboardingCompletion >= 0.6 ? 'watch' : 'risk';
  const firstValueStatus = view.additional.licenseUtil >= 0.1 ? 'good' : view.additional.licenseUtil >= 0.05 ? 'watch' : 'risk';
  const adoptionStatus = view.additional.adoptionIndex >= 0.6 ? 'good' : view.additional.adoptionIndex >= 0.35 ? 'watch' : 'risk';

  const chipConfig = {
    onboarding: {
      status: onboardingStatus,
      label: `Onboarding ${formatPercent(view.additional.onboardingCompletion)}`
    },
    first_value: {
      status: firstValueStatus,
      label: firstValueStatus === 'good' ? 'First value achieved' : 'First value pending'
    },
    adoption: {
      status: adoptionStatus,
      label: `Adoption health ${labelForStatus(adoptionStatus).toLowerCase()}`
    },
    license_utilization: {
      status: view.statusMap.license_utilization,
      label: labelForStatus(view.statusMap.license_utilization)
    },
    scm_adoption: {
      status: view.statusMap.scm_adoption,
      label: labelForStatus(view.statusMap.scm_adoption)
    },
    ci_adoption: {
      status: view.statusMap.ci_adoption,
      label: labelForStatus(view.statusMap.ci_adoption)
    },
    security_adoption: {
      status: view.statusMap.security_adoption,
      label: labelForStatus(view.statusMap.security_adoption)
    },
    deployment_adoption: {
      status: view.statusMap.deployment_adoption,
      label: labelForStatus(view.statusMap.deployment_adoption)
    },
    engagement: {
      status: view.statusMap.engagement,
      label: labelForStatus(view.statusMap.engagement)
    }
  };

  document.querySelectorAll('[data-chip]').forEach((element) => {
    const key = element.dataset.chip;
    const config = chipConfig[key];
    if (!config) return;
    element.dataset.status = config.status;
    element.textContent = config.label;
  });
};

const renderTimeline = (view) => {
  document.querySelectorAll('.timeline-step').forEach((step) => {
    const key = step.dataset.milestone;
    const detail = view.milestones[key];
    if (!detail) return;
    step.dataset.status = detail.statusKey;
    const statusNode = step.querySelector('.step-status');
    const detailNode = step.querySelector('.step-detail');
    if (statusNode) statusNode.textContent = detail.status;
    if (detailNode) detailNode.textContent = detail.detail;
  });
};

const init = async () => {
  const data = await loadData();
  const view = buildView(data);

  renderTasks(data.onboarding.tasks);
  updateBindings(view);
  updateProgressBars(view.progressValues);
  updateRing(view.additional.licenseUtil);
  updateChips(view);
  renderTimeline(view);

  document.body.classList.add('loaded');
};

init();
