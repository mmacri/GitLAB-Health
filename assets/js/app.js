'use strict';

const DATA_URL = 'data/dashboard.json';
const STORAGE_KEYS = {
  mode: 'gl-health-mode',
  actions: 'gl-health-action-state',
  overrides: 'gl-health-overrides'
};

const DEFAULT_DATA = {"meta":{"last_updated":"2026-01-20","updated_by":"Jordan Lee","notes":"Monthly health review and renewal readiness update"},"customer":{"name":"Northwind Industries","segment":"Enterprise","plan":"Ultimate","renewal_date":"2026-06-30","deployment_type":"Self-managed","instance_type":"Dedicated instance","start_date":"2025-08-27","csm":"Jordan Lee","tam":"Avery Chen"},"seats":{"purchased":500,"active":210,"utilization_30d_series":[{"date":"2025-11-15","value":0.34},{"date":"2025-12-01","value":0.36},{"date":"2025-12-15","value":0.38},{"date":"2025-12-30","value":0.4},{"date":"2026-01-15","value":0.42}]},"onboarding":{"phase":"First value","completion_pct":0.92,"milestones":{"engagement":{"date":"2025-09-01"},"infra_ready":{"date":"2025-09-15"},"onboarding_complete":{"date":"2025-10-20"},"first_value":{"date":"2025-10-25"},"outcome":{"date":""}},"checklist":[{"task":"Executive kickoff and success criteria aligned","done":true,"date":"2025-08-29"},{"task":"GitLab instance deployed and validated","done":true,"date":"2025-09-10"},{"task":"SSO configured and tested","done":true,"date":"2025-09-12"},{"task":"Pilot teams onboarded","done":true,"date":"2025-09-20"},{"task":"Repository migration complete","done":true,"date":"2025-09-25"},{"task":"CI runners configured","done":true,"date":"2025-09-28"},{"task":"First pipelines running","done":true,"date":"2025-10-02"},{"task":"Security baseline defined","done":true,"date":"2025-10-05"},{"task":"Enablement training delivered","done":true,"date":"2025-10-18"},{"task":"Success plan validated","done":true,"date":"2025-10-20"}],"risks":["License activation below 50% after first value","Limited DevSecOps scanning coverage","Workshop participation below target"]},"adoption":{"platform_adoption_target":3,"use_case_scores":[{"key":"create","name":"Create (SCM)","score":68,"trend_30d_pct":6,"drivers":["Merge request usage growing","Code review coverage at 55%"],"thresholds":["Green >= 76","Yellow 51-75","Red <= 50"],"playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/"},{"key":"verify","name":"Verify (CI)","score":60,"trend_30d_pct":8,"drivers":["CI builds per billable user at 18","Pipeline success rate 72%"],"thresholds":["Green > 40 builds per user","Yellow 3-40","Red <= 2"],"playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/ci-verify/"},{"key":"secure","name":"Secure (DevSecOps)","score":58,"trend_30d_pct":4,"drivers":["Scanner utilization 8%","DAST not enabled"],"thresholds":["Green >= 20% utilization","Yellow 5-19%","Red < 5%"],"playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/"},{"key":"release","name":"Release (CD)","score":55,"trend_30d_pct":2,"drivers":["Deployments per user 1.8","Only 4 teams deploying"],"thresholds":["Green > 7 deployments per user","Yellow 2-7","Red < 2"],"playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/cd-release/"}],"landing_zone":{"phases":[{"key":"pre_engagement","label":"Pre-engagement","goals":["Align executive sponsor","Confirm success criteria"],"tasks":["Document business outcomes","Identify technical champions"],"risks":["Unclear ownership","Undefined success metrics"],"workshops":["Discovery and planning session"],"success_criteria":["Success plan draft approved","Executive sponsor confirmed"]},{"key":"engagement","label":"Engagement","goals":["Kickoff and stakeholder alignment","Success plan baseline"],"tasks":["Hold kickoff","Create collaboration project"],"risks":["Missed stakeholder attendance"],"workshops":["Onboarding kickoff"],"success_criteria":["Kickoff completed","Success plan objectives logged"]},{"key":"infra_ready","label":"Infra ready","goals":["Platform available","SSO and access configured"],"tasks":["Deploy GitLab","Configure SSO","Validate runners"],"risks":["Infrastructure delays","Access issues"],"workshops":["Admin enablement"],"success_criteria":["GitLab production ready","Runners online"]},{"key":"onboarding_complete","label":"Onboarding complete","goals":["Teams onboarded","Training complete"],"tasks":["Migrate repositories","Deliver training sessions"],"risks":["Low training attendance"],"workshops":["CI/Verify workshop"],"success_criteria":["Training completed","Pilot teams live"]},{"key":"first_value","label":"First value","goals":["Reach 10% license activation","First production pipeline"],"tasks":["Enable CI in priority projects","Drive adoption campaigns"],"risks":["Low license utilization","Pipeline instability"],"workshops":["CI/Verify workshop"],"success_criteria":["10% licenses active","First deployment via GitLab"]},{"key":"outcome","label":"Outcome achieved","goals":["Primary use case delivered","Business outcomes verified"],"tasks":["Scale CI/CD coverage","Enable security scans"],"risks":["Outcome lag","Security gaps"],"workshops":["Secure workshop","CD/Release playbook"],"success_criteria":["Use case green","ROI validated"]}]}},"health":{"adoption_score":64,"engagement_score":72,"outcomes_score":58,"overall_score":65,"early_warning_flags":[{"severity":"yellow","title":"Usage drop 22% month over month","detail":"Pipeline activity dipped after holiday freeze","playbook":"https://handbook.gitlab.com/handbook/customer-success/csm/health-score-triage/"},{"severity":"yellow","title":"Engagement decline","detail":"Cadence attendance fell below 70%","playbook":"https://handbook.gitlab.com/handbook/customer-success/customer-health-scoring/"},{"severity":"red","title":"Renewal risk at 162 days","detail":"Success plan objective #2 behind schedule","playbook":"https://handbook.gitlab.com/handbook/customer-success/csm/health-score-triage/"}]},"engagement":{"cadence_attendance_rate":0.76,"last_exec_meeting":"2025-12-18","next_exec_meeting":"2026-03-18","last_ebr_date":"2025-12-18","next_ebr_date":"2026-03-20","last_qbr_date":"2025-10-15","next_qbr_date":"2026-04-15","workshop_participation":0.62,"response_time_days":2.4,"nps":34,"sentiment":"Mixed","cadence_calendar":[{"cadence":"Monthly","focus":"Adoption review","owner":"CSM","next_date":"2026-02-10"},{"cadence":"Quarterly","focus":"Executive business review","owner":"CSM + Exec sponsor","next_date":"2026-03-20"},{"cadence":"Biweekly","focus":"Delivery workshop checkpoint","owner":"DevOps lead","next_date":"2026-02-03"}],"ebr_templates":{"agenda":"EBR Agenda\n1. Executive summary and outcomes\n2. Adoption and health score\n3. Success plan progress\n4. Risks and mitigations\n5. Roadmap alignment\n6. Next quarter priorities","slides":"EBR Slide Outline\n1. Executive summary\n2. Health score and adoption\n3. Success plan objectives\n4. DORA and value streams\n5. Risks and mitigation plan\n6. Roadmap alignment\n7. Next quarter priorities","checklist":"EBR Checklist\n- Confirm KPIs and success plan status\n- Update renewal risk and mitigation\n- Validate DORA and VSA metrics\n- Capture executive feedback"}},"touchpoints":{"email_metrics":{"open_rate":0.42,"ctr":0.08,"response_rate":0.18},"self_service_metrics":{"doc_views":860,"training_completion":0.62,"ticket_deflection":0.24},"in_app_metrics":{"views":320,"clicks":70,"survey_completion":0.56},"digital_health_score":71,"breakdown":{"email":68,"self_service":74,"in_app":70}},"risks":[{"id":"risk-license","severity":"red","driver":"License utilization below 50%","detail":"Only 210 of 500 seats active","owner":"CSM","due_date":"2026-02-15","playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/","mitigation":[{"task":"Launch adoption campaign with team leads","owner":"CSM","due_date":"2026-02-05"},{"task":"Schedule onboarding refresher session","owner":"TAM","due_date":"2026-02-12"}]},{"id":"risk-security","severity":"yellow","driver":"Security scans enabled in only 12% of projects","detail":"SAST not running on regulated apps","owner":"Security lead","due_date":"2026-03-01","playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/","mitigation":[{"task":"Enable SAST and dependency scanning","owner":"Security","due_date":"2026-02-20"},{"task":"Run Secure workshop","owner":"CSM","due_date":"2026-02-28"}]}],"risk_playbooks":{"red":[{"title":"Health score triage","link":"https://handbook.gitlab.com/handbook/customer-success/csm/health-score-triage/"},{"title":"Customer health scoring","link":"https://handbook.gitlab.com/handbook/customer-success/customer-health-scoring/"}],"yellow":[{"title":"Playbooks index","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/"},{"title":"Success plans","link":"https://handbook.gitlab.com/handbook/customer-success/csm/success-plans/"}]},"success_plan":{"next_review":"2026-02-05","objectives":[{"title":"Automate Tier-1 release workflows","status":"in_progress","progress_pct":0.45,"owner":"DevOps lead","target_date":"2026-03-30","evidence":"https://gitlab.com/northwind/collaboration/-/issues/34","dependencies":["Runner scaling","Release pipeline approval"],"next_milestone":"First Tier-1 app release"},{"title":"Expand CI adoption to 60% of projects","status":"in_progress","progress_pct":0.55,"owner":"Platform engineering","target_date":"2026-03-15","evidence":"https://gitlab.com/northwind/collaboration/-/issues/28","dependencies":["CI templates rollout"],"next_milestone":"50% projects with CI"},{"title":"Enable security scanning for regulated apps","status":"at_risk","progress_pct":0.3,"owner":"Security","target_date":"2026-02-28","evidence":"https://gitlab.com/northwind/collaboration/-/issues/41","dependencies":["SAST pipeline updates"],"next_milestone":"SAST baseline enabled"}]},"outcomes":{"value_summary":"Release frequency up 2.5x","value_detail":"Lead time down from 14 to 7 days","narrative":"Delivery velocity improved across Tier-1 services with GitLab CI/CD adoption. The next focus is scaling Secure tooling to regulated apps."},"dora":{"metrics":{"deployment_frequency":{"label":"Deployment frequency","unit":"deploys/day","baseline":0.2,"current":0.6,"target":1.0,"series":[{"date":"2025-11-01","value":0.2},{"date":"2025-12-01","value":0.3},{"date":"2026-01-01","value":0.5},{"date":"2026-01-20","value":0.6}]},"lead_time":{"label":"Lead time for changes","unit":"days","baseline":14,"current":7,"target":3,"series":[{"date":"2025-11-01","value":14},{"date":"2025-12-01","value":10},{"date":"2026-01-01","value":8},{"date":"2026-01-20","value":7}]},"change_failure":{"label":"Change failure rate","unit":"%","baseline":18,"current":11,"target":5,"series":[{"date":"2025-11-01","value":18},{"date":"2025-12-01","value":14},{"date":"2026-01-01","value":12},{"date":"2026-01-20","value":11}]},"mttr":{"label":"Time to restore service","unit":"hours","baseline":10,"current":6,"target":2,"series":[{"date":"2025-11-01","value":10},{"date":"2025-12-01","value":8},{"date":"2026-01-01","value":7},{"date":"2026-01-20","value":6}]}},"levels":{"deployment_frequency":{"elite":1.0,"high":0.2,"medium":0.03},"lead_time":{"elite":1.0,"high":7.0,"medium":30.0},"change_failure":{"elite":5.0,"high":10.0,"medium":20.0},"mttr":{"elite":1.0,"high":24.0,"medium":72.0}}},"vsa":{"lead_time_days":7.2,"cycle_time_days":5.1,"throughput_per_week":18,"bottleneck_stage":"Code review","recommendations":["Introduce merge request templates for faster reviews","Add reviewers to critical paths","Automate approval rules for low-risk changes"]},"collaboration_project":{"url":"https://gitlab.com/northwind/collaboration","open_issues":24,"overdue":5,"comment_velocity":"34 comments/week","templates":{"agenda":"Agenda\n- Progress review\n- Risks and blockers\n- Upcoming workshops\n- Action items","action_items":"Action Items\n- Task\n- Owner\n- Due date\n- Status","escalation":"Escalation\n- Issue description\n- Severity\n- Impact\n- Requested support","success_report":"Success Report\n- Objective\n- Outcome\n- Evidence\n- Next steps"}},"activity":[{"date":"2026-01-18","title":"CI usage review","detail":"Pipeline success rate improved to 72%"},{"date":"2026-01-10","title":"Security workshop scheduled","detail":"Secure enablement set for Feb 20"},{"date":"2026-01-05","title":"Executive summary shared","detail":"Renewal readiness checkpoint sent to sponsor"}],"renewal_readiness":["Success plan objectives mapped to renewal goals","Health score above 60","Executive sponsor aligned on Q2 priorities","Expansion opportunity identified"],"workshops":[{"title":"CI / Verify Workshop","detail":"Half-day enablement for pipeline onboarding","duration":"4 hours","prerequisites":"Runner access and sample project","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/ci-verify/"},{"title":"CD / Release Playbook","detail":"Deployment automation planning","duration":"3 hours","prerequisites":"CI pipeline baseline","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/cd-release/"},{"title":"Secure Workshop","detail":"SAST and dependency scanning rollout","duration":"3 hours","prerequisites":"Security team alignment","link":"https://handbook.gitlab.com/handbook/customer-success/workshops/secure/"}],"resources":{"health":[{"title":"Customer health scoring","detail":"Health score framework and definitions","link":"https://handbook.gitlab.com/handbook/customer-success/customer-health-scoring/"},{"title":"Health score triage","detail":"Guidance for red and yellow accounts","link":"https://handbook.gitlab.com/handbook/customer-success/csm/health-score-triage/"}],"success":[{"title":"Success plans","detail":"Success plan framework and objectives","link":"https://handbook.gitlab.com/handbook/customer-success/csm/success-plans/"}],"onboarding":[{"title":"Customer onboarding","detail":"Onboarding process and milestones","link":"https://handbook.gitlab.com/handbook/customer-success/csm/onboarding/"},{"title":"Cadence calls","detail":"Cadence call structure and expectations","link":"https://handbook.gitlab.com/handbook/customer-success/csm/cadence-calls/"}],"playbooks":[{"title":"CS playbooks index","detail":"Customer Success playbooks catalog","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/"},{"title":"CI / Verify playbook","detail":"CI adoption enablement","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/ci-verify/"},{"title":"CD / Release playbook","detail":"Release adoption enablement","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/cd-release/"}],"ebr":[{"title":"Executive business reviews","detail":"EBR guidance and preparation","link":"https://handbook.gitlab.com/handbook/customer-success/csm/ebr/"}],"collaboration":[{"title":"Customer collaboration project","detail":"Shared project guide","link":"https://handbook.gitlab.com/handbook/customer-success/csm/customer-collaboration-project/"}],"analytics":[{"title":"Value Streams dashboard","detail":"Value Streams dashboard docs","link":"https://docs.gitlab.com/user/analytics/value_streams_dashboard/"},{"title":"DORA metrics","detail":"DORA metrics documentation","link":"https://docs.gitlab.com/user/analytics/dora_metrics/"},{"title":"DORA charts","detail":"DORA charts documentation","link":"https://docs.gitlab.com/user/analytics/dora_metrics_charts/"}]}};

