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
  events: [
    { name: 'First login', date: '2025-08-28' },
    { name: 'First project created', date: '2025-09-05' },
    { name: 'First merge request', date: '2025-09-18' },
    { name: 'First pipeline run', date: '2025-10-02' },
    { name: 'First security scan', date: '2025-10-05' },
    { name: 'First deployment', date: '2025-10-06' }
  ],
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
  cicd: {
    pipelines_week: 38,
    pipeline_success_rate: 0.72,
    pipeline_duration_minutes: 18,
    deployments_week: 4,
    milestones: [
      { name: 'First pipeline created', date: '2025-10-02', status: 'complete' },
      { name: 'Shared runners enabled', date: '2025-09-28', status: 'complete' },
      { name: 'First production deployment', date: '', status: 'pending' }
    ]
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
  devops_adoption: {
    devops_score: 0.35,
    use_cases_green_target: 3,
    use_cases: [
      { name: 'Plan: Issues and boards', status: 'watch', note: '12 teams active' },
      { name: 'Create: SCM and merge requests', status: 'watch', note: '12 of 30 teams' },
      { name: 'Verify: CI pipelines', status: 'watch', note: '25% of projects' },
      { name: 'Secure: SAST and DAST', status: 'risk', note: '6 projects scanning' },
      { name: 'Release: Deployments', status: 'risk', note: '4 projects deploying' },
      { name: 'Measure: Value Stream Analytics', status: 'risk', note: 'Not enabled' }
    ]
  },
  success_plan: {
    objectives: [
      {
        title: 'Automate Tier-1 release workflows',
        metric: 'Tier-1 deployments via GitLab',
        owner: 'DevOps Lead',
        due: '2025-12-15',
        progress: 0.3,
        status: 'in_progress'
      },
      {
        title: 'Expand CI adoption to 60% of projects',
        metric: 'CI pipelines enabled',
        owner: 'Platform Engineering',
        due: '2025-11-30',
        progress: 0.5,
        status: 'in_progress'
      },
      {
        title: 'Enable security scanning for regulated apps',
        metric: 'SAST + Dependency Scanning',
        owner: 'Security',
        due: '2025-11-15',
        progress: 0.15,
        status: 'at_risk'
      }
    ]
  },
  health: {
    overall_status: 'watch',
    last_exec_review: '2025-09-30',
    factors: [
      { label: 'License utilization', status: 'risk', detail: '8% active vs 80% target' },
      { label: 'Stage adoption', status: 'watch', detail: '1 of 6 use cases green' },
      { label: 'Executive engagement', status: 'watch', detail: 'Last EBR on 2025-09-30' },
      { label: 'Support activity', status: 'watch', detail: '5 open high-priority tickets' },
      { label: 'Success plan progress', status: 'watch', detail: '0 objectives completed' }
    ]
  },
  dora: {
    deploy_freq_per_day: 0.2,
    lead_time_days: 7,
    change_failure_pct: 12,
    mttr_hours: 12
  },
  outcomes: {
    primary_goal: 'Automate release workflow for Tier-1 apps',
    primary_status: 'In progress',
    primary_progress: 0.35,
    primary_note: '4 of 12 Tier-1 apps deploy via GitLab',
    narrative:
      'CI coverage reached 25% of projects. Next focus is enabling security scans and expanding deployment automation to improve lead time and MTTR.'
  },
  learning: {
    recommended: [
      {
        title: 'GitLab CI/CD fundamentals',
        type: 'Course',
        detail: 'Pipeline basics, runners, and best practices',
        link: 'https://learn.gitlab.com/'
      },
      {
        title: 'GitLab administration essentials',
        type: 'Course',
        detail: 'Instance management and security baselines',
        link: 'https://learn.gitlab.com/'
      },
      {
        title: 'Secure DevOps workshops',
        type: 'Workshop',
        detail: 'Enable SAST, DAST, and dependency scanning',
        link: 'https://docs.gitlab.com/ee/user/application_security/'
      }
    ],
    webinars: [
      {
        title: 'Accelerating time to value with GitLab',
        type: 'Webinar',
        detail: 'Customer success and onboarding best practices',
        link: 'https://about.gitlab.com/resources/'
      },
      {
        title: 'DevOps metrics and DORA deep dive',
        type: 'Webinar',
        detail: 'How to interpret DORA metrics in GitLab',
        link: 'https://about.gitlab.com/resources/'
      }
    ],
    templates: [
      {
        title: 'Onboarding issue board template',
        detail: 'Track setup tasks with a ready-made issue board',
        link: 'https://docs.gitlab.com/ee/user/project/issues/'
      },
      {
        title: 'Success plan template',
        detail: 'Capture outcomes, owners, and KPIs',
        link: 'https://about.gitlab.com/handbook/customer-success/'
      }
    ]
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

const normalizeStatus = (status) => {
  if (!status) return 'watch';
  const normalized = status.toString().toLowerCase();
  if (['good', 'green', 'complete', 'completed', 'on_track', 'on-track', 'success'].includes(normalized)) return 'good';
  if (['risk', 'red', 'at_risk', 'at-risk', 'overdue', 'blocked'].includes(normalized)) return 'risk';
  if (['watch', 'yellow', 'in_progress', 'in-progress', 'pending'].includes(normalized)) return 'watch';
  return 'watch';
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

const deriveOverallStatus = (factors) => {
  if (factors.some((factor) => factor.status === 'risk')) return 'risk';
  if (factors.some((factor) => factor.status === 'watch')) return 'watch';
  return 'good';
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

  const devopsUseCases = (data.devops_adoption?.use_cases || []).map((useCase) => ({
    ...useCase,
    status: normalizeStatus(useCase.status)
  }));
  const useCasesGreen = devopsUseCases.filter((useCase) => useCase.status === 'good').length;
  const useCasesTotal = devopsUseCases.length;
  const devopsScore = data.devops_adoption?.devops_score ?? adoptionIndex;

  const successObjectives = data.success_plan?.objectives || [];
  const normalizedObjectives = successObjectives.map((objective) => ({
    ...objective,
    status: normalizeStatus(objective.status)
  }));
  const objectivesComplete = normalizedObjectives.filter((objective) => objective.status === 'good').length;
  const objectivesOnTrack = normalizedObjectives.filter((objective) => objective.status !== 'risk').length;
  const objectivesProgress =
    normalizedObjectives.length > 0
      ? normalizedObjectives.reduce((sum, objective) => sum + (objective.progress || 0), 0) / normalizedObjectives.length
      : 0;

  const healthFactors = (data.health?.factors || []).map((factor) => ({
    ...factor,
    status: normalizeStatus(factor.status)
  }));
  const healthStatus = data.health?.overall_status ? normalizeStatus(data.health.overall_status) : deriveOverallStatus(healthFactors);

  const outcomes = {
    ...data.outcomes,
    primary_progress: data.outcomes?.primary_progress ?? objectivesProgress
  };

  const cicd = data.cicd || {};

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
      time_to_onboard:
        onboardDays !== null ? `${onboardDays} days` : daysSinceStart !== null ? `In progress (Day ${daysSinceStart})` : 'In progress',
      infra_ready: infraDays !== null ? `Day ${infraDays}` : 'Pending',
      first_value: `${formatPercent(licenseUtil)} licenses active`
    },
    metrics: {
      license_utilization_pct: formatPercent(licenseUtil),
      adoption_index_pct: formatPercent(adoptionIndex),
      first_value_status: `${formatPercent(licenseUtil)} license activation (target 10%)`,
      ci_adoption_pct: formatPercent(ciAdoption),
      security_adoption_pct: formatPercent(securityAdoption),
      deployment_adoption_pct: formatPercent(deploymentAdoption),
      pipeline_success_rate_pct: formatPercent(cicd.pipeline_success_rate || 0),
      pipelines_week: numberFormat.format(cicd.pipelines_week || 0),
      deployments_week: numberFormat.format(cicd.deployments_week || 0),
      pipeline_duration: `${formatDecimal(cicd.pipeline_duration_minutes || 0, 0)} min`,
      devops_score_pct: formatPercent(devopsScore),
      use_cases_green: `${useCasesGreen} of ${useCasesTotal} use cases green`
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
    outcomes,
    success_plan: {
      summary: `${objectivesComplete} of ${normalizedObjectives.length} objectives achieved`,
      on_track: `${objectivesOnTrack} of ${normalizedObjectives.length} objectives on track`
    },
    health: {
      overall_status: healthStatus,
      overall_label: labelForStatus(healthStatus),
      last_exec_review: formatDate(data.health?.last_exec_review)
    },
    persona: {
      executive: {
        adoption_score: formatPercent(devopsScore),
        health_label: labelForStatus(healthStatus)
      },
      leader: {
        ci_coverage: formatPercent(ciAdoption),
        pipeline_success: formatPercent(cicd.pipeline_success_rate || 0),
        security_coverage: formatPercent(securityAdoption)
      },
      csm: {
        health_label: labelForStatus(healthStatus),
        license_utilization: formatPercent(licenseUtil),
        success_plan: `${objectivesComplete} of ${normalizedObjectives.length} objectives achieved`
      }
    },
    progressValues: {
      license_utilization: licenseUtil,
      scm_adoption: scmAdoption,
      ci_adoption: ciAdoption,
      security_adoption: securityAdoption,
      deployment_adoption: deploymentAdoption,
      engagement,
      onboarding_completion: onboardingCompletion,
      adoption_index: adoptionIndex,
      first_value_progress: firstValueProgress,
      outcome_progress: outcomes.primary_progress || 0
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
    },
    lists: {
      devopsUseCases,
      successObjectives: normalizedObjectives,
      healthFactors,
      events: data.events || [],
      cicdMilestones: cicd.milestones || [],
      learning: data.learning || {}
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

const renderEventList = (selector, events, startDate) => {
  const list = document.querySelector(selector);
  if (!list) return;
  list.innerHTML = '';
  events.forEach((event) => {
    const item = document.createElement('li');
    item.className = 'event-item';
    const eventDate = parseDate(event.date);
    const day = eventDate && startDate ? daysBetween(startDate, eventDate) : null;
    const meta = eventDate ? `Day ${day} | ${formatDate(eventDate)}` : 'Pending';
    item.innerHTML = `
      <div>
        <div class="event-title">${event.name}</div>
        <div class="event-meta">${meta}</div>
      </div>
    `;
    list.appendChild(item);
  });
};

const renderMilestoneList = (selector, milestones) => {
  const list = document.querySelector(selector);
  if (!list) return;
  list.innerHTML = '';
  milestones.forEach((milestone) => {
    const item = document.createElement('li');
    const status = normalizeStatus(milestone.status);
    const meta = milestone.date ? formatDate(milestone.date) : 'Pending';
    item.className = 'event-item';
    item.innerHTML = `
      <div class="event-row">
        <span class="status-dot" data-status="${status}"></span>
        <div>
          <div class="event-title">${milestone.name}</div>
          <div class="event-meta">${meta}</div>
        </div>
      </div>
    `;
    list.appendChild(item);
  });
};

const renderUseCases = (selector, useCases) => {
  const list = document.querySelector(selector);
  if (!list) return;
  list.innerHTML = '';
  useCases.forEach((useCase) => {
    const item = document.createElement('li');
    item.className = 'usecase-item';
    item.innerHTML = `
      <span class="status-dot" data-status="${useCase.status}"></span>
      <div>
        <div class="usecase-title">${useCase.name}</div>
        <div class="usecase-note">${useCase.note || ''}</div>
      </div>
    `;
    list.appendChild(item);
  });
};

const renderObjectives = (selector, objectives) => {
  const list = document.querySelector(selector);
  if (!list) return;
  list.innerHTML = '';
  objectives.forEach((objective) => {
    const item = document.createElement('li');
    item.className = 'objective-item';
    item.innerHTML = `
      <div class="objective-head">
        <span class="objective-title">${objective.title}</span>
        <span class="status-pill" data-status="${objective.status}">${labelForStatus(objective.status)}</span>
      </div>
      <div class="objective-meta">Owner: ${objective.owner} - Due: ${formatDate(objective.due)}</div>
      <div class="progress" data-inline-progress style="--value: ${objective.progress || 0}">
        <span class="progress-bar"></span>
      </div>
      <div class="objective-note">${objective.metric}</div>
    `;
    list.appendChild(item);
  });
};

const renderHealthFactors = (selector, factors) => {
  const list = document.querySelector(selector);
  if (!list) return;
  list.innerHTML = '';
  factors.forEach((factor) => {
    const item = document.createElement('li');
    item.className = 'health-item';
    item.innerHTML = `
      <div class="health-row">
        <span class="status-dot" data-status="${factor.status}"></span>
        <div>
          <div class="health-title">${factor.label}</div>
          <div class="health-note">${factor.detail}</div>
        </div>
      </div>
    `;
    list.appendChild(item);
  });
};

const renderResourceList = (selector, resources) => {
  const list = document.querySelector(selector);
  if (!list) return;
  list.innerHTML = '';
  resources.forEach((resource) => {
    const item = document.createElement('li');
    item.className = 'resource-item';
    item.innerHTML = `
      <div class="resource-title">${resource.title}</div>
      <div class="resource-meta">${resource.type ? `${resource.type} - ` : ''}${resource.detail || ''}</div>
      <a href="${resource.link}">Open resource</a>
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

const updateHealthBadge = (view) => {
  document.querySelectorAll('[data-health-badge]').forEach((badge) => {
    badge.dataset.status = view.health.overall_status;
    badge.textContent = `Health: ${view.health.overall_label}`;
  });
};

const initPersonaTabs = () => {
  const tabs = Array.from(document.querySelectorAll('[data-persona]'));
  const panels = Array.from(document.querySelectorAll('[data-persona-panel]'));
  if (!tabs.length || !panels.length) return;

  const setActive = (persona) => {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.persona === persona;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive.toString());
    });
    panels.forEach((panel) => {
      const isActive = panel.dataset.personaPanel === persona;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', (!isActive).toString());
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActive(tab.dataset.persona);
    });
  });

  setActive(tabs[0].dataset.persona);
};

const init = async () => {
  const data = await loadData();
  const view = buildView(data);

  renderTasks(data.onboarding.tasks);
  renderEventList('[data-list="ttv-events"]', view.lists.events, parseDate(data.customer.start_date));
  renderMilestoneList('[data-list="cicd-milestones"]', view.lists.cicdMilestones);
  renderUseCases('[data-list="devops-usecases"]', view.lists.devopsUseCases);
  renderUseCases('[data-list="maturity-map"]', view.lists.devopsUseCases);
  renderObjectives('[data-list="success-plan"]', view.lists.successObjectives);
  renderHealthFactors('[data-list="health-factors"]', view.lists.healthFactors);
  renderResourceList('[data-list="learning-recommended"]', view.lists.learning.recommended || []);
  renderResourceList('[data-list="learning-webinars"]', view.lists.learning.webinars || []);
  renderResourceList('[data-list="learning-templates"]', view.lists.learning.templates || []);
  renderResourceList('[data-list="onboarding-templates"]', view.lists.learning.templates || []);

  updateBindings(view);
  updateProgressBars(view.progressValues);
  updateRing(view.additional.licenseUtil);
  updateChips(view);
  renderTimeline(view);
  updateHealthBadge(view);
  initPersonaTabs();

  document.body.classList.add('loaded');
};

init();