const numberFormat = new Intl.NumberFormat('en-US');
const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDate(value);
  return date ? dateFormat.format(date) : 'TBD';
};

const formatPercent = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '0%';
  return `${Math.round(value * 100)}%`;
};

const formatNumber = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '0';
  return numberFormat.format(value);
};

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((end - start) / MS_PER_DAY);
};

const addDays = (date, days) => {
  const base = date ? new Date(date.getTime()) : new Date();
  base.setDate(base.getDate() + days);
  return base;
};

const loadStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const saveStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const loadData = async () => {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load data');
    return await response.json();
  } catch (error) {
    return DEFAULT_DATA;
  }
};

const bandFromScore = (score) => {
  if (score === undefined || score === null || Number.isNaN(score)) {
    return { label: 'Gray', status: 'watch' };
  }
  if (score <= 50) return { label: 'Red', status: 'risk' };
  if (score <= 75) return { label: 'Yellow', status: 'watch' };
  return { label: 'Green', status: 'good' };
};

const getValue = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);

const mergeOverrides = (data, overrides) => {
  if (!overrides) return data;
  const merged = JSON.parse(JSON.stringify(data));
  if (overrides.health) {
    merged.health = { ...merged.health, ...overrides.health };
  }
  if (overrides.touchpoints_log) {
    merged.activity = [...(merged.activity || []), ...overrides.touchpoints_log];
  }
  return merged;
};

const computeHealthScores = (health) => {
  const adoption = health.adoption_score ?? 0;
  const engagement = health.engagement_score ?? 0;
  const outcomes = health.outcomes_score ?? 0;
  const weighted = adoption * 0.4 + engagement * 0.3 + outcomes * 0.3;
  return {
    adoption,
    engagement,
    outcomes,
    overall: Math.round(weighted)
  };
};

const computeDigitalScore = (touchpoints) => {
  const emailScore = touchpoints.breakdown?.email ?? 0;
  const selfServiceScore = touchpoints.breakdown?.self_service ?? 0;
  const inAppScore = touchpoints.breakdown?.in_app ?? 0;
  const weighted = emailScore * 0.3 + selfServiceScore * 0.4 + inAppScore * 0.3;
  return touchpoints.digital_health_score ?? Math.round(weighted);
};

const computeTrend = (series) => {
  if (!series || series.length < 2) return 0;
  const last = series[series.length - 1].value;
  const prev = series[series.length - 2].value;
  if (prev === 0) return 0;
  return Math.round(((last - prev) / prev) * 100);
};

const computeChange = (current, baseline) => {
  if (!baseline) return 0;
  return Math.round(((current - baseline) / baseline) * 100);
};

const levelForMetric = (key, current, levels) => {
  const metricLevels = levels[key];
  if (!metricLevels || current === undefined || current === null) return 'Unknown';
  if (key === 'deployment_frequency') {
    if (current >= metricLevels.elite) return 'Elite';
    if (current >= metricLevels.high) return 'High';
    if (current >= metricLevels.medium) return 'Medium';
    return 'Low';
  }
  if (current <= metricLevels.elite) return 'Elite';
  if (current <= metricLevels.high) return 'High';
  if (current <= metricLevels.medium) return 'Medium';
  return 'Low';
};

const formatMetricValue = (value, unit) => {
  if (value === undefined || value === null) return '0';
  if (unit === '%') return `${value}%`;
  return `${value} ${unit}`.trim();
};

const statusFromSeverity = (severity) => {
  if (!severity) return 'watch';
  if (severity === 'red') return 'risk';
  if (severity === 'yellow') return 'watch';
  return 'good';
};

const buildMilestones = (data) => {
  const milestones = data.onboarding?.milestones || {};
  const startDate = parseDate(data.customer?.start_date);
  const computeStatus = (date) => (date ? { status: 'Complete', statusKey: 'complete' } : { status: 'In progress', statusKey: 'in_progress' });
  const buildDetail = (date) => {
    const parsed = parseDate(date);
    if (!parsed || !startDate) return 'In progress';
    const day = daysBetween(startDate, parsed);
    return `Day ${day} | ${formatDate(parsed)}`;
  };
  return {
    engagement: { ...computeStatus(milestones.engagement?.date), detail: buildDetail(milestones.engagement?.date) },
    infra_ready: { ...computeStatus(milestones.infra_ready?.date), detail: buildDetail(milestones.infra_ready?.date) },
    onboarding_complete: { ...computeStatus(milestones.onboarding_complete?.date), detail: buildDetail(milestones.onboarding_complete?.date) },
    first_value: { ...computeStatus(milestones.first_value?.date), detail: buildDetail(milestones.first_value?.date) },
    outcome: { ...computeStatus(milestones.outcome?.date), detail: milestones.outcome?.date ? buildDetail(milestones.outcome?.date) : 'In progress' }
  };
};

const buildActivityFeed = (data) => {
  const activity = data.activity || [];
  return [...activity].sort((a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0));
};

const buildEbrDates = (engagement) => {
  return [
    { label: 'Last EBR', value: formatDate(engagement.last_ebr_date) },
    { label: 'Next EBR', value: formatDate(engagement.next_ebr_date) },
    { label: 'Last QBR', value: formatDate(engagement.last_qbr_date) },
    { label: 'Next QBR', value: formatDate(engagement.next_qbr_date) }
  ];
};

const buildNextActions = (data, healthScores, digitalScore) => {
  const actions = [];
  const lastUpdated = parseDate(data.meta?.last_updated) || new Date();
  const seatUtil = data.seats?.purchased ? data.seats.active / data.seats.purchased : 0;
  if (seatUtil < 0.5) {
    actions.push({
      id: 'license-activation',
      title: 'Drive license activation campaign',
      why: 'Seat utilization below 50%',
      owner: data.customer?.csm || 'CSM',
      due_date: formatDate(addDays(lastUpdated, 14)),
      link: 'https://handbook.gitlab.com/handbook/customer-success/customer-health-scoring/'
    });
  }
  const verifyUseCase = (data.adoption?.use_case_scores || []).find((useCase) => useCase.key === 'verify');
  if (verifyUseCase && verifyUseCase.score < 76) {
    actions.push({
      id: 'verify-workshop',
      title: 'Schedule CI / Verify workshop',
      why: `Verify score ${verifyUseCase.score} (${bandFromScore(verifyUseCase.score).label})`,
      owner: data.customer?.tam || 'TAM',
      due_date: formatDate(addDays(lastUpdated, 21)),
      link: verifyUseCase.playbook
    });
  }
  if (healthScores.outcomes < 60) {
    actions.push({
      id: 'success-plan-review',
      title: 'Review success plan outcomes',
      why: `Outcomes score ${healthScores.outcomes}`,
      owner: data.customer?.csm || 'CSM',
      due_date: formatDate(parseDate(data.success_plan?.next_review) || addDays(lastUpdated, 10)),
      link: 'https://handbook.gitlab.com/handbook/customer-success/csm/success-plans/'
    });
  }
  if (digitalScore < 70) {
    actions.push({
      id: 'digital-engagement',
      title: 'Increase digital touchpoints',
      why: `Digital health ${digitalScore}`,
      owner: 'Customer marketing',
      due_date: formatDate(addDays(lastUpdated, 14)),
      link: 'https://handbook.gitlab.com/handbook/customer-success/csm/cadence-calls/'
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: 'keep-momentum',
      title: 'Maintain momentum with monthly adoption review',
      why: 'All key signals are on track',
      owner: data.customer?.csm || 'CSM',
      due_date: formatDate(addDays(lastUpdated, 30)),
      link: 'https://handbook.gitlab.com/handbook/customer-success/csm/cadence-calls/'
    });
  }
  return actions;
};

const buildView = (data, overrides, actionState) => {
  const merged = mergeOverrides(data, overrides);
  const lastUpdated = parseDate(merged.meta?.last_updated) || new Date();
  const renewalDate = parseDate(merged.customer?.renewal_date);
  const renewalCountdown = renewalDate ? `${daysBetween(lastUpdated, renewalDate)} days` : '0 days';

  const seatUtil = merged.seats?.purchased ? merged.seats.active / merged.seats.purchased : 0;
  const seatTrend = computeTrend(merged.seats?.utilization_30d_series || []);

  const healthScores = computeHealthScores(merged.health || {});
  const healthBand = bandFromScore(healthScores.overall);
  const digitalScore = computeDigitalScore(merged.touchpoints || {});
  const digitalBand = bandFromScore(digitalScore);

  const useCases = merged.adoption?.use_case_scores || [];
  const greenUseCases = useCases.filter((useCase) => useCase.score >= 76).length;
  const platformTarget = merged.adoption?.platform_adoption_target || 3;

  const recommendedUseCase = [...useCases].sort((a, b) => a.score - b.score)[0];
  const recommendedWorkshop = recommendedUseCase?.name || 'Adoption workshop';
  const firstDriver = recommendedUseCase?.drivers?.[0];
  const recommendedReason = recommendedUseCase
    ? `Score ${recommendedUseCase.score}${firstDriver ? ` with driver: ${firstDriver}` : ''}`
    : 'Focus on the next use case to move to green.';

  const successObjectives = merged.success_plan?.objectives || [];
  const onTrack = successObjectives.filter((objective) => objective.status !== 'at_risk').length;
  const successSummary = successObjectives.length
    ? `${onTrack} of ${successObjectives.length} objectives on track`
    : 'No objectives defined';

  const engagement = merged.engagement || {};

  return {
    meta: {
      last_updated: formatDate(merged.meta?.last_updated)
    },
    customer: {
      ...merged.customer,
      renewal_date: formatDate(merged.customer?.renewal_date),
      renewal_countdown: renewalCountdown
    },
    seats: {
      purchased: formatNumber(merged.seats?.purchased || 0),
      active: formatNumber(merged.seats?.active || 0),
      utilization_pct: formatPercent(seatUtil),
      utilization_trend: `${seatTrend >= 0 ? '+' : ''}${seatTrend}% MoM`
    },
    health: {
      adoption_score: healthScores.adoption,
      engagement_score: healthScores.engagement,
      outcomes_score: healthScores.outcomes,
      overall_score: healthScores.overall,
      band_label: healthBand.label,
      band_status: healthBand.status
    },
    touchpoints: {
      digital_health_score: digitalScore,
      digital_health_label: digitalBand.label,
      digital_health_status: digitalBand.status
    },
    adoption: {
      platform_adoption_summary: `${greenUseCases} of ${useCases.length} use cases green`,
      platform_adoption_target: `Target ${platformTarget}+`,
      recommended_workshop: recommendedWorkshop,
      recommended_reason: recommendedReason,
      recommended_link: recommendedUseCase?.playbook || 'https://handbook.gitlab.com/handbook/customer-success/playbooks/'
    },
    engagement: {
      next_ebr_date: `Next EBR: ${formatDate(engagement.next_ebr_date)}`,
      last_ebr_date: formatDate(engagement.last_ebr_date),
      next_qbr_date: formatDate(engagement.next_qbr_date)
    },
    success_plan: {
      progress_summary: successSummary,
      next_review: formatDate(merged.success_plan?.next_review)
    },
    outcomes: {
      ...merged.outcomes
    },
    vsa: {
      bottleneck_stage: merged.vsa?.bottleneck_stage || 'TBD'
    },
    collaboration_project: {
      url: merged.collaboration_project?.url || ''
    },
    milestones: buildMilestones(merged),
    progress: {
      health_adoption: clamp(healthScores.adoption / 100),
      health_engagement: clamp(healthScores.engagement / 100),
      health_outcomes: clamp(healthScores.outcomes / 100)
    },
    lists: {
      seatTrend: merged.seats?.utilization_30d_series || [],
      renewalChecklist: merged.renewal_readiness || [],
      onboardingTasks: merged.onboarding?.checklist || [],
      onboardingRisks: merged.onboarding?.risks || [],
      useCaseSummary: useCases.map((useCase) => ({
        name: useCase.name,
        status: bandFromScore(useCase.score).status,
        note: `Score ${useCase.score} (${bandFromScore(useCase.score).label})`
      })),
      useCaseCards: useCases,
      activityFeed: buildActivityFeed(merged),
      earlyWarnings: merged.health?.early_warning_flags || [],
      risks: merged.risks || [],
      riskPlaybooks: merged.risk_playbooks || {},
      successPlan: merged.success_plan?.objectives || [],
      dora: merged.dora || {},
      vsa: merged.vsa || {},
      digitalBreakdown: merged.touchpoints || {},
      cadenceCalendar: merged.engagement?.cadence_calendar || [],
      ebrDates: buildEbrDates(merged.engagement || {}),
      workshops: merged.workshops || [],
      collaboration: merged.collaboration_project || {},
      resources: merged.resources || {},
      landingZone: merged.adoption?.landing_zone || { phases: [] },
      nextActions: buildNextActions(merged, healthScores, digitalScore)
    },
    templates: {
      ebr_agenda: merged.engagement?.ebr_templates?.agenda || '',
      ebr_slides: merged.engagement?.ebr_templates?.slides || '',
      ebr_checklist: merged.engagement?.ebr_templates?.checklist || '',
      collab_agenda: merged.collaboration_project?.templates?.agenda || '',
      collab_action_items: merged.collaboration_project?.templates?.action_items || '',
      collab_escalation: merged.collaboration_project?.templates?.escalation || '',
      collab_success_report: merged.collaboration_project?.templates?.success_report || ''
    },
    onboarding: {
      phase: merged.onboarding?.phase || ''
    },
    actionState: actionState || {}
  };
};

const setText = (el, value) => {
  if (value === undefined || value === null) return;
  if (el.tagName === 'A') {
    el.setAttribute('href', value);
    return;
  }
  el.textContent = value;
};

const applyBindings = (view) => {
  document.querySelectorAll('[data-field]').forEach((el) => {
    const path = el.dataset.field;
    const value = getValue(view, path);
    if (value !== undefined) {
      setText(el, value);
    }
  });
};

const updateHealthStatus = (view) => {
  document.querySelectorAll('[data-health-score]').forEach((el) => {
    el.dataset.status = view.health.band_status;
  });
  document.querySelectorAll('[data-digital-score]').forEach((el) => {
    el.dataset.status = view.touchpoints.digital_health_status;
  });
};

const updateProgressBars = (view) => {
  document.querySelectorAll('[data-progress]').forEach((el) => {
    const key = el.dataset.progress;
    const value = view.progress[key] ?? 0;
    const pct = Math.round(value * 100);
    const bar = el.querySelector('.progress-bar');
    if (bar) bar.style.width = `${pct}%`;
    el.setAttribute('aria-valuenow', pct);
  });
};

const updateRing = (view) => {
  const ring = document.querySelector('[data-ring="seat_utilization"]');
  if (!ring) return;
  const value = view.seats.utilization_pct ? parseFloat(view.seats.utilization_pct) / 100 : 0;
  ring.style.setProperty('--value', clamp(value));
};

const updateTimeline = (view) => {
  document.querySelectorAll('[data-milestone]').forEach((el) => {
    const key = el.dataset.milestone;
    const milestone = view.milestones[key];
    if (milestone?.statusKey) {
      el.dataset.status = milestone.statusKey === 'complete' ? 'complete' : '';
    }
  });
};

const renderEventList = (list, items, build) => {
  if (!list) return;
  list.innerHTML = '';
  items.forEach((item) => {
    list.appendChild(build(item));
  });
};

const renderSeatTrend = (list, items) => {
  renderEventList(list, items, (item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `
      <div class="event-title">${formatDate(item.date)}</div>
      <div class="event-meta">${formatPercent(item.value)}</div>
    `;
    return li;
  });
};

const renderRenewalChecklist = (list, items) => {
  renderEventList(list, items, (item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `<div class="event-title">${item}</div>`;
    return li;
  });
};

const renderActivityFeed = (list, items) => {
  renderEventList(list, items, (item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    const meta = formatDate(item.date);
    li.innerHTML = `
      <div class="event-title">${item.title}</div>
      <div class="event-meta">${meta} | ${item.detail}</div>
    `;
    return li;
  });
};

const renderTaskList = (list, items) => {
  if (!list) return;
  list.innerHTML = '';
  items.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task${task.done ? ' is-done' : ''}`;
    li.innerHTML = `
      <span class="task-indicator"></span>
      <div>
        <div class="task-title">${task.task}</div>
        <div class="task-meta">${task.date ? formatDate(task.date) : 'Pending'}</div>
      </div>
    `;
    list.appendChild(li);
  });
};

const renderSimpleEventList = (list, items) => {
  renderEventList(list, items, (item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `<div class="event-title">${item}</div>`;
    return li;
  });
};

const renderUsecaseSummary = (list, items) => {
  if (!list) return;
  list.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'usecase-item';
    li.innerHTML = `
      <span class="status-dot" data-status="${item.status}"></span>
      <div>
        <div class="usecase-title">${item.name}</div>
        <div class="usecase-note">${item.note}</div>
      </div>
    `;
    list.appendChild(li);
  });
};

const renderUsecaseCards = (container, items) => {
  if (!container) return;
  container.innerHTML = '';
  items.forEach((useCase) => {
    const band = bandFromScore(useCase.score);
    const card = document.createElement('article');
    card.className = 'card usecase-card';
    const trend = useCase.trend_30d_pct ?? 0;
    const trendLabel = `${trend >= 0 ? '+' : ''}${trend}% vs last 30d`;
    const drivers = useCase.drivers || [];
    const thresholds = useCase.thresholds || [];
    const playbook = useCase.playbook || 'https://handbook.gitlab.com/handbook/customer-success/playbooks/';
    card.innerHTML = `
      <div class="metric-head">
        <div>
          <h3>${useCase.name}</h3>
          <p class="muted">${trendLabel}</p>
        </div>
        <div class="usecase-badges">
          <div class="usecase-score" data-status="${band.status}">
            <span class="score-num">${useCase.score}</span>
            <span class="score-label">${band.label}</span>
          </div>
          <span class="status-pill" data-status="${band.status}">${band.label}</span>
        </div>
      </div>
      <div class="usecase-metrics">
        ${drivers
          .map(
            (driver) => `
          <div class="metric-row">
            <span class="status-dot" data-status="${band.status}"></span>
            <div>
              <div class="metric-name">${driver}</div>
              <div class="metric-meta">Driver</div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="usecase-criteria">Thresholds: ${thresholds.join(' | ')}</div>
      <a class="inline-link" href="${playbook}" target="_blank" rel="noopener">Open playbook</a>
    `;
    container.appendChild(card);
  });
};

const renderHealthList = (list, items) => {
  if (!list) return;
  list.innerHTML = '';
  items.forEach((item) => {
    const status = statusFromSeverity(item.severity);
    const li = document.createElement('li');
    li.className = 'health-item';
    li.innerHTML = `
      <span class="status-dot" data-status="${status}"></span>
      <div>
        <div class="health-title">${item.title}</div>
        <div class="health-note">${item.detail}</div>
        <a class="inline-link" href="${item.playbook}" target="_blank" rel="noopener">Playbook</a>
      </div>
    `;
    list.appendChild(li);
  });
};

const renderRiskRegister = (container, items) => {
  if (!container) return;
  container.innerHTML = '';
  items.forEach((risk) => {
    const card = document.createElement('article');
    card.className = 'risk-card';
    const mitigation = risk.mitigation || [];
    card.innerHTML = `
      <div class="metric-head">
        <span class="risk-severity" data-status="${risk.severity}">${risk.severity.toUpperCase()}</span>
        <span class="event-meta">Due ${formatDate(risk.due_date)}</span>
      </div>
      <h4>${risk.driver}</h4>
      <p class="muted">${risk.detail}</p>
      <div class="metric-meta">Owner: ${risk.owner}</div>
      <ul class="mini-list">
        ${mitigation
          .map(
            (task) => `
          <li class="mini-item">${task.task} | ${task.owner} | ${formatDate(task.due_date)}</li>
        `
          )
          .join('')}
      </ul>
      <a class="inline-link" href="${risk.playbook}" target="_blank" rel="noopener">Open playbook</a>
    `;
    container.appendChild(card);
  });
};

const renderResourceList = (list, items) => {
  if (!list) return;
  list.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'resource-item';
    li.innerHTML = `
      <span class="resource-title">${item.title}</span>
      <span class="resource-meta">${item.detail}</span>
      <a href="${item.link}" target="_blank" rel="noopener">Open</a>
    `;
    list.appendChild(li);
  });
};

const renderSuccessPlan = (container, items) => {
  if (!container) return;
  container.innerHTML = '';
  items.forEach((objective) => {
    const band = objective.status === 'at_risk' ? 'risk' : objective.status === 'complete' ? 'good' : 'watch';
    const card = document.createElement('article');
    card.className = 'success-item';
    const dependencies = objective.dependencies || [];
    card.innerHTML = `
      <h4>${objective.title}</h4>
      <div class="success-meta">Owner: ${objective.owner} | Target: ${formatDate(objective.target_date)}</div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(
        objective.progress_pct * 100
      )}">
        <span class="progress-bar" style="width: ${Math.round(objective.progress_pct * 100)}%"></span>
      </div>
      <div class="success-meta">Status: <span class="status-pill" data-status="${band}">${objective.status.replace('_', ' ')}</span></div>
      <div class="success-meta">Next milestone: ${objective.next_milestone}</div>
      <div class="success-meta">Dependencies: ${dependencies.join(', ')}</div>
      <a class="inline-link" href="${objective.evidence}" target="_blank" rel="noopener">Evidence</a>
    `;
    container.appendChild(card);
  });
};

const renderDoraCards = (container, dora, objectives) => {
  if (!container) return;
  container.innerHTML = '';
  const metrics = dora.metrics || {};
  const levels = dora.levels || {};
  const objectiveTitle = objectives?.[0]?.title || 'Success plan objective';

  Object.keys(metrics).forEach((key) => {
    const metric = metrics[key];
    const series = metric.series || [];
    const current = metric.current;
    const baseline = metric.baseline;
    const level = levelForMetric(key, current, levels);

    const last = series[series.length - 1]?.value ?? current;
    const prev30 = series[series.length - 2]?.value ?? baseline;
    const prev60 = series[series.length - 3]?.value ?? baseline;
    const prev90 = series[series.length - 4]?.value ?? baseline;

    const trend30 = computeChange(last, prev30);
    const trend60 = computeChange(last, prev60);
    const trend90 = computeChange(last, prev90);

    const card = document.createElement('article');
    card.className = 'card dora-card';
    card.innerHTML = `
      <div class="metric-head">
        <h3>${metric.label}</h3>
        <span class="status-pill" data-status="${level === 'Elite' ? 'good' : level === 'Low' ? 'risk' : 'watch'}">${level}</span>
      </div>
      <div class="dora-value">${formatMetricValue(current, metric.unit)}</div>
      <div class="metric-meta">Baseline ${formatMetricValue(baseline, metric.unit)} | Target ${formatMetricValue(
        metric.target,
        metric.unit
      )}</div>
      <ul class="mini-list">
        <li class="mini-item">30d ${trend30 >= 0 ? '+' : ''}${trend30}%</li>
        <li class="mini-item">60d ${trend60 >= 0 ? '+' : ''}${trend60}%</li>
        <li class="mini-item">90d ${trend90 >= 0 ? '+' : ''}${trend90}%</li>
      </ul>
      <div class="metric-meta">Aligned to: ${objectiveTitle}</div>
    `;
    container.appendChild(card);
  });
};

const renderVsaMetrics = (list, vsa) => {
  if (!list) return;
  const lead = vsa.lead_time_days ?? 0;
  const cycle = vsa.cycle_time_days ?? 0;
  const throughput = vsa.throughput_per_week ?? 0;
  const items = [
    { label: 'Lead time', value: `${lead} days` },
    { label: 'Cycle time', value: `${cycle} days` },
    { label: 'Throughput', value: `${throughput} items/week` }
  ];
  renderEventList(list, items, (item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `
      <div class="event-title">${item.label}</div>
      <div class="event-meta">${item.value}</div>
    `;
    return li;
  });
};

const renderRecommendations = (list, items) => {
  renderSimpleEventList(list, items);
};

const renderDigitalBreakdown = (list, touchpoints) => {
  if (!list) return;
  const items = [
    `Email open rate ${formatPercent(touchpoints.email_metrics?.open_rate || 0)}`,
    `Email CTR ${formatPercent(touchpoints.email_metrics?.ctr || 0)}`,
    `Email response rate ${formatPercent(touchpoints.email_metrics?.response_rate || 0)}`,
    `Doc views ${formatNumber(touchpoints.self_service_metrics?.doc_views || 0)}`,
    `Training completion ${formatPercent(touchpoints.self_service_metrics?.training_completion || 0)}`,
    `Ticket deflection ${formatPercent(touchpoints.self_service_metrics?.ticket_deflection || 0)}`,
    `In-app views ${formatNumber(touchpoints.in_app_metrics?.views || 0)}`,
    `In-app clicks ${formatNumber(touchpoints.in_app_metrics?.clicks || 0)}`,
    `Survey completion ${formatPercent(touchpoints.in_app_metrics?.survey_completion || 0)}`
  ];
  renderSimpleEventList(list, items);
};

const renderCadenceCalendar = (list, items) => {
  renderEventList(list, items, (item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `
      <div class="event-title">${item.cadence} | ${item.focus}</div>
      <div class="event-meta">Owner: ${item.owner} | Next: ${formatDate(item.next_date)}</div>
    `;
    return li;
  });
};

const renderEbrDates = (list, items) => {
  renderEventList(list, items, (item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `
      <div class="event-title">${item.label}</div>
      <div class="event-meta">${item.value}</div>
    `;
    return li;
  });
};

const renderWorkshops = (container, items) => {
  if (!container) return;
  container.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p class="muted">${item.detail}</p>
      <div class="metric-meta">Duration: ${item.duration}</div>
      <div class="metric-meta">Prereqs: ${item.prerequisites}</div>
      <a class="inline-link" href="${item.link}" target="_blank" rel="noopener">Open guide</a>
    `;
    container.appendChild(card);
  });
};

const renderCollaborationMetrics = (list, collab) => {
  if (!list) return;
  const items = [
    `Open issues: ${formatNumber(collab.open_issues || 0)}`,
    `Overdue items: ${formatNumber(collab.overdue || 0)}`,
    `Comment velocity: ${collab.comment_velocity || 'N/A'}`
  ];
  renderSimpleEventList(list, items);
};

const renderNextActions = (list, actions, actionState, onToggle) => {
  if (!list) return;
  list.innerHTML = '';
  actions.forEach((action) => {
    const li = document.createElement('li');
    li.className = 'action-task';
    const checked = actionState[action.id];
    li.innerHTML = `
      <label class="action-check">
        <input type="checkbox" data-action-id="${action.id}" ${checked ? 'checked' : ''} />
        <span class="action-title">${action.title}</span>
      </label>
      <div class="action-meta">Why: ${action.why}</div>
      <div class="action-meta">Owner: ${action.owner} | Due ${action.due_date}</div>
      <a class="inline-link" href="${action.link}" target="_blank" rel="noopener">Playbook</a>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('[data-action-id]').forEach((input) => {
    input.addEventListener('change', (event) => {
      const id = event.target.dataset.actionId;
      onToggle(id, event.target.checked);
    });
  });
};

const renderTemplates = (templates) => {
  document.querySelectorAll('[data-template]').forEach((el) => {
    const key = el.dataset.template;
    el.textContent = templates[key] || '';
  });
};

const initTemplateCopy = (templates) => {
  document.querySelectorAll('[data-copy-template]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.copyTemplate;
      await copyToClipboard(templates[key] || '');
      flashButton(btn, 'Copied');
    });
  });
};

const initLandingZone = (view) => {
  const select = document.querySelector('[data-landing-zone-select]');
  if (!select) return;
  const phases = view.lists.landingZone.phases || [];
  select.innerHTML = '';
  phases.forEach((phase) => {
    const option = document.createElement('option');
    option.value = phase.key;
    option.textContent = phase.label;
    select.appendChild(option);
  });
  const match = phases.find((phase) => phase.label.toLowerCase() === view.onboarding.phase.toLowerCase());
  select.value = match ? match.key : phases[0]?.key;

  const renderPhase = () => {
    const active = phases.find((phase) => phase.key === select.value) || phases[0];
    if (!active) return;
    renderSimpleEventList(document.querySelector('[data-landing-zone="goals"]'), active.goals || []);
    renderSimpleEventList(document.querySelector('[data-landing-zone="tasks"]'), active.tasks || []);
    renderSimpleEventList(document.querySelector('[data-landing-zone="risks"]'), active.risks || []);
    renderSimpleEventList(document.querySelector('[data-landing-zone="workshops"]'), active.workshops || []);
    renderSimpleEventList(document.querySelector('[data-landing-zone="criteria"]'), active.success_criteria || []);
  };

  select.addEventListener('change', renderPhase);
  renderPhase();
};

const initCollabModal = (templates) => {
  const select = document.querySelector('[data-collab-template]');
  const textarea = document.querySelector('[data-collab-body]');
  if (!select || !textarea) return;
  const options = [
    { key: 'collab_agenda', label: 'Agenda' },
    { key: 'collab_action_items', label: 'Action items' },
    { key: 'collab_escalation', label: 'Escalation' },
    { key: 'collab_success_report', label: 'Success report' }
  ];
  select.innerHTML = '';
  options.forEach((option) => {
    const el = document.createElement('option');
    el.value = option.key;
    el.textContent = option.label;
    select.appendChild(el);
  });
  const updateBody = () => {
    textarea.value = templates[select.value] || '';
  };
  select.addEventListener('change', updateBody);
  updateBody();
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
};

const flashButton = (btn, label) => {
  const original = btn.textContent;
  btn.textContent = label;
  setTimeout(() => {
    btn.textContent = original;
  }, 1200);
};

const initDetailsControls = () => {
  document.querySelectorAll('[data-details-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const scope = btn.closest('[data-details-scope]');
      if (!scope) return;
      const details = scope.querySelectorAll('details');
      const shouldOpen = btn.dataset.detailsAction === 'expand';
      details.forEach((detail) => {
        detail.open = shouldOpen;
      });
    });
  });
};

const initModeSwitch = () => {
  const buttons = [...document.querySelectorAll('[data-mode]')];
  const setMode = (mode, persist = true) => {
    document.documentElement.dataset.mode = mode;
    buttons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.mode === mode));
    if (persist) {
      saveStorage(STORAGE_KEYS.mode, mode);
    }
  };
  const params = new URLSearchParams(window.location.search);
  const paramMode = params.get('mode');
  const storedMode = loadStorage(STORAGE_KEYS.mode, 'all');
  const initialMode = ['all', 'exec', 'devops', 'csm'].includes(paramMode) ? paramMode : storedMode;
  setMode(initialMode, false);

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  return () => document.documentElement.dataset.mode || 'all';
};

const initNavSpy = () => {
  const links = [...document.querySelectorAll('[data-nav-link]')];
  const sections = [...document.querySelectorAll('[data-section]')];

  let activeId = null;
  const setActive = (id) => {
    if (!id || activeId === id) return;
    activeId = id;
    links.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    { rootMargin: '-40% 0px -50% 0px' }
  );

  sections.forEach((section) => observer.observe(section));

  return () => activeId;
};

const initPalette = (view) => {
  const palette = document.getElementById('palette');
  const input = document.getElementById('palette-input');
  const results = document.getElementById('palette-results');
  if (!palette || !input || !results) return { open: () => {} };

  let items = [];
  let filtered = [];
  let activeIndex = 0;
  let currentView = view;

  const buildIndex = () => {
    items = [];
    document.querySelectorAll('[data-section]').forEach((section) => {
      const heading = section.querySelector('h2');
      if (!heading) return;
      items.push({
        label: heading.textContent.trim(),
        meta: 'Section',
        type: 'section',
        target: `#${section.id}`
      });
    });

    (currentView.lists.workshops || []).forEach((workshop) => {
      items.push({
        label: workshop.title,
        meta: 'Workshop',
        type: 'link',
        target: workshop.link
      });
    });

    (currentView.lists.useCaseCards || []).forEach((useCase) => {
      items.push({
        label: useCase.name,
        meta: 'Use case score',
        type: 'section',
        target: '#adoption'
      });
    });

    const doraMetrics = currentView.lists.dora?.metrics || {};
    Object.keys(doraMetrics).forEach((key) => {
      items.push({
        label: doraMetrics[key].label,
        meta: 'DORA metric',
        type: 'section',
        target: '#outcomes'
      });
    });

    const resources = currentView.lists.resources || {};
    Object.keys(resources).forEach((group) => {
      resources[group].forEach((resource) => {
        items.push({
          label: resource.title,
          meta: 'Resource',
          type: 'link',
          target: resource.link
        });
      });
    });

    const templates = currentView.templates || {};
    Object.keys(templates).forEach((key) => {
      items.push({
        label: key.replace(/_/g, ' '),
        meta: 'Template',
        type: 'template',
        target: templates[key]
      });
    });
  };

  const renderResults = () => {
    results.innerHTML = '';
    filtered.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = `palette-item${index === activeIndex ? ' is-active' : ''}`;
      li.innerHTML = `
        <span class="palette-label">${item.label}</span>
        <span class="palette-meta">${item.meta}</span>
      `;
      li.addEventListener('click', () => selectItem(item));
      results.appendChild(li);
    });
  };

  const filterItems = () => {
    const query = input.value.trim().toLowerCase();
    filtered = items.filter((item) => item.label.toLowerCase().includes(query));
    activeIndex = 0;
    renderResults();
  };

  const selectItem = async (item) => {
    if (!item) return;
    if (item.type === 'section') {
      window.location.hash = item.target;
    } else if (item.type === 'link') {
      window.open(item.target, '_blank', 'noopener');
    } else if (item.type === 'template') {
      await copyToClipboard(item.target);
    }
    closePalette();
  };

  const openPalette = () => {
    buildIndex();
    filtered = items;
    activeIndex = 0;
    palette.classList.add('is-open');
    palette.setAttribute('aria-hidden', 'false');
    input.value = '';
    renderResults();
    input.focus();
  };

  const closePalette = () => {
    palette.classList.remove('is-open');
    palette.setAttribute('aria-hidden', 'true');
  };

  input.addEventListener('input', filterItems);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      renderResults();
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderResults();
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      selectItem(filtered[activeIndex]);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  });

  document.querySelectorAll('[data-open-palette]').forEach((btn) => {
    btn.addEventListener('click', openPalette);
  });

  document.querySelectorAll('[data-close-palette]').forEach((btn) => {
    btn.addEventListener('click', closePalette);
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openPalette();
    }
    if (event.key === 'Escape' && palette.classList.contains('is-open')) {
      closePalette();
    }
  });

  const update = (nextView) => {
    currentView = nextView;
  };

  return { open: openPalette, update };
};

const initQuickActions = (getMode, getSection) => {
  document.querySelectorAll('[data-share-link]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', getMode());
      const section = getSection();
      if (section) {
        url.hash = `#${section}`;
      }
      await copyToClipboard(url.toString());
      flashButton(btn, 'Copied');
    });
  });
};

const initModals = (state, refresh) => {
  const openDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  };

  const closeDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  };

  const healthModal = document.getElementById('health-modal');
  const touchpointModal = document.getElementById('touchpoint-modal');
  const collabModal = document.getElementById('collab-modal');

  document.querySelectorAll('[data-open-health]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const form = healthModal?.querySelector('form');
      if (form && state.view) {
        form.elements.adoption_score.value = state.view.health.adoption_score;
        form.elements.engagement_score.value = state.view.health.engagement_score;
        form.elements.outcomes_score.value = state.view.health.outcomes_score;
      }
      openDialog(healthModal);
    });
  });

  document.querySelectorAll('[data-open-touchpoint]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const form = touchpointModal?.querySelector('form');
      if (form) {
        form.elements.date.value = new Date().toISOString().slice(0, 10);
      }
      openDialog(touchpointModal);
    });
  });

  document.querySelectorAll('[data-open-collab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openDialog(collabModal);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeDialog(btn.closest('dialog'));
    });
  });

  healthModal?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    state.overrides.health = {
      adoption_score: Number(form.elements.adoption_score.value),
      engagement_score: Number(form.elements.engagement_score.value),
      outcomes_score: Number(form.elements.outcomes_score.value)
    };
    saveStorage(STORAGE_KEYS.overrides, state.overrides);
    closeDialog(healthModal);
    refresh();
  });

  touchpointModal?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const entry = {
      date: form.elements.date.value,
      title: `${form.elements.channel.value} touchpoint`,
      detail: form.elements.summary.value
    };
    state.overrides.touchpoints_log = [...(state.overrides.touchpoints_log || []), entry];
    saveStorage(STORAGE_KEYS.overrides, state.overrides);
    closeDialog(touchpointModal);
    refresh();
  });

  document.querySelectorAll('[data-copy-collab]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const textarea = collabModal?.querySelector('[data-collab-body]');
      if (textarea) {
        await copyToClipboard(textarea.value);
        flashButton(btn, 'Copied');
      }
    });
  });
};

const initExport = () => {
  document.querySelectorAll('[data-export-ebr]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = new URL('print/ebr.html', window.location.href);
      window.open(url.toString(), '_blank', 'noopener');
    });
  });
};

const render = (view, state) => {
  applyBindings(view);
  updateHealthStatus(view);
  updateProgressBars(view);
  updateRing(view);
  updateTimeline(view);

  renderSeatTrend(document.querySelector('[data-list="seat-trend"]'), view.lists.seatTrend);
  renderRenewalChecklist(document.querySelector('[data-list="renewal-checklist"]'), view.lists.renewalChecklist);
  renderActivityFeed(document.querySelector('[data-list="activity-feed"]'), view.lists.activityFeed);
  renderTaskList(document.querySelector('[data-list="onboarding-tasks"]'), view.lists.onboardingTasks);
  renderSimpleEventList(document.querySelector('[data-list="onboarding-risks"]'), view.lists.onboardingRisks);
  renderUsecaseSummary(document.querySelector('[data-list="usecase-summary"]'), view.lists.useCaseSummary);
  renderUsecaseCards(document.querySelector('[data-usecase-cards]'), view.lists.useCaseCards);
  renderHealthList(document.querySelector('[data-list="early-warnings"]'), view.lists.earlyWarnings);
  renderRiskRegister(document.querySelector('[data-list="risk-register"]'), view.lists.risks);
  renderResourceList(document.querySelector('[data-list="risk-playbooks-red"]'), view.lists.riskPlaybooks.red || []);
  renderResourceList(document.querySelector('[data-list="risk-playbooks-yellow"]'), view.lists.riskPlaybooks.yellow || []);
  renderSuccessPlan(document.querySelector('[data-list="success-plan"]'), view.lists.successPlan);
  renderDoraCards(document.querySelector('[data-list="dora-cards"]'), view.lists.dora, view.lists.successPlan);
  renderVsaMetrics(document.querySelector('[data-list="vsa-metrics"]'), view.lists.vsa);
  renderRecommendations(document.querySelector('[data-list="vsa-recommendations"]'), view.lists.vsa.recommendations || []);
  renderDigitalBreakdown(document.querySelector('[data-list="digital-breakdown"]'), view.lists.digitalBreakdown);
  renderCadenceCalendar(document.querySelector('[data-list="cadence-calendar"]'), view.lists.cadenceCalendar);
  renderEbrDates(document.querySelector('[data-list="ebr-dates"]'), view.lists.ebrDates);
  renderWorkshops(document.querySelector('[data-list="workshops"]'), view.lists.workshops);
  renderCollaborationMetrics(document.querySelector('[data-list="collaboration-metrics"]'), view.lists.collaboration);

  renderResourceList(document.querySelector('[data-list="resources-health"]'), view.lists.resources.health || []);
  renderResourceList(document.querySelector('[data-list="resources-success"]'), view.lists.resources.success || []);
  renderResourceList(document.querySelector('[data-list="resources-onboarding"]'), view.lists.resources.onboarding || []);
  renderResourceList(document.querySelector('[data-list="resources-playbooks"]'), view.lists.resources.playbooks || []);
  renderResourceList(document.querySelector('[data-list="resources-ebr"]'), view.lists.resources.ebr || []);
  renderResourceList(document.querySelector('[data-list="resources-collaboration"]'), view.lists.resources.collaboration || []);
  renderResourceList(document.querySelector('[data-list="resources-analytics"]'), view.lists.resources.analytics || []);

  renderTemplates(view.templates);

  renderNextActions(
    document.querySelector('[data-list="next-best-actions"]'),
    view.lists.nextActions,
    state.actionState,
    (id, checked) => {
      state.actionState[id] = checked;
      saveStorage(STORAGE_KEYS.actions, state.actionState);
    }
  );

  if (state.palette && state.palette.update) {
    state.palette.update(view);
  }

  document.body.classList.add('loaded');
};

const init = async () => {
  const data = await loadData();
  const overrides = loadStorage(STORAGE_KEYS.overrides, {});
  const actionState = loadStorage(STORAGE_KEYS.actions, {});

  const state = {
    data,
    overrides,
    actionState,
    view: null,
    palette: null
  };

  const getMode = initModeSwitch();
  const getSection = initNavSpy();
  initDetailsControls();
  initQuickActions(getMode, getSection);
  initExport();

  const refresh = () => {
    state.view = buildView(state.data, state.overrides, state.actionState);
    render(state.view, state);
  };

  state.view = buildView(data, overrides, actionState);
  render(state.view, state);
  state.palette = initPalette(state.view);
  initTemplateCopy(state.view.templates);
  initLandingZone(state.view);
  initCollabModal(state.view.templates);
  initModals(state, refresh);
};

document.addEventListener('DOMContentLoaded', init);
