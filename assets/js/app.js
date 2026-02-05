'use strict';

const ACCOUNTS_URL = 'data/accounts.json';
const RESOURCES_URL = 'data/resources.json';
const LEGACY_DATA_URL = 'data/account.sample.json';
const STORAGE_KEYS = {
  mode: 'gl-health-mode',
  guided: 'gl-health-guided-mode',
  actions: 'gl-health-action-state',
  overrides: 'gl-health-overrides',
  sections: 'gl-health-sections',
  sidebar: 'gl-health-sidebar',
  fab: 'gl-health-fab',
  lastSection: 'gl-health-last-section',
  audience: 'gl-health-audience',
  playbooks: 'gl-health-playbooks',
  account: 'gl-health-account'
};

const DEFAULT_RESOURCE_REGISTRY = {
  version: 1,
  categories: [],
  resources: []
};

const DEFAULT_DATA = {"meta":{"last_updated":"2026-01-29","updated_by":"Jordan Lee","notes":"Monthly health review and renewal readiness update","data_freshness_note":"Updated Jan 29, 2026"},"customer":{"name":"Northwind Industries","segment":"Enterprise","plan":"Ultimate","renewal_date":"2026-06-30","deployment_type":"Self-managed","instance_type":"Dedicated instance","start_date":"2025-08-27","csm":"Jordan Lee","tam":"Avery Chen"},"seats":{"purchased":500,"active":210,"utilization_30d_series":[{"date":"2025-11-15","value":0.34},{"date":"2025-12-01","value":0.36},{"date":"2025-12-15","value":0.38},{"date":"2025-12-30","value":0.4},{"date":"2026-01-15","value":0.42}]},"onboarding":{"phase":"First value","completion_pct":0.92,"milestones":{"engagement":{"date":"2025-09-01"},"infra_ready":{"date":"2025-09-15"},"onboarding_complete":{"date":"2025-10-20"},"first_value":{"date":"2025-10-25"},"outcome":{"date":""}},"checklist":[{"task":"Executive kickoff and success criteria aligned","done":true,"date":"2025-08-29"},{"task":"GitLab instance deployed and validated","done":true,"date":"2025-09-10"},{"task":"SSO configured and tested","done":true,"date":"2025-09-12"},{"task":"Pilot teams onboarded","done":true,"date":"2025-09-20"},{"task":"Repository migration complete","done":true,"date":"2025-09-25"},{"task":"CI runners configured","done":true,"date":"2025-09-28"},{"task":"First pipelines running","done":true,"date":"2025-10-02"},{"task":"Security baseline defined","done":true,"date":"2025-10-05"},{"task":"Enablement training delivered","done":true,"date":"2025-10-18"},{"task":"Success plan validated","done":true,"date":"2025-10-20"}],"risks":["License activation below 50% after first value","Limited DevSecOps scanning coverage","Workshop participation below target"],"definitions_source":"https://handbook.gitlab.com/handbook/customer-success/csm/onboarding/"},"adoption":{"platform_adoption_target":3,"use_case_scores":[{"key":"create","name":"Create (SCM)","score":82,"trend_30d_pct":7,"drivers":["Merge request usage growing","Code review coverage at 78%"],"thresholds":["Green >= 76","Yellow 51-75","Red <= 50"],"playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/","threshold_source":"https://handbook.gitlab.com/handbook/customer-success/product-usage-data/maturity-scoring/","key_metrics":[{"name":"Merge request adoption","current":"78%","target":"75%+","explainer":"Code review coverage"},{"name":"Active projects in GitLab","current":"85%","target":"80%+","explainer":"SCM consolidation"}],"gap_analysis":["Two legacy teams still using external SCM"],"recommended_actions":[{"action":"Migrate remaining repositories to GitLab","expected_impact":"Sustain Create in green","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/"}]},{"key":"verify","name":"Verify (CI)","score":79,"trend_30d_pct":9,"drivers":["CI builds per billable user at 46","Pipeline success rate 86%"],"thresholds":["Green > 40 builds per user","Yellow 3-40","Red <= 2"],"playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/ci-verify/","threshold_source":"https://handbook.gitlab.com/handbook/customer-success/product-usage-data/maturity-scoring/","key_metrics":[{"name":"Projects with pipelines","current":"45%","target":"60%","explainer":"Coverage of CI-enabled projects"},{"name":"Pipeline success rate","current":"86%","target":"75%+","explainer":"Healthy pipeline stability"},{"name":"Builds per billable user","current":"46","target":">40","explainer":"Adoption threshold for green"}],"gap_analysis":["15% of priority projects still missing CI pipelines","Runner capacity near 80% utilization during peak"],"recommended_actions":[{"action":"Roll out CI templates to remaining Tier-1 projects","expected_impact":"Move Verify to green within 30 days","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/ci-verify/"}]},{"key":"secure","name":"Secure (DevSecOps)","score":76,"trend_30d_pct":6,"drivers":["Scanner utilization 24%","SAST + dependency scanning active"],"thresholds":["Green >= 20% utilization","Yellow 5-19%","Red < 5%"],"playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/","threshold_source":"https://handbook.gitlab.com/handbook/customer-success/product-usage-data/maturity-scoring/","key_metrics":[{"name":"Projects with security scans","current":"24%","target":"50%","explainer":"Scanner utilization coverage"},{"name":"SAST enabled","current":"12%","target":"50%","explainer":"Regulated app coverage"},{"name":"Dependency scanning","current":"18%","target":"50%","explainer":"Supply chain protection"}],"gap_analysis":["Regulated apps waiting on security policy approval","Dependency scanning not enabled on critical repos"],"recommended_actions":[{"action":"Schedule Secure workshop and approve policies","expected_impact":"Increase scan coverage to 40% in 6 weeks","link":"https://handbook.gitlab.com/handbook/customer-success/workshops/secure/"}]},{"key":"release","name":"Release (CD)","score":62,"trend_30d_pct":3,"drivers":["Deployments per user 2.6","6 teams deploying via GitLab"],"thresholds":["Green > 7 deployments per user","Yellow 2-7","Red < 2"],"playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/cd-release/","threshold_source":"https://handbook.gitlab.com/handbook/customer-success/product-usage-data/maturity-scoring/","key_metrics":[{"name":"Teams deploying via GitLab","current":"6 teams","target":"12 teams","explainer":"Deployment adoption"},{"name":"Deployments per user","current":"2.6","target":"7+","explainer":"Release automation depth"}],"gap_analysis":["CD pipelines not standardized across teams","Feature flag usage limited to two products"],"recommended_actions":[{"action":"Run CD/Release playbook kickoff","expected_impact":"Expand deployment automation to 10 teams","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/cd-release/"}]}],"landing_zone":{"phases":[{"key":"pre_engagement","label":"Pre-engagement","goals":["Align executive sponsor","Confirm success criteria"],"tasks":["Document business outcomes","Identify technical champions"],"risks":["Unclear ownership","Undefined success metrics"],"workshops":["Discovery and planning session"],"success_criteria":["Success plan draft approved","Executive sponsor confirmed"]},{"key":"engagement","label":"Engagement","goals":["Kickoff and stakeholder alignment","Success plan baseline"],"tasks":["Hold kickoff","Create collaboration project"],"risks":["Missed stakeholder attendance"],"workshops":["Onboarding kickoff"],"success_criteria":["Kickoff completed","Success plan objectives logged"]},{"key":"infra_ready","label":"Infra ready","goals":["Platform available","SSO and access configured"],"tasks":["Deploy GitLab","Configure SSO","Validate runners"],"risks":["Infrastructure delays","Access issues"],"workshops":["Admin enablement"],"success_criteria":["GitLab production ready","Runners online"]},{"key":"onboarding_complete","label":"Onboarding complete","goals":["Teams onboarded","Training complete"],"tasks":["Migrate repositories","Deliver training sessions"],"risks":["Low training attendance"],"workshops":["CI/Verify workshop"],"success_criteria":["Training completed","Pilot teams live"]},{"key":"first_value","label":"First value","goals":["Reach 10% license activation","First production pipeline"],"tasks":["Enable CI in priority projects","Drive adoption campaigns"],"risks":["Low license utilization","Pipeline instability"],"workshops":["CI/Verify workshop"],"success_criteria":["10% licenses active","First deployment via GitLab"]},{"key":"outcome","label":"Outcome achieved","goals":["Primary use case delivered","Business outcomes verified"],"tasks":["Scale CI/CD coverage","Enable security scans"],"risks":["Outcome lag","Security gaps"],"workshops":["Secure workshop","CD/Release playbook"],"success_criteria":["Use case green","ROI validated"]}]},"platform_source":"https://handbook.gitlab.com/handbook/customer-success/product-usage-data/platform-value-score/"},"health":{"engagement_score":74,"outcomes_score":65,"overall_score":72,"early_warning_flags":[{"severity":"yellow","title":"Engagement declining","pattern":"Cadence attendance 89% \u2192 81% \u2192 76%","trigger":"Attendance below 80% for two consecutive meetings","impact":"Risk of stalled adoption and executive disengagement","recommended_action":"Schedule sponsor alignment call and confirm next agenda","due_date":"2026-02-05","owner":"CSM","playbook":"https://handbook.gitlab.com/handbook/customer-success/customer-health-scoring/"},{"severity":"yellow","title":"License utilization below target","pattern":"42% utilization vs 80% target","trigger":"Utilization below 60% after first value milestone","impact":"Adoption stagnation and renewal value risk","recommended_action":"Run user activation audit and launch adoption campaign","due_date":"2026-02-12","owner":"CSM","playbook":"https://handbook.gitlab.com/handbook/customer-success/csm/health-score-triage/"},{"severity":"red","title":"Success plan objective at risk","pattern":"Security scanning objective 30% complete","trigger":"Objective behind schedule with blockers unresolved","impact":"Regulated apps remain unscanned; compliance risk","recommended_action":"Escalate security policy approval and schedule Secure workshop","due_date":"2026-02-01","owner":"Security lead","playbook":"https://handbook.gitlab.com/handbook/customer-success/csm/health-score-triage/"}],"product_score":78,"risk_score":62,"voice_score":70,"weights":{"product":0.5,"risk":0.25,"outcomes":0.1,"voice":0.05,"engagement":0.1},"drivers":[{"pillar":"Product usage","status":"good","detail":"Use case adoption at 3 green, but license utilization is 42% (target 80%).","action":"Launch activation campaign and onboard the next 50 users."},{"pillar":"Risk","status":"watch","detail":"Engagement declining and renewal window opened at 151 days.","action":"Schedule executive alignment call and confirm renewal success criteria."},{"pillar":"Outcomes","status":"watch","detail":"2 of 3 success plan objectives on track; security objective behind.","action":"Run Secure workshop and unblock regulated app scanning."},{"pillar":"Voice of customer","status":"good","detail":"NPS 34 and exec feedback positive in last EBR.","action":"Capture a reference story for Q2."},{"pillar":"Engagement","status":"good","detail":"Cadence attendance at 76% with strong workshop participation.","action":"Confirm next cadence agenda and maintain attendance above 80%."}]},"engagement":{"cadence_attendance_rate":0.76,"last_exec_meeting":"2025-12-18","next_exec_meeting":"2026-03-18","last_ebr_date":"2025-12-18","next_ebr_date":"2026-03-20","last_qbr_date":"2025-10-15","next_qbr_date":"2026-04-15","workshop_participation":0.62,"response_time_days":2.4,"nps":34,"sentiment":"Mixed","cadence_calendar":[{"cadence":"Monthly","focus":"Adoption review","owner":"CSM","next_date":"2026-02-10"},{"cadence":"Quarterly","focus":"Executive business review","owner":"CSM + Exec sponsor","next_date":"2026-03-20"},{"cadence":"Biweekly","focus":"Delivery workshop checkpoint","owner":"DevOps lead","next_date":"2026-02-03"}],"ebr_templates":{"agenda":"EBR Agenda\n1. Executive summary and outcomes\n2. Adoption and health score\n3. Success plan progress\n4. Risks and mitigations\n5. Roadmap alignment\n6. Next quarter priorities","slides":"EBR Slide Outline\n1. Executive summary\n2. Health score and adoption\n3. Success plan objectives\n4. DORA and value streams\n5. Risks and mitigation plan\n6. Roadmap alignment\n7. Next quarter priorities","checklist":"EBR Checklist\n- Confirm KPIs and success plan status\n- Update renewal risk and mitigation\n- Validate DORA and VSA metrics\n- Capture executive feedback"},"cadence_call_frequency":"Biweekly","ebr_attendance_rate":0.82,"cadence_notes":"Cadence calls focus on operational adoption; EBRs focus on executive outcomes."},"touchpoints":{"email_metrics":{"open_rate":0.42,"ctr":0.08,"response_rate":0.18},"self_service_metrics":{"doc_views":860,"training_completion":0.62,"ticket_deflection":0.24,"self_service_adoption":0.54},"in_app_metrics":{"views":320,"clicks":70,"survey_completion":0.56},"digital_health_score":66,"breakdown":{"email":68,"self_service":74,"in_app":70,"community":55},"community_metrics":{"active_members":38,"posts":12,"responses":22,"participation_rate":0.55}},"risks":[{"id":"risk-license","severity":"red","driver":"License utilization below 50%","detail":"Only 210 of 500 seats active","owner":"CSM","due_date":"2026-02-15","playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/","mitigation":[{"task":"Launch adoption campaign with team leads","owner":"CSM","due_date":"2026-02-05"},{"task":"Schedule onboarding refresher session","owner":"TAM","due_date":"2026-02-12"}]},{"id":"risk-security","severity":"yellow","driver":"Security scans enabled in only 12% of projects","detail":"SAST not running on regulated apps","owner":"Security lead","due_date":"2026-03-01","playbook":"https://handbook.gitlab.com/handbook/customer-success/playbooks/","mitigation":[{"task":"Enable SAST and dependency scanning","owner":"Security","due_date":"2026-02-20"},{"task":"Run Secure workshop","owner":"CSM","due_date":"2026-02-28"}]}],"risk_playbooks":{"red":[{"title":"Health score triage","link":"https://handbook.gitlab.com/handbook/customer-success/csm/health-score-triage/"},{"title":"Customer health scoring","link":"https://handbook.gitlab.com/handbook/customer-success/customer-health-scoring/"}],"yellow":[{"title":"Playbooks index","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/"},{"title":"Success plans","link":"https://handbook.gitlab.com/handbook/customer-success/csm/success-plans/"}]},"success_plan":{"next_review":"2026-02-05","objectives":[{"title":"Automate Tier-1 release workflows","status":"in_progress","progress_pct":0.45,"owner":"DevOps lead","target_date":"2026-03-30","evidence":"https://gitlab.com/northwind/collaboration/-/issues/34","dependencies":["Runner scaling","Release pipeline approval"],"next_milestone":"First Tier-1 app release","baseline":"Release cadence at 1x per week across Tier-1 apps","success_criteria":"Deploy Tier-1 apps daily with automated approvals","timeline":"Jan\u2013Mar 2026","verifiable_outcomes":["Daily release pipeline for Tier-1 services","Change failure rate below 10%"],"status_detail":"On track; pipeline approvals configured for 6 of 12 apps.","blockers":["Finalize release approval workflow for remaining apps"],"owner_customer":"DevOps lead","owner_gitlab":"CSM","internal_notes":"CSM notes: track blockers and stakeholder updates.","value_statement":"Accelerates release frequency and reduces lead time for Tier-1 apps.","mitigations":["Review blockers weekly","Update owners on progress"]},{"title":"Expand CI adoption to 60% of projects","status":"in_progress","progress_pct":0.55,"owner":"Platform engineering","target_date":"2026-03-15","evidence":"https://gitlab.com/northwind/collaboration/-/issues/28","dependencies":["CI templates rollout"],"next_milestone":"50% projects with CI","baseline":"CI enabled on 35% of projects","success_criteria":"CI enabled on 60% of projects with >75% success rate","timeline":"Feb\u2013Mar 2026","verifiable_outcomes":["CI templates rolled out to top 20 projects","Runner capacity scaled to 80% utilization"],"status_detail":"On track; CI templates rolling out to top projects.","blockers":["Complete runner scale-out for high-traffic repos"],"owner_customer":"Platform engineering","owner_gitlab":"CSM","internal_notes":"CSM notes: track blockers and stakeholder updates.","value_statement":"Expands CI coverage to improve deployment reliability.","mitigations":["Review blockers weekly","Update owners on progress"]},{"title":"Enable security scanning for regulated apps","status":"at_risk","progress_pct":0.3,"owner":"Security","target_date":"2026-02-28","evidence":"https://gitlab.com/northwind/collaboration/-/issues/41","dependencies":["SAST pipeline updates"],"next_milestone":"SAST baseline enabled","baseline":"Security scans on 12% of regulated apps","success_criteria":"SAST + dependency scans on all regulated apps","timeline":"Jan\u2013Feb 2026","verifiable_outcomes":["SAST baseline on regulated pipelines","Dependency scanning policy enforced"],"status_detail":"At risk; regulated app teams awaiting security policy approval.","blockers":["Security policy approval pending","DAST rollout not scheduled"],"owner_customer":"Security","owner_gitlab":"CSM","internal_notes":"CSM notes: track blockers and stakeholder updates.","value_statement":"Ensures regulated apps meet security and compliance requirements.","mitigations":["Review blockers weekly","Update owners on progress"]}]},"outcomes":{"value_summary":"Release frequency up 2.5x","value_detail":"Lead time down from 14 to 7 days","narrative":"Delivery velocity improved across Tier-1 services with GitLab CI/CD adoption. The next focus is scaling Secure tooling to regulated apps.","value_points":["Lead time reduced from 14 days to 7 days (50% faster).","Deployment frequency increased from 0.2/day to 0.6/day.","Change failure rate decreased from 18% to 11%.","MTTR improved from 10 hours to 6 hours."],"impact":{"time_saved_hours_per_month":120,"cost_avoidance_monthly":18000,"cost_avoidance_annual":216000,"tool_consolidation_annual":45000,"quality_improvement":"Production defects down 22% since onboarding.","customer_quote":"Customer quote: \"GitLab cut our delivery cycles in half and gave us clear visibility across teams.\""}},"dora":{"metrics":{"deployment_frequency":{"label":"Deployment frequency","unit":"deploys/day","baseline":0.2,"current":0.6,"target":1.0,"series":[{"date":"2025-11-01","value":0.2},{"date":"2025-12-01","value":0.3},{"date":"2026-01-01","value":0.5},{"date":"2026-01-20","value":0.6}]},"lead_time":{"label":"Lead time for changes","unit":"days","baseline":14,"current":7,"target":3,"series":[{"date":"2025-11-01","value":14},{"date":"2025-12-01","value":10},{"date":"2026-01-01","value":8},{"date":"2026-01-20","value":7}]},"change_failure":{"label":"Change failure rate","unit":"%","baseline":18,"current":11,"target":5,"series":[{"date":"2025-11-01","value":18},{"date":"2025-12-01","value":14},{"date":"2026-01-01","value":12},{"date":"2026-01-20","value":11}]},"mttr":{"label":"Time to restore service","unit":"hours","baseline":10,"current":6,"target":2,"series":[{"date":"2025-11-01","value":10},{"date":"2025-12-01","value":8},{"date":"2026-01-01","value":7},{"date":"2026-01-20","value":6}]}},"levels":{"deployment_frequency":{"elite":1.0,"high":0.2,"medium":0.03},"lead_time":{"elite":1.0,"high":7.0,"medium":30.0},"change_failure":{"elite":5.0,"high":10.0,"medium":20.0},"mttr":{"elite":1.0,"high":24.0,"medium":72.0}}},"vsa":{"lead_time_days":7.2,"cycle_time_days":5.1,"throughput_per_week":18,"bottleneck_stage":"Code review","recommendations":["Introduce merge request templates for faster reviews","Add reviewers to critical paths","Automate approval rules for low-risk changes"]},"collaboration_project":{"url":"https://gitlab.com/northwind/collaboration","open_issues":24,"overdue":5,"comment_velocity":"34 comments/week","templates":{"agenda":"Agenda\n- Progress review\n- Risks and blockers\n- Upcoming workshops\n- Action items","action_items":"Action Items\n- Task\n- Owner\n- Due date\n- Status","escalation":"Escalation\n- Issue description\n- Severity\n- Impact\n- Requested support","success_report":"Success Report\n- Objective\n- Outcome\n- Evidence\n- Next steps"}},"activity":[{"date":"2026-01-18","title":"CI usage review","detail":"Pipeline success rate improved to 72%"},{"date":"2026-01-10","title":"Security workshop scheduled","detail":"Secure enablement set for Feb 20"},{"date":"2026-01-05","title":"Executive summary shared","detail":"Renewal readiness checkpoint sent to sponsor"}],"renewal_readiness":["Success plan objectives mapped to renewal goals","Health score above 60","Executive sponsor aligned on Q2 priorities","Expansion opportunity identified"],"workshops":[{"title":"CI / Verify Workshop","detail":"Half-day enablement for pipeline onboarding","duration":"4 hours","prerequisites":"Runner access and sample project","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/ci-verify/"},{"title":"CD / Release Playbook","detail":"Deployment automation planning","duration":"3 hours","prerequisites":"CI pipeline baseline","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/cd-release/"},{"title":"Secure Workshop","detail":"SAST and dependency scanning rollout","duration":"3 hours","prerequisites":"Security team alignment","link":"https://handbook.gitlab.com/handbook/customer-success/workshops/secure/"}],"resources":{"health":[{"title":"Customer health scoring","detail":"Health score framework and definitions","link":"https://handbook.gitlab.com/handbook/customer-success/customer-health-scoring/"},{"title":"Health score triage","detail":"Guidance for red and yellow accounts","link":"https://handbook.gitlab.com/handbook/customer-success/csm/health-score-triage/"}],"success":[{"title":"Success plans","detail":"Success plan framework and objectives","link":"https://handbook.gitlab.com/handbook/customer-success/csm/success-plans/"}],"onboarding":[{"title":"Customer onboarding","detail":"Onboarding process and milestones","link":"https://handbook.gitlab.com/handbook/customer-success/csm/onboarding/"},{"title":"Cadence calls","detail":"Cadence call structure and expectations","link":"https://handbook.gitlab.com/handbook/customer-success/csm/cadence-calls/"}],"playbooks":[{"title":"CS playbooks index","detail":"Customer Success playbooks catalog","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/"},{"title":"CI / Verify playbook","detail":"CI adoption enablement","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/ci-verify/"},{"title":"CD / Release playbook","detail":"Release adoption enablement","link":"https://handbook.gitlab.com/handbook/customer-success/playbooks/cd-release/"}],"ebr":[{"title":"Executive business reviews","detail":"EBR guidance and preparation","link":"https://handbook.gitlab.com/handbook/customer-success/csm/ebr/"}],"collaboration":[{"title":"Customer collaboration project","detail":"Shared project guide","link":"https://handbook.gitlab.com/handbook/customer-success/csm/customer-collaboration-project/"}],"analytics":[{"title":"Value Streams dashboard","detail":"Value Streams dashboard docs","link":"https://docs.gitlab.com/user/analytics/value_streams_dashboard/"},{"title":"DORA metrics","detail":"DORA metrics documentation","link":"https://docs.gitlab.com/user/analytics/dora_metrics/"},{"title":"DORA charts","detail":"DORA charts documentation","link":"https://docs.gitlab.com/user/analytics/dora_metrics_charts/"}]},"freshness":{"overall_last_sync":"2026-01-29T08:00:00-08:00","next_sync":"2026-01-30T08:00:00-08:00","metrics":[{"key":"license","label":"License data","last_sync":"2026-01-29T06:00:00-08:00","status":"fresh","note":"Synced 2 hours ago"},{"key":"health","label":"Health score","last_sync":"2026-01-22T09:00:00-08:00","status":"stale","note":"Last calculated 7 days ago"},{"key":"usage","label":"Usage metrics","last_sync":"2026-01-29T06:00:00-08:00","status":"fresh","note":"Synced 2 hours ago"},{"key":"success_plan","label":"Success plan","last_sync":"2026-01-18T09:00:00-08:00","status":"manual","note":"Manual update required"},{"key":"dora","label":"DORA metrics","last_sync":"2026-01-28T20:00:00-08:00","status":"fresh","note":"Synced 12 hours ago"},{"key":"touchpoints","label":"Digital touchpoints","last_sync":"2026-01-27T18:00:00-08:00","status":"stale","note":"Sync overdue by 2 days"}]},"account":{"account_name":"Northwind Industries","segment":"Enterprise","renewal_date":"2026-06-30","renewal_days_remaining":151,"deployment_type":"Self-managed","data_freshness_note":"Updated Jan 29, 2026"},"audience_safe_fields":{"internal_only":["success_plan.objectives[].owner_gitlab","success_plan.objectives[].internal_notes","risks[].mitigation","response_playbooks.red","response_playbooks.yellow"],"customer_safe":["success_plan.objectives[].owner_customer","success_plan.objectives[].status","early_warning_flags"]},"response_playbooks":{"yellow":{"week1":["Review health score drivers with customer sponsor","Confirm success plan objectives and reset timelines","Schedule adoption workshop for lowest scoring use case"],"week2":["Publish mitigation plan in collaboration project","Track adoption metrics weekly and share progress","Confirm next executive checkpoint date"],"ongoing":["Monitor license utilization and engagement trends","Log risks and mitigations after each cadence call"],"escalation_triggers":["Health score below 60 for two consecutive reviews","Executive sponsor unresponsive for 30+ days"],"success_criteria":["Health score above 75","3+ use cases green","Success plan objectives back on track"]},"red":{"week1":["Initiate health score triage with CS leadership","Document top 3 risks and owners in collaboration project","Align on short-term recovery plan with executive sponsor"],"week2":["Run focused enablement workshops (CI/Verify + Secure)","Escalate blockers to customer leadership","Provide weekly executive status updates"],"ongoing":["Review progress weekly with CS leadership","Track risk mitigation tasks to closure"],"escalation_triggers":["Renewal window < 90 days with no plan","Multiple critical objectives blocked"],"success_criteria":["Health score above 60 for 2 reviews","At-risk objectives cleared","Executive sponsor re-engaged"]}}};

const numberFormat = new Intl.NumberFormat('en-US');
const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});
const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});
const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
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

const formatDateTime = (value) => {
  const date = parseDate(value);
  return date ? dateTimeFormat.format(date) : 'TBD';
};

const formatPercent = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '0%';
  return `${Math.round(value * 100)}%`;
};

const formatNumber = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '0';
  return numberFormat.format(value);
};

const formatCurrency = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '$0';
  return currencyFormat.format(value);
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const highlightMatch = (label, query) => {
  if (!query) return escapeHtml(label);
  const escaped = escapeHtml(label);
  const pattern = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'ig');
  return escaped.replace(pattern, '<mark>$1</mark>');
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

const fetchJson = async (url, fallback) => {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    return await response.json();
  } catch (error) {
    return fallback;
  }
};

const normalizeAccountForView = (account) => {
  const normalized = JSON.parse(JSON.stringify(account || {}));
  normalized.account_id =
    normalized.account_id || normalized.account_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'default-account';
  normalized.account_name = normalized.account_name || normalized.customer?.name || 'Unknown account';
  normalized.timezone = normalized.timezone || 'America/Los_Angeles';
  normalized.start_date = normalized.start_date || normalized.customer?.start_date || null;
  normalized.renewal_date = normalized.renewal_date || normalized.customer?.renewal_date || null;

  normalized.customer = normalized.customer || {};
  normalized.customer.name = normalized.account_name;
  normalized.customer.start_date = normalized.start_date;
  normalized.customer.renewal_date = normalized.renewal_date;
  normalized.customer.segment = normalized.customer.segment || 'Enterprise';
  normalized.customer.plan = normalized.customer.plan || 'Ultimate';
  normalized.customer.deployment_type = normalized.customer.deployment_type || 'Self-managed';
  normalized.customer.instance_type = normalized.customer.instance_type || 'Dedicated instance';

  normalized.onboarding = normalized.onboarding || {};
  normalized.onboarding.milestones = normalized.onboarding.milestones || {};
  normalized.onboarding.milestones.engagement = normalized.onboarding.milestones.engagement || {};
  normalized.onboarding.milestones.first_value = normalized.onboarding.milestones.first_value || {};
  normalized.onboarding.milestones.onboarding_complete = normalized.onboarding.milestones.onboarding_complete || {};

  if (normalized.first_engage_date) {
    normalized.onboarding.milestones.engagement.date = normalized.first_engage_date;
  }
  if (normalized.first_value_date) {
    normalized.onboarding.milestones.first_value.date = normalized.first_value_date;
  }
  if (normalized.onboarding_complete_date) {
    normalized.onboarding.milestones.onboarding_complete.date = normalized.onboarding_complete_date;
  }

  normalized.engagement = normalized.engagement || {};
  normalized.engagement.last_ebr_date = normalized.last_ebr_date || normalized.engagement.last_ebr_date || null;
  normalized.engagement.last_qbr_date = normalized.last_qbr_date || normalized.engagement.last_qbr_date || null;
  normalized.engagement.next_qbr_date = normalized.next_qbr_date || normalized.engagement.next_qbr_date || null;
  normalized.engagement.cadence_calendar = normalized.engagement.cadence_calendar || [];

  normalized.success_plan = normalized.success_plan || {};
  normalized.success_plan.objectives = normalized.success_plan.objectives || [];
  normalized.success_plan.next_review =
    normalized.success_plan_next_review_date || normalized.success_plan.next_review || null;

  normalized.workshops = Array.isArray(normalized.workshops) ? normalized.workshops : [];
  normalized.workshop_outcomes = Array.isArray(normalized.workshop_outcomes) ? normalized.workshop_outcomes : [];
  normalized.workshop_plan = normalized.workshop_plan || {
    title: null,
    target_use_case: null,
    success_criteria: null,
    expected_health_delta: null,
    next_milestone: null
  };
  normalized.workshop_catalog = Array.isArray(normalized.workshop_catalog)
    ? normalized.workshop_catalog
    : Array.isArray(normalized.workshops)
    ? normalized.workshops.map((item) => ({
        title: item.theme,
        detail: item.notes || 'Workshop delivered',
        duration: 'Session',
        prerequisites: 'Stakeholder alignment',
        link: 'https://handbook.gitlab.com/handbook/customer-success/csm/workshops/'
      }))
    : [];

  normalized.renewal_readiness_checklist = Array.isArray(normalized.renewal_readiness_checklist)
    ? normalized.renewal_readiness_checklist
    : Array.isArray(normalized.renewal_readiness)
    ? normalized.renewal_readiness
    : [];

  normalized.triage_state = normalized.triage_state || null;
  normalized.triage_recovery_plan = normalized.triage_recovery_plan || {
    schedule_next_call: { value: false, date: null },
    stakeholders_aligned: { value: false, date: null },
    workshop_scheduled: { value: false, date: null }
  };

  normalized.meta = normalized.meta || {};
  normalized.meta.last_updated = normalized.meta.last_updated || new Date().toISOString().slice(0, 10);
  normalized.meta.data_freshness_note =
    normalized.meta.data_freshness_note || `Updated ${formatDate(normalized.meta.last_updated)}`;

  return normalized;
};

const loadDashboardData = async () => {
  const [accountsDoc, resourceRegistry, legacyAccount] = await Promise.all([
    fetchJson(ACCOUNTS_URL, null),
    fetchJson(RESOURCES_URL, DEFAULT_RESOURCE_REGISTRY),
    fetchJson(LEGACY_DATA_URL, DEFAULT_DATA)
  ]);

  const rawAccounts = Array.isArray(accountsDoc?.accounts) && accountsDoc.accounts.length ? accountsDoc.accounts : [legacyAccount];
  return {
    accounts: rawAccounts.map((account) => normalizeAccountForView(account)),
    resources: resourceRegistry || DEFAULT_RESOURCE_REGISTRY
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

const syncPersonaAttributes = () => {
  document.querySelectorAll('[data-persona]').forEach((el) => {
    if (!el.dataset.personaRelevance) {
      el.dataset.personaRelevance = el.dataset.persona;
    }
  });
};

const DEFAULT_PROVE_WEIGHTS = {
  product: 0.5,
  risk: 0.25,
  outcomes: 0.1,
  voice: 0.05,
  engagement: 0.1
};

const normalizeWeights = (weights = {}) => {
  const merged = { ...DEFAULT_PROVE_WEIGHTS, ...weights };
  const total = Object.values(merged).reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (!total) return DEFAULT_PROVE_WEIGHTS;
  return Object.keys(merged).reduce((acc, key) => {
    acc[key] = (Number(merged[key]) || 0) / total;
    return acc;
  }, {});
};

const computeHealthScores = (health) => {
  const weights = normalizeWeights(health.weights);
  const product = health.product_score ?? health.adoption_score ?? 0;
  const risk = health.risk_score ?? 0;
  const outcomes = health.outcomes_score ?? 0;
  const voice = health.voice_score ?? 0;
  const engagement = health.engagement_score ?? 0;
  const weighted =
    product * weights.product +
    risk * weights.risk +
    outcomes * weights.outcomes +
    voice * weights.voice +
    engagement * weights.engagement;
  return {
    product,
    risk,
    outcomes,
    voice,
    engagement,
    weights,
    overall: Math.round(weighted)
  };
};

const computeDigitalScore = (touchpoints) => {
  const emailScore =
    touchpoints.breakdown?.email ?? Math.round((touchpoints.email_metrics?.open_rate || 0) * 100);
  const selfServiceScore =
    touchpoints.breakdown?.self_service ??
    Math.round((touchpoints.self_service_metrics?.self_service_adoption ?? 0) * 100);
  const inAppScore =
    touchpoints.breakdown?.in_app ?? Math.round((touchpoints.in_app_metrics?.survey_completion || 0) * 100);
  const communityScore =
    touchpoints.breakdown?.community ??
    Math.round((touchpoints.community_metrics?.participation_rate || 0) * 100);
  const weighted = emailScore * 0.25 + selfServiceScore * 0.25 + inAppScore * 0.2 + communityScore * 0.3;
  return touchpoints.digital_health_score ?? Math.round(weighted);
};

const computeTrend = (series) => {
  if (!series || series.length < 2) return 0;
  const last = series[series.length - 1].value;
  const prev = series[series.length - 2].value;
  if (prev === 0) return 0;
  return Math.round(((last - prev) / prev) * 100);
};

const statusLabel = (status) => {
  if (status === 'good') return 'On track';
  if (status === 'risk') return 'At risk';
  return 'Watch';
};

const computeSectionMetrics = (view) => {
  const useCases = view.lists.useCaseCards || [];
  const greenCount = useCases.filter((useCase) => useCase.score >= 76).length;
  const adoptionProgress = useCases.length ? greenCount / useCases.length : 0;
  const targetMatch = String(view.adoption.platform_adoption_target || '').match(/\d+/);
  const adoptionTarget = targetMatch ? Number.parseInt(targetMatch[0], 10) : 3;

  const onboardingTasks = view.lists.onboardingTasks || [];
  const completedTasks = onboardingTasks.filter((task) => task.done).length;
  const journeyProgress = onboardingTasks.length ? completedTasks / onboardingTasks.length : 0;
  const milestoneValues = Object.values(view.milestones || {});
  const milestonesComplete = milestoneValues.every((milestone) => milestone.statusKey === 'complete');

  const objectives = view.lists.successPlan || [];
  const onTrackCount = objectives.filter((objective) => objective.status !== 'at_risk').length;
  const outcomesProgress = objectives.length ? onTrackCount / objectives.length : 0;

  const healthBand = bandFromScore(view.health.overall_score || 0);
  const digitalBand = bandFromScore(view.touchpoints.digital_health_score || 0);

  return {
    overview: {
      progress: clamp((view.health.overall_score || 0) / 100),
      status: healthBand.status,
      value: `${view.health.overall_score || 0}%`
    },
    'overview-summary': {
      progress: clamp((view.health.overall_score || 0) / 100),
      status: healthBand.status,
      value: `${view.health.overall_score || 0}%`
    },
    journey: {
      progress: clamp(journeyProgress),
      status: milestonesComplete ? 'good' : journeyProgress >= 0.6 ? 'watch' : 'risk',
      value: `${Math.round(journeyProgress * 100)}%`
    },
    adoption: {
      progress: clamp(adoptionProgress),
      status: greenCount >= adoptionTarget ? 'good' : greenCount > 0 ? 'watch' : 'risk',
      value: `${greenCount}/${useCases.length}`
    },
    'health-risk': {
      progress: clamp((view.health.overall_score || 0) / 100),
      status: healthBand.status,
      value: `${view.health.overall_score || 0}%`
    },
    outcomes: {
      progress: clamp(outcomesProgress),
      status: outcomesProgress >= 0.7 ? 'good' : outcomesProgress >= 0.4 ? 'watch' : 'risk',
      value: `${onTrackCount}/${objectives.length}`
    },
    engagement: {
      progress: clamp((view.touchpoints.digital_health_score || 0) / 100),
      status: digitalBand.status,
      value: `${view.touchpoints.digital_health_score || 0}%`
    },
    resources: {
      progress: 1,
      status: 'good',
      value: 'Ready'
    }
  };
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
  if (window.Rules && typeof window.Rules.buildNextActions === 'function') {
    return window.Rules.buildNextActions(data, healthScores, digitalScore);
  }
  return [];
};

const buildView = (data, overrides, actionState, audience = 'internal', resourceRegistry = DEFAULT_RESOURCE_REGISTRY) => {
  const merged = mergeOverrides(data, overrides);
  const timezone = merged.timezone || 'America/Los_Angeles';
  const now = new Date();
  const renewalDate = parseDate(merged.customer?.renewal_date || merged.renewal_date);
  const renewalDays = renewalDate ? daysBetween(now, renewalDate) : null;
  const renewalCountdown = renewalDate ? `${renewalDays} days` : 'TBD';
  const renewalBand =
    renewalDays === null
      ? { status: 'watch', label: 'Unknown' }
      : renewalDays <= 60
      ? { status: 'risk', label: 'Priority' }
      : renewalDays <= 90
      ? { status: 'watch', label: 'Priority' }
      : renewalDays <= 180
      ? { status: 'watch', label: 'Planning window' }
      : { status: 'good', label: 'On track' };

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
  const lowestUseCase = recommendedUseCase;
  const lowestUseCaseLabel = lowestUseCase ? `${lowestUseCase.name} — ${lowestUseCase.score}` : 'N/A';
  const lowestUseCaseLink = lowestUseCase
    ? `#usecase-${lowestUseCase.key || lowestUseCase.name?.toLowerCase().replace(/\\s+/g, '-')}`
    : '#adoption';
  const workshopPlan = merged.workshop_plan || {};
  const workshopOutcomesRaw = Array.isArray(merged.workshop_outcomes) ? merged.workshop_outcomes : [];
  const workshopOutcomes = workshopOutcomesRaw.map((entry) => ({
    date: entry.date || null,
    attendance_pct: typeof entry.attendance_percent === 'number' ? entry.attendance_percent : null,
    decisions: entry.decisions || 'No decision notes captured.',
    next_step: entry.next_step || 'No next step logged.'
  }));

  const successObjectives = merged.success_plan?.objectives || [];
  const onTrack = successObjectives.filter((objective) => objective.status !== 'at_risk').length;
  const successSummary = successObjectives.length
    ? `${onTrack} of ${successObjectives.length} objectives on track`
    : 'No objectives defined';

  const engagement = merged.engagement || {};
  const impact = merged.outcomes?.impact || {};
  const impactView = {
    time_saved: impact.time_saved_hours_per_month
      ? `${formatNumber(impact.time_saved_hours_per_month)} hours/month`
      : '',
    cost_avoidance_monthly: impact.cost_avoidance_monthly ? formatCurrency(impact.cost_avoidance_monthly) : '',
    cost_avoidance_annual: impact.cost_avoidance_annual ? formatCurrency(impact.cost_avoidance_annual) : '',
    tool_consolidation_annual: impact.tool_consolidation_annual ? formatCurrency(impact.tool_consolidation_annual) : '',
    quality_improvement: impact.quality_improvement || '',
    customer_quote: impact.customer_quote || ''
  };
  const weightLabels = {
    product: `${Math.round(healthScores.weights.product * 100)}%`,
    risk: `${Math.round(healthScores.weights.risk * 100)}%`,
    outcomes: `${Math.round(healthScores.weights.outcomes * 100)}%`,
    voice: `${Math.round(healthScores.weights.voice * 100)}%`,
    engagement: `${Math.round(healthScores.weights.engagement * 100)}%`
  };
  const weightsSummary = `PROVE weights: Product ${weightLabels.product}, Risk ${weightLabels.risk}, Outcomes ${weightLabels.outcomes}, Voice ${weightLabels.voice}, Engagement ${weightLabels.engagement}.`;

  const derivedMetrics =
    window.DerivedMetrics && typeof window.DerivedMetrics.deriveAccountMetrics === 'function'
      ? window.DerivedMetrics.deriveAccountMetrics(merged, { now })
      : null;
  const compliance =
    window.HandbookRules && typeof window.HandbookRules.evaluateHandbookCompliance === 'function'
      ? window.HandbookRules.evaluateHandbookCompliance(merged, {
          now,
          timezone,
          derivedMetrics
        })
      : { checks: [], alerts: [], overallStatus: 'watch', overallStatusLabel: 'Yellow' };

  const nextCadenceDate = parseDate(derivedMetrics?.nextCadenceCallDate);
  const daysToNextCadence =
    nextCadenceDate && !Number.isNaN(nextCadenceDate.getTime()) ? daysBetween(now, nextCadenceDate) : null;
  const orientationDueItems = [
    {
      title: 'Health update due',
      detail: `${formatDate(derivedMetrics?.nextHealthUpdateDue)} (${derivedMetrics?.healthUpdateFrequency || 'Biweekly'})`,
      status: derivedMetrics?.isHealthUpdateOverdue ? 'risk' : 'watch',
      link: '#health-updates'
    },
    {
      title: derivedMetrics?.escalated ? `Escalation update due (${derivedMetrics?.escalationSeverity || 'P3'})` : 'Escalation status',
      detail: derivedMetrics?.escalated
        ? `${formatDate(derivedMetrics?.nextEscalationUpdateDue)}`
        : 'No active escalation',
      status: derivedMetrics?.escalated
        ? derivedMetrics?.isEscalationUpdateOverdue
          ? 'risk'
          : 'watch'
        : 'good',
      link: '#health-updates'
    },
    {
      title: 'Next cadence call',
      detail:
        daysToNextCadence === null
          ? formatDate(derivedMetrics?.nextCadenceCallDate)
          : `${formatDate(derivedMetrics?.nextCadenceCallDate)} (${daysToNextCadence} day${daysToNextCadence === 1 ? '' : 's'})`,
      status:
        daysToNextCadence === null
          ? 'watch'
          : daysToNextCadence < 0
          ? 'risk'
          : daysToNextCadence <= 7
          ? 'watch'
          : 'good',
      link: '#cadence-tracker'
    }
  ];

  const cadenceStatus = derivedMetrics?.cadenceStatus || 'watch';
  const workshopStatus = derivedMetrics?.workshopStatus || 'watch';
  const successPlanQuarterStatus =
    derivedMetrics?.successPlanStatus === 'active'
      ? 'good'
      : derivedMetrics?.successPlanStatus === 'stale'
      ? 'risk'
      : 'watch';
  const healthUpdateStatus = derivedMetrics?.isHealthUpdateOverdue ? 'risk' : 'good';
  const escalationUpdateStatus = derivedMetrics?.isEscalationUpdateOverdue
    ? 'risk'
    : derivedMetrics?.escalated
    ? 'watch'
    : 'good';
  const renewalPriorityStatus = derivedMetrics?.isRenewalCritical
    ? 'risk'
    : derivedMetrics?.isRenewalPriority
    ? 'watch'
    : 'good';

  const ebrCountdownLabel =
    derivedMetrics?.ebrCountdownDays === null || derivedMetrics?.ebrCountdownDays === undefined
      ? 'TBD'
      : derivedMetrics.ebrCountdownDays < 0
      ? `Overdue by ${Math.abs(derivedMetrics.ebrCountdownDays)} days`
      : `${derivedMetrics.ebrCountdownDays} days`;

  const expansion = merged.expansion_motion || {};
  const expansionRiskStatus = derivedMetrics?.expansionTrendStatus || 'good';
  const expansionRiskText =
    expansionRiskStatus === 'risk'
      ? 'Sentiment is down during a priority renewal window. Escalate risk review.'
      : expansionRiskStatus === 'watch'
      ? 'Sentiment is down. Track expansion blockers weekly.'
      : 'Expansion sentiment is stable.';

  const renewalReadinessItems = derivedMetrics?.renewalReadinessItems || [];
  const renewalCriticalRisk =
    derivedMetrics?.isRenewalCritical && derivedMetrics?.renewalOutcomesValidated === false
      ? 'Renewal is within 60 days and outcomes are not validated.'
      : '';
  const renewalPriorityRisk =
    renewalCriticalRisk ||
    (derivedMetrics?.isRenewalPriority && expansionRiskStatus !== 'good'
      ? 'Renewal is within 90 days with declining sentiment. Tighten risk mitigation.'
      : '');

  const resources = resourceRegistry || DEFAULT_RESOURCE_REGISTRY;
  const categoryMap = (resources.categories || []).reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});
  const resourceItems = (resources.resources || []).map((resource) => ({
    ...resource,
    categoryLabels: (resource.categories || []).map((id) => categoryMap[id]?.label).filter(Boolean)
  }));
  const groupedResources = (resources.categories || []).reduce((acc, category) => {
    acc[category.id] = resourceItems.filter((resource) => (resource.categories || []).includes(category.id));
    return acc;
  }, {});

  return {
    accountId: merged.account_id,
    accountName: merged.account_name || merged.customer?.name,
    timezone,
    audience,
    derivedMetrics,
    handbook: compliance,
    meta: {
      last_updated: formatDate(merged.meta?.last_updated),
      data_freshness_note: merged.meta?.data_freshness_note || formatDate(merged.meta?.last_updated)
    },
    freshness: {
      overall_last_sync: formatDateTime(merged.freshness?.overall_last_sync),
      next_sync: formatDateTime(merged.freshness?.next_sync)
    },
    customer: {
      ...merged.customer,
      renewal_date: formatDate(merged.customer?.renewal_date || merged.renewal_date),
      renewal_countdown: renewalCountdown,
      renewal_status: renewalBand.status,
      renewal_status_label: renewalBand.label
    },
    seats: {
      purchased: formatNumber(merged.seats?.purchased || 0),
      active: formatNumber(merged.seats?.active || 0),
      utilization_pct: formatPercent(seatUtil),
      utilization_trend: `${seatTrend >= 0 ? '+' : ''}${seatTrend}% MoM`
    },
    health: {
      product_score: healthScores.product,
      risk_score: healthScores.risk,
      outcomes_score: healthScores.outcomes,
      voice_score: healthScores.voice,
      engagement_score: healthScores.engagement,
      overall_score: healthScores.overall,
      band_label: healthBand.label,
      band_status: healthBand.status,
      weights: weightLabels,
      weights_summary: weightsSummary
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
      recommended_link: recommendedUseCase?.playbook || 'https://handbook.gitlab.com/handbook/customer-success/playbooks/',
      lowest_use_case: lowestUseCaseLabel,
      lowest_use_case_link: lowestUseCaseLink
    },
    engagement: {
      next_ebr_date: `Next EBR: ${formatDate(engagement.next_ebr_date)}`,
      last_ebr_date: formatDate(engagement.last_ebr_date),
      next_qbr_date: formatDate(engagement.next_qbr_date),
      cadence_frequency: engagement.cadence_call_frequency || 'Monthly',
      cadence_attendance: formatPercent(engagement.cadence_attendance_rate || 0),
      ebr_attendance: formatPercent(engagement.ebr_attendance_rate || 0)
    },
    cadence: {
      last_call_date: formatDate(derivedMetrics?.lastCadenceCallDate),
      next_call_date: formatDate(derivedMetrics?.nextCadenceCallDate),
      days_since_last_call:
        derivedMetrics?.daysSinceLastCall === null || derivedMetrics?.daysSinceLastCall === undefined
          ? 'TBD'
          : `${derivedMetrics.daysSinceLastCall}`,
      recommended_frequency: derivedMetrics?.recommendedCadenceFrequency || 'Biweekly',
      triage_state: derivedMetrics?.triageState || 'At Risk',
      suggested_state: derivedMetrics?.suggestedTriageState || 'At Risk',
      automation_cue: derivedMetrics?.triageAutomationCue || 'Cadence baseline is missing; capture the last call date.',
      recommended_action: derivedMetrics?.recommendedCadenceAction || 'Maintain cadence; confirm next agenda',
      violated: Boolean(derivedMetrics?.cadenceViolated),
      triage_required: Boolean(derivedMetrics?.triageRecoveryRequired),
      triage_complete: Boolean(derivedMetrics?.triageRecoveryComplete),
      triage_recovery_checklist: derivedMetrics?.triageRecoveryChecklist || [],
      triage_status: derivedMetrics?.triageStatus || 'watch',
      status: cadenceStatus
    },
    workshops: {
      count_this_quarter: String(derivedMetrics?.workshopCountThisQuarter ?? 0),
      next_date: formatDate(derivedMetrics?.nextWorkshopDate),
      next_theme: merged.next_workshop_theme || 'Not scheduled',
      target_use_case: workshopPlan.target_use_case || recommendedUseCase?.name || 'No targeted use case',
      plan_title:
        workshopPlan.title ||
        (recommendedUseCase?.name ? `${recommendedUseCase.name} Workshop` : 'Adoption Workshop'),
      plan_success_criteria:
        workshopPlan.success_criteria ||
        recommendedUseCase?.recommended_actions?.[0]?.expected_impact ||
        'Define success criteria in workshop_plan.success_criteria.',
      expected_health_delta: workshopPlan.expected_health_delta || '+3 to +5 Product usage score points',
      plan_next_milestone:
        workshopPlan.next_milestone ||
        recommendedUseCase?.recommended_actions?.[0]?.action ||
        'Define follow-up milestone in workshop_plan.next_milestone.',
      expectation_label:
        workshopStatus === 'good'
          ? 'Meets quarterly expectation'
          : workshopStatus === 'watch'
          ? 'Scheduled before quarter end'
          : 'Workshop expectation missed',
      expectation_note:
        workshopStatus === 'good'
          ? 'At least one workshop has been delivered this quarter.'
          : workshopStatus === 'watch'
          ? 'No workshop delivered yet, but one is scheduled before quarter end.'
          : 'No workshop delivered this quarter and none scheduled.',
      status: workshopStatus
    },
    orientation: {
      overall_status: compliance.overallStatusLabel || 'Yellow',
      health_summary: `${healthBand.label} (${healthScores.overall})`,
      renewal_summary: renewalCountdown,
      engagement_state: derivedMetrics?.triageState || 'At Risk'
    },
    ebr: {
      last_date: formatDate(derivedMetrics?.lastEbrDate),
      target_date: formatDate(derivedMetrics?.ebrDueDate),
      countdown: ebrCountdownLabel
    },
    success_plan: {
      progress_summary: successSummary,
      next_review: formatDate(merged.success_plan?.next_review),
      status_label:
        derivedMetrics?.successPlanStatus === 'active'
          ? 'Active'
          : derivedMetrics?.successPlanStatus === 'stale'
          ? 'Stale'
          : 'In progress',
      last_updated: formatDate(derivedMetrics?.successPlanLastUpdated),
      update_due_by: formatDate(derivedMetrics?.successPlanDueBy),
      customer_validation:
        derivedMetrics?.successPlanCustomerValidated?.value === true
          ? `Validated ${formatDate(derivedMetrics.successPlanCustomerValidated.date)}`
          : 'Not validated',
      manager_validation:
        derivedMetrics?.successPlanManagerValidated?.value === true
          ? `Validated ${formatDate(derivedMetrics.successPlanManagerValidated.date)}`
          : 'Not validated',
      status: successPlanQuarterStatus
    },
    risk_updates: {
      last_health_update: formatDate(merged.last_health_update_date),
      next_health_due: formatDate(derivedMetrics?.nextHealthUpdateDue),
      health_frequency: derivedMetrics?.healthUpdateFrequency || 'Biweekly',
      health_badge:
        healthUpdateStatus === 'risk'
          ? 'Overdue'
          : healthUpdateStatus === 'watch'
          ? 'Due soon'
          : 'On track',
      health_note:
        healthUpdateStatus === 'risk'
          ? `Health update overdue by ${Math.abs(derivedMetrics?.healthUpdateOverdueByDays || 0)} day(s).`
          : 'Health updates are in cadence.',
      health_status: healthUpdateStatus,
      escalated_label: derivedMetrics?.escalated ? 'Yes' : 'No',
      escalation_severity: derivedMetrics?.escalationSeverity || 'None',
      next_escalation_due: formatDate(derivedMetrics?.nextEscalationUpdateDue),
      escalation_badge:
        escalationUpdateStatus === 'risk'
          ? 'Overdue'
          : escalationUpdateStatus === 'watch'
          ? 'Due soon'
          : 'On track',
      escalation_note:
        escalationUpdateStatus === 'risk'
          ? `Escalation update overdue by ${Math.abs(derivedMetrics?.escalationOverdueByDays || 0)} day(s).`
          : derivedMetrics?.escalated
          ? 'Escalation updates are currently in cadence.'
          : 'No active escalation.',
      escalation_status: escalationUpdateStatus
    },
    renewal: {
      date: formatDate(merged.renewal_date || merged.customer?.renewal_date),
      days_to:
        derivedMetrics?.daysToRenewal === null || derivedMetrics?.daysToRenewal === undefined
          ? 'TBD'
          : `${derivedMetrics.daysToRenewal} days`,
      owner: merged.renewal_owner || merged.customer?.csm || 'CSM',
      priority_label: renewalBand.label,
      priority_status: renewalPriorityStatus
    },
    expansion: {
      opened_qoq: formatNumber(expansion.plays_opened_qoq || 0),
      completed_qoq: formatNumber(expansion.plays_completed_qoq || 0),
      win_rate: `${formatNumber(expansion.win_rate_percent || 0)}%`,
      sentiment: expansion.sentiment_trend || 'Flat',
      last_sentiment: formatDate(expansion.last_sentiment_logged_date),
      top_use_case: expansion.top_expansion_use_case || 'Not specified',
      risk_status: expansionRiskStatus,
      risk_note: expansionRiskText
    },
    outcomes: {
      ...merged.outcomes,
      impact: impactView
    },
    vsa: {
      bottleneck_stage: merged.vsa?.bottleneck_stage || 'TBD'
    },
    collaboration_project: {
      url: merged.collaboration_project?.url || ''
    },
    milestones: buildMilestones(merged),
    progress: {
      health_product: clamp(healthScores.product / 100),
      health_risk: clamp(healthScores.risk / 100),
      health_outcomes: clamp(healthScores.outcomes / 100),
      health_voice: clamp(healthScores.voice / 100),
      health_engagement: clamp(healthScores.engagement / 100)
    },
    lists: {
      seatTrend: merged.seats?.utilization_30d_series || [],
      renewalChecklist: merged.renewal_readiness_checklist || [],
      renewalReadiness: renewalReadinessItems,
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
      valuePoints: merged.outcomes?.value_points || [],
      digitalBreakdown: merged.touchpoints || {},
      cadenceCalendar: merged.engagement?.cadence_calendar || [],
      triageRecoveryChecklist: derivedMetrics?.triageRecoveryChecklist || [],
      ebrDates: buildEbrDates(merged.engagement || {}),
      ebrPrepChecklist: derivedMetrics?.ebrPrepChecklist || [],
      orientationDueItems: orientationDueItems,
      workshops: merged.workshop_catalog || [],
      workshopOutcomes: workshopOutcomes,
      collaboration: merged.collaboration_project || {},
      freshness: merged.freshness || {},
      healthDrivers: merged.health?.drivers || [],
      resources: groupedResources,
      resourceRegistry: {
        categories: resources.categories || [],
        items: resourceItems
      },
      responsePlaybooks: merged.response_playbooks || {},
      landingZone: merged.adoption?.landing_zone || { phases: [] },
      nextActions: buildNextActions(merged, healthScores, digitalScore),
      growthObjectives: merged.growth_plan?.objectives || [],
      growthHypotheses: merged.growth_plan?.hypotheses || [],
      growthPlays: merged.growth_plan?.active_plays || [],
      growthOwners: merged.growth_plan?.owners || []
    },
    alerts: {
      renewalRisk: renewalPriorityRisk
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

const computePortfolioRollup = (accounts, options = {}) => {
  const now = options.now || new Date();
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const total = safeAccounts.length || 0;
  if (!total) {
    return {
      total: 0,
      metrics: [],
      outliers: [],
      overallStatus: 'watch',
      overallLabel: 'Yellow',
      summary: 'No accounts available for portfolio review'
    };
  }
  const statusRank = { good: 0, watch: 1, risk: 2 };
  const maxStatus = (left, right) => (statusRank[left] >= statusRank[right] ? left : right);
  const checkStatus = (checks, id) => checks.find((check) => check.id === id)?.status || 'watch';

  const accountRows = safeAccounts.map((account) => {
    let normalized = account;
    if (window.DerivedMetrics && typeof window.DerivedMetrics.validateAccountData === 'function') {
      const validation = window.DerivedMetrics.validateAccountData(account);
      normalized = validation.normalized || account;
    }

    const derived =
      window.DerivedMetrics && typeof window.DerivedMetrics.deriveAccountMetrics === 'function'
        ? window.DerivedMetrics.deriveAccountMetrics(normalized, { now })
        : null;

    const compliance =
      window.HandbookRules && typeof window.HandbookRules.evaluateHandbookCompliance === 'function'
        ? window.HandbookRules.evaluateHandbookCompliance(normalized, { now, derivedMetrics: derived })
        : { checks: [], alerts: [], overallStatus: 'watch' };

    const checks = compliance.checks || [];
    const cadenceBreach = (derived?.daysSinceLastCall ?? Number.POSITIVE_INFINITY) > 30;
    const ebrGreen = checkStatus(checks, 'ebr-annual') === 'good';
    const workshopMet = (derived?.workshopCountThisQuarter ?? 0) >= 1;
    const successPlanGreen = checkStatus(checks, 'success-plan-quarter') === 'good';
    const playsOpened = Number(normalized.expansion_motion?.plays_opened_qoq || 0);
    const playsCompleted = Number(normalized.expansion_motion?.plays_completed_qoq || 0);

    const reasons = [];
    if (cadenceBreach) {
      const cadenceStatus = (derived?.daysSinceLastCall ?? 0) > 45 ? 'risk' : 'watch';
      reasons.push({
        status: cadenceStatus,
        text: `${derived?.daysSinceLastCall ?? 'Unknown'} days since last call`
      });
    }
    if (!ebrGreen) {
      const status = checkStatus(checks, 'ebr-annual');
      reasons.push({
        status,
        text: 'EBR not within the last 12 months'
      });
    }
    if (!workshopMet) {
      reasons.push({
        status: derived?.workshopStatus === 'watch' ? 'watch' : 'risk',
        text:
          derived?.workshopStatus === 'watch'
            ? 'No workshop delivered yet this quarter (one is scheduled)'
            : 'No workshop delivered or scheduled this quarter'
      });
    }
    if (!successPlanGreen) {
      reasons.push({
        status: checkStatus(checks, 'success-plan-quarter'),
        text: 'Success plan is not current and validated this quarter'
      });
    }
    (compliance.alerts || []).forEach((alert) => {
      reasons.push({
        status: alert.status || 'risk',
        text: alert.label || 'Compliance alert'
      });
    });

    const accountStatus = reasons.reduce((status, reason) => maxStatus(status, reason.status), 'good');

    return {
      account_id: normalized.account_id,
      account_name: normalized.account_name || normalized.customer?.name || 'Unknown account',
      derived,
      checks,
      compliance,
      cadenceBreach,
      ebrGreen,
      workshopMet,
      successPlanGreen,
      playsOpened,
      playsCompleted,
      reasons,
      status: accountStatus
    };
  });

  const completedEbrCount = accountRows.filter((row) => row.ebrGreen).length;
  const cadenceBreaches = accountRows.filter((row) => row.cadenceBreach).length;
  const workshopCoverageCount = accountRows.filter((row) => row.workshopMet).length;
  const successPlanCoverageCount = accountRows.filter((row) => row.successPlanGreen).length;
  const totalPlaysOpened = accountRows.reduce((sum, row) => sum + row.playsOpened, 0);
  const totalPlaysCompleted = accountRows.reduce((sum, row) => sum + row.playsCompleted, 0);
  const redAccountsMissingWeekly = accountRows.filter(
    (row) => row.derived?.healthStatus === 'Red' && row.derived?.isHealthUpdateOverdue
  ).length;
  const greenAccountsMissingMonthly = accountRows.filter(
    (row) => row.derived?.healthStatus === 'Green' && row.derived?.isHealthUpdateOverdue
  ).length;

  const toPct = (value) => (total ? Math.round((value / total) * 100) : 0);
  const ebrCoveragePct = toPct(completedEbrCount);
  const workshopCoveragePct = toPct(workshopCoverageCount);
  const successPlanCoveragePct = toPct(successPlanCoverageCount);
  const playCompletionRate = totalPlaysOpened > 0 ? Math.round((totalPlaysCompleted / totalPlaysOpened) * 100) : 0;

  const metrics = [
    {
      id: 'ebr-coverage',
      label: 'EBR coverage (last 12 months)',
      value: `${ebrCoveragePct}%`,
      detail: `${completedEbrCount}/${total} accounts`,
      target: 'Target >= 75%',
      status: ebrCoveragePct >= 75 ? 'good' : ebrCoveragePct >= 60 ? 'watch' : 'risk'
    },
    {
      id: 'cadence-breaches',
      label: 'Cadence breaches (>30 days)',
      value: `${cadenceBreaches}/${total}`,
      detail: `${total - cadenceBreaches}/${total} in compliance`,
      target: 'Target = 0 breaches',
      status: cadenceBreaches === 0 ? 'good' : cadenceBreaches <= Math.max(1, Math.floor(total * 0.2)) ? 'watch' : 'risk'
    },
    {
      id: 'workshop-coverage',
      label: 'Workshop coverage (this quarter)',
      value: `${workshopCoveragePct}%`,
      detail: `${workshopCoverageCount}/${total} accounts`,
      target: 'Target = 100%',
      status: workshopCoveragePct === 100 ? 'good' : workshopCoveragePct >= 75 ? 'watch' : 'risk'
    },
    {
      id: 'qoq-plays',
      label: 'QoQ plays completed/opened',
      value: `${totalPlaysCompleted}/${totalPlaysOpened}`,
      detail: `${playCompletionRate}% completion rate`,
      target: 'Track play execution QoQ',
      status: totalPlaysOpened === 0 ? 'watch' : playCompletionRate >= 60 ? 'good' : playCompletionRate >= 40 ? 'watch' : 'risk'
    },
    {
      id: 'success-plan-coverage',
      label: 'Success plans updated + validated',
      value: `${successPlanCoveragePct}%`,
      detail: `${successPlanCoverageCount}/${total} accounts`,
      target: 'Target = 100%',
      status: successPlanCoveragePct === 100 ? 'good' : successPlanCoveragePct >= 75 ? 'watch' : 'risk'
    },
    {
      id: 'health-update-misses',
      label: 'Health update misses by risk band',
      value: `Red weekly missed: ${redAccountsMissingWeekly}`,
      detail: `Green monthly missed: ${greenAccountsMissingMonthly}`,
      target: 'Target = 0 misses',
      status:
        redAccountsMissingWeekly > 0
          ? 'risk'
          : greenAccountsMissingMonthly > 0
          ? 'watch'
          : 'good'
    }
  ];

  const outliers = accountRows
    .filter((row) => row.reasons.length > 0)
    .map((row) => ({
      account_id: row.account_id,
      account_name: row.account_name,
      status: row.status,
      reasons: row.reasons
        .sort((left, right) => statusRank[right.status] - statusRank[left.status])
        .map((reason) => reason.text)
    }))
    .sort((left, right) => {
      const statusDelta = statusRank[right.status] - statusRank[left.status];
      if (statusDelta) return statusDelta;
      return right.reasons.length - left.reasons.length;
    });

  const overallStatus = metrics.reduce((status, metric) => maxStatus(status, metric.status), 'good');
  const overallLabel = overallStatus === 'good' ? 'Green' : overallStatus === 'watch' ? 'Yellow' : 'Red';

  return {
    total,
    metrics,
    outliers,
    overallStatus,
    overallLabel,
    summary: `${total} account${total === 1 ? '' : 's'} in pooled review`
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
  document.querySelectorAll('[data-health-dot]').forEach((el) => {
    const key = el.dataset.healthDot;
    if (!key) return;
    const score = view.health[`${key}_score`];
    el.dataset.status = bandFromScore(score).status;
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

const renderEmptyState = (list, message, link) => {
  if (!list) return;
  const li = document.createElement('li');
  li.className = 'empty-state';
  li.innerHTML = `
    <div class="empty-title">${message}</div>
    ${link ? `<a class="inline-link" href="${link.href}">${link.label}</a>` : ''}
  `;
  list.appendChild(li);
};

const setEmptyFlag = (el, isEmpty) => {
  if (!el) return;
  if (isEmpty) {
    el.dataset.empty = 'true';
  } else {
    delete el.dataset.empty;
  }
  if (el.dataset.emptyTrigger === 'true') {
    const scope = el.closest('[data-hide-on-empty]');
    if (scope) {
      if (isEmpty) {
        scope.dataset.empty = 'true';
      } else {
        delete scope.dataset.empty;
      }
    }
  }
};

const renderEventList = (list, items, build, empty) => {
  if (!list) return;
  list.innerHTML = '';
  if (!items || items.length === 0) {
    setEmptyFlag(list, true);
    const message = empty?.message || 'No updates yet.';
    renderEmptyState(list, message, empty?.link);
    return;
  }
  setEmptyFlag(list, false);
  items.forEach((item) => {
    list.appendChild(build(item));
  });
};

const renderSeatTrend = (list, items) => {
  renderEventList(
    list,
    items,
    (item) => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `
        <div class="event-title">${formatDate(item.date)}</div>
        <div class="event-meta">${formatPercent(item.value)}</div>
      `;
      return li;
    },
    { message: 'No utilization trend captured yet.' }
  );
};

const renderRenewalChecklist = (list, items) => {
  renderEventList(
    list,
    items,
    (item) => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `<div class="event-title">${item}</div>`;
      return li;
    },
    { message: 'No renewal readiness items logged yet.' }
  );
};

const renderActivityFeed = (list, items) => {
  renderEventList(
    list,
    items,
    (item) => {
      const li = document.createElement('li');
      li.className = 'event-item';
      const meta = formatDate(item.date);
      li.innerHTML = `
        <div class="event-title">${item.title}</div>
        <div class="event-meta">${meta} | ${item.detail}</div>
      `;
      return li;
    },
    { message: 'No activity updates logged yet.', link: { href: '#engagement', label: 'Log a touchpoint' } }
  );
};

const renderTaskList = (list, items) => {
  if (!list) return;
  list.innerHTML = '';
  if (!items || items.length === 0) {
    setEmptyFlag(list, true);
    renderEmptyState(list, 'No onboarding tasks logged yet.', { href: '#journey', label: 'Add checklist items' });
    return;
  }
  setEmptyFlag(list, false);
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

const renderSimpleEventList = (list, items, empty) => {
  renderEventList(
    list,
    items,
    (item) => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `<div class="event-title">${item}</div>`;
      return li;
    },
    empty
  );
};

const renderUsecaseSummary = (list, items) => {
  if (!list) return;
  list.innerHTML = '';
  if (!items || items.length === 0) {
    setEmptyFlag(list, true);
    renderEmptyState(list, 'No use case scores yet. Connect adoption data to begin scoring.', {
      href: '#adoption',
      label: 'Review adoption'
    });
    return;
  }
  setEmptyFlag(list, false);
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
  if (!items || items.length === 0) {
    setEmptyFlag(container, true);
    container.innerHTML = '<p class="empty-text">No use case scorecards available yet.</p>';
    return;
  }
  setEmptyFlag(container, false);
  items.forEach((useCase) => {
    const band = bandFromScore(useCase.score);
    const card = document.createElement('article');
    card.className = 'card usecase-card';
    card.id = `usecase-${useCase.key || useCase.name?.toLowerCase().replace(/\\s+/g, '-')}`;
    const trend = useCase.trend_30d_pct ?? 0;
    const trendLabel = `${trend >= 0 ? '+' : ''}${trend}% vs last 30d`;
    const drivers = useCase.drivers || [];
    const thresholds = useCase.thresholds || [];
    const playbook = useCase.playbook || 'https://handbook.gitlab.com/handbook/customer-success/playbooks/';
    const thresholdSource = useCase.threshold_source || '';
    const thresholdLink = thresholdSource
      ? `<a class="tooltip inline-link" href="${thresholdSource}" target="_blank" rel="noopener" data-tooltip="GitLab use case adoption scoring thresholds.">Handbook</a>`
      : '';
    const keyMetrics = useCase.key_metrics || [];
    const gapAnalysis = useCase.gap_analysis || [];
    const recommendations = useCase.recommended_actions || [];
    card.innerHTML = `
      <div class="metric-head">
        <div>
          <h3>${useCase.name}</h3>
          <p class="muted">Score ${useCase.score} / 100 • ${trendLabel}</p>
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
              <div class="metric-meta">Metric driving score</div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
      <div class="usecase-criteria">
        <div class="metric-meta">Key metrics</div>
        <ul class="mini-list">
          ${
            keyMetrics.length
              ? keyMetrics
                  .map(
                    (metric) =>
                      `<li class="mini-item">${metric.name}: ${metric.current} (target ${metric.target}) — ${metric.explainer}</li>`
                  )
                  .join('')
              : '<li class="mini-item">No key metrics available.</li>'
          }
        </ul>
      </div>
      <div class="usecase-criteria">
        <div class="metric-meta">Adoption thresholds ${thresholdLink}</div>
        <ul class="mini-list">
          ${thresholds.map((threshold) => `<li class="mini-item">${threshold}</li>`).join('')}
        </ul>
      </div>
      <div class="usecase-criteria">
        <div class="metric-meta">Gap analysis</div>
        <ul class="mini-list">
          ${
            gapAnalysis.length
              ? gapAnalysis.map((gap) => `<li class="mini-item">${gap}</li>`).join('')
              : '<li class="mini-item">No gaps identified.</li>'
          }
        </ul>
      </div>
      <div class="usecase-criteria">
        <div class="metric-meta">Recommended actions</div>
        <ul class="mini-list">
          ${
            recommendations.length
              ? recommendations
                  .map(
                    (rec) =>
                      `<li class="mini-item">${rec.action} — ${rec.expected_impact} <a class="inline-link" href="${rec.link}" target="_blank" rel="noopener">Playbook</a></li>`
                  )
                  .join('')
              : '<li class="mini-item">No recommended actions defined.</li>'
          }
        </ul>
      </div>
      <div class="usecase-criteria">
        Playbook: <a class="inline-link" href="${playbook}" target="_blank" rel="noopener">Open</a>
      </div>
    `;
    container.appendChild(card);
  });
};

const renderHealthList = (list, items, audience = 'internal') => {
  if (!list) return;
  list.innerHTML = '';
  if (!items || items.length === 0) {
    setEmptyFlag(list, true);
    if (audience === 'customer') {
      renderEmptyState(list, '✅ No active churn signals detected.', { href: '#health-risk', label: 'Review health score' });
    } else {
      renderEmptyState(list, 'No early warning flags detected yet.', { href: '#health-risk', label: 'Review health' });
    }
    return;
  }
  setEmptyFlag(list, false);
  items.forEach((item) => {
    const status = statusFromSeverity(item.severity);
    const li = document.createElement('li');
    li.className = 'health-item';
    li.innerHTML = `
      <span class="status-dot" data-status="${status}"></span>
      <div>
        <div class="health-title">${item.title}</div>
        <div class="health-note">${item.pattern ? `${item.pattern} • ` : ''}${item.trigger || item.detail}</div>
        <div class="health-note">Impact: ${item.impact || item.detail}</div>
        <div class="health-note">Recommended: ${item.recommended_action || 'Review mitigation plan'}</div>
        ${
          audience === 'customer'
            ? `<div class="health-note">Due ${formatDate(item.due_date)}</div>`
            : `<div class="health-note">Owner: ${item.owner || 'CSM'} • Due ${formatDate(item.due_date)}</div>`
        }
        <a class="inline-link" href="${item.playbook}" target="_blank" rel="noopener">Playbook</a>
      </div>
    `;
    list.appendChild(li);
  });
};

const renderRiskRegister = (container, items) => {
  if (!container) return;
  container.innerHTML = '';
  if (!items || items.length === 0) {
    setEmptyFlag(container, true);
    container.innerHTML = '<p class="empty-text">No risk items logged yet.</p>';
    return;
  }
  setEmptyFlag(container, false);
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
  if (!items || items.length === 0) {
    renderEmptyState(list, 'No resources linked yet.', { href: '#resources', label: 'Add resources' });
    return;
  }
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

const renderComplianceStrip = (checksContainer, alertsContainer, overallEl, handbook, passedEl, failingEl) => {
  if (!checksContainer || !handbook) return;
  checksContainer.innerHTML = '';
  const checks = handbook.checks || [];
  const passedCount = checks.filter((check) => check.status === 'good').length;
  const failingCount = checks.filter((check) => check.status === 'risk').length;

  if (passedEl) {
    passedEl.textContent = `${passedCount}/${checks.length || 0}`;
  }
  if (failingEl) {
    failingEl.textContent = String(failingCount);
  }

  checks.forEach((check) => {
    const stateLabel = check.status === 'good' ? 'Pass' : check.status === 'risk' ? 'Fail' : 'Watch';
    const item = document.createElement('article');
    item.className = 'compliance-item';
    item.innerHTML = `
      <div class="compliance-item-head">
        <span class="compliance-item-name">${check.name}</span>
        <span class="status-pill" data-status="${check.status}">${check.statusLabel}</span>
      </div>
      <div class="event-meta"><span class="status-pill" data-status="${check.status}">${stateLabel}</span></div>
      <p class="compliance-item-reason">${check.reason}</p>
      <a href="${check.anchor}">View</a>
    `;
    checksContainer.appendChild(item);
  });

  if (!checks.length) {
    checksContainer.innerHTML = '<p class="empty-text">No compliance checks available. Verify account fields and rerun.</p>';
  }

  if (overallEl) {
    overallEl.textContent = handbook.overallStatusLabel || 'Yellow';
    overallEl.dataset.status = handbook.overallStatus || 'watch';
  }

  if (!alertsContainer) return;
  alertsContainer.innerHTML = '';
  (handbook.alerts || []).forEach((alert) => {
    const badge = document.createElement('span');
    badge.className = 'compliance-alert';
    badge.dataset.status = alert.status;
    badge.textContent = alert.label;
    badge.setAttribute('title', alert.reason);
    alertsContainer.appendChild(badge);
  });
};

const renderEbrPrepChecklist = (list, items) => {
  if (!list) return;
  list.innerHTML = '';
  if (!items || !items.length) {
    renderEmptyState(list, 'No EBR target date available yet.', { href: '#engagement', label: 'Add EBR target' });
    return;
  }
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `
      <div class="event-title">${item.label}</div>
      <div class="event-meta">
        <span class="status-pill" data-status="${item.status}">${item.status_label}</span>
        • Due ${formatDate(item.due_date)}
      </div>
    `;
    list.appendChild(li);
  });
};

const renderRenewalReadiness = (list, items) => {
  if (!list) return;
  list.innerHTML = '';
  if (!items || !items.length) {
    renderEmptyState(list, 'No renewal readiness checkpoints captured yet.');
    return;
  }
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `
      <div class="event-title">${item.label}</div>
      <div class="event-meta">
        <span class="status-pill" data-status="${item.status}">${item.value ? 'Complete' : 'Pending'}</span>
        ${item.date ? ` • ${formatDate(item.date)}` : ''}
      </div>
    `;
    list.appendChild(li);
  });
};

const renderTriageRecoveryChecklist = (list, cadence) => {
  if (!list) return;
  const triageStates = ['Non-Engaged', 'Triaged', 'Triage In Progress'];
  const shouldShow = triageStates.includes(cadence?.triage_state);
  const wrapperCard = list.closest('.card');
  if (wrapperCard) {
    wrapperCard.classList.toggle('triage-active', shouldShow);
  }
  list.style.display = shouldShow ? '' : 'none';
  if (!shouldShow) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = '';
  const items = cadence?.triage_recovery_checklist || [];
  if (!items.length) {
    renderEmptyState(
      list,
      'Recovery checklist required. Update triage plan fields in account data.'
    );
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `
      <div class="event-title">${item.label}</div>
      <div class="event-meta">
        <span class="status-pill" data-status="${item.status}">${item.value ? 'Complete' : 'Pending'}</span>
        ${item.date ? ` • ${formatDate(item.date)}` : ''}
      </div>
    `;
    list.appendChild(li);
  });
};

const renderResourceRegistry = (view, state) => {
  const list = document.querySelector('[data-list="resources-registry"]');
  const categoriesEl = document.querySelector('[data-resource-categories]');
  const countEl = document.querySelector('[data-resource-count]');
  const input = document.querySelector('[data-resource-search]');
  if (!list || !categoriesEl) return;

  const registry = view.lists.resourceRegistry || { categories: [], items: [] };
  const query = (state.resourceQuery || '').trim().toLowerCase();
  const activeCategory = state.resourceCategory || 'all';
  const categories = registry.categories || [];
  const items = (registry.items || []).filter((resource) => {
    const inCategory =
      activeCategory === 'all' || (resource.categories || []).includes(activeCategory);
    if (!inCategory) return false;
    if (!query) return true;
    const haystack = `${resource.title} ${resource.description}`.toLowerCase();
    return haystack.includes(query);
  });

  categoriesEl.innerHTML = '';
  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = `resource-pill${activeCategory === 'all' ? ' is-active' : ''}`;
  allButton.dataset.resourceCategory = 'all';
  allButton.textContent = 'All';
  categoriesEl.appendChild(allButton);

  categories.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `resource-pill${activeCategory === category.id ? ' is-active' : ''}`;
    button.dataset.resourceCategory = category.id;
    button.textContent = category.label;
    categoriesEl.appendChild(button);
  });

  list.innerHTML = '';
  if (!items.length) {
    renderEmptyState(list, 'No resources match your filter.');
  } else {
    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'resource-item';
      const tags = (item.categoryLabels || [])
        .slice(0, 2)
        .map((label) => `<span class="resource-category-tag">${label}</span>`)
        .join('');
      li.innerHTML = `
        <span class="resource-title">${item.title}</span>
        <span class="resource-meta">${item.description}</span>
        ${tags}
        <a href="${item.link}" target="_blank" rel="noopener">Open</a>
      `;
      list.appendChild(li);
    });
  }

  if (countEl) {
    countEl.textContent = `${items.length} resource${items.length === 1 ? '' : 's'} shown`;
  }

  if (input && input.value !== state.resourceQuery) {
    input.value = state.resourceQuery || '';
  }
};

const renderPortfolioRollup = (portfolio, selectedAccountId) => {
  const overallEl = document.querySelector('[data-portfolio-overall]');
  const summaryEl = document.querySelector('[data-portfolio-summary]');
  const metricsContainer = document.querySelector('[data-list="portfolio-metrics"]');
  const outliersList = document.querySelector('[data-list="portfolio-outliers"]');

  if (!portfolio || !metricsContainer || !outliersList) return;

  if (overallEl) {
    overallEl.textContent = portfolio.overallLabel || 'Yellow';
    overallEl.dataset.status = portfolio.overallStatus || 'watch';
  }
  if (summaryEl) {
    summaryEl.textContent = portfolio.summary || '';
  }

  metricsContainer.innerHTML = '';
  const metrics = portfolio.metrics || [];
  if (!metrics.length) {
    metricsContainer.innerHTML = '<p class="empty-text">No portfolio metrics available.</p>';
  }
  metrics.forEach((metric) => {
    const card = document.createElement('article');
    card.className = 'portfolio-metric';
    card.innerHTML = `
      <div class="portfolio-metric-label">${metric.label}</div>
      <div class="portfolio-metric-value">${metric.value}</div>
      <div class="portfolio-metric-target">${metric.target}</div>
      <div class="event-meta">
        <span class="status-pill" data-status="${metric.status}">${
          metric.status === 'good' ? 'On track' : metric.status === 'watch' ? 'Watch' : 'At risk'
        }</span>
        ${metric.detail || ''}
      </div>
    `;
    metricsContainer.appendChild(card);
  });

  outliersList.innerHTML = '';
  if (!(portfolio.outliers || []).length) {
    renderEmptyState(outliersList, 'No portfolio outliers detected.');
    return;
  }

  portfolio.outliers.forEach((outlier) => {
    const li = document.createElement('li');
    li.className = 'event-item portfolio-outlier';
    const reason = (outlier.reasons || []).slice(0, 2).join(' • ');
    li.innerHTML = `
      <div class="event-title">
        ${outlier.account_name}
        ${outlier.account_id === selectedAccountId ? '<span class="status-pill" data-status="good">Selected</span>' : ''}
      </div>
      <div class="event-meta">
        <span class="status-pill" data-status="${outlier.status}">${
          outlier.status === 'good' ? 'On track' : outlier.status === 'watch' ? 'Watch' : 'At risk'
        }</span>
        ${reason}
      </div>
    `;
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'inline-button';
    action.textContent = 'Open account';
    action.addEventListener('click', () => {
      const select = document.querySelector('[data-account-switcher]');
      if (!select) return;
      select.value = outlier.account_id;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    li.appendChild(action);
    outliersList.appendChild(li);
  });
};

const applyOperationalStatuses = (view) => {
  const applyStatus = (selector, status) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.dataset.status = status;
    });
  };

  applyStatus('[data-field="workshops.expectation_label"]', view.workshops.status || 'watch');
  applyStatus('[data-field="success_plan.status_label"]', view.success_plan.status || 'watch');
  applyStatus('[data-field="renewal.priority_label"]', view.renewal.priority_status || 'watch');
  applyStatus('[data-field="risk_updates.health_badge"]', view.risk_updates.health_status || 'watch');
  applyStatus('[data-field="risk_updates.escalation_badge"]', view.risk_updates.escalation_status || 'watch');
  applyStatus('[data-field="cadence.triage_state"]', view.cadence.triage_status || 'watch');
  applyStatus('[data-field="orientation.overall_status"]', view.handbook?.overallStatus || 'watch');

  const cadenceBanner = document.querySelector('[data-cadence-banner]');
  if (cadenceBanner) {
    if (view.cadence.violated) {
      cadenceBanner.dataset.status = view.cadence.status === 'risk' ? 'risk' : 'watch';
      cadenceBanner.textContent =
        view.cadence.status === 'risk'
          ? 'Cadence exceeded 45 days. Elevate to Red and execute triage recovery plan.'
          : 'Cadence exceeded 30 days. Flag as Non-Engaged and start triage.';
    } else {
      cadenceBanner.dataset.status = 'good';
      cadenceBanner.textContent = 'Cadence is within expectation.';
    }
  }

  const triageBanner = document.querySelector('[data-triage-banner]');
  if (triageBanner) {
    if (view.cadence.triage_required) {
      triageBanner.dataset.status = view.cadence.triage_complete ? 'watch' : 'risk';
      triageBanner.textContent = view.cadence.triage_complete
        ? 'Triage recovery checklist is complete. Keep weekly check-ins until re-engaged.'
        : 'Triage recovery checklist is incomplete. Complete schedule, stakeholder, and workshop actions.';
    } else if (view.cadence.violated || view.cadence.triage_status !== 'good') {
      triageBanner.dataset.status = 'watch';
      triageBanner.textContent = `Triage state: ${view.cadence.triage_state}. Suggested state: ${view.cadence.suggested_state}.`;
    } else {
      triageBanner.dataset.status = 'good';
      triageBanner.textContent = 'No triage actions required.';
    }
  }

  const renewalBanner = document.querySelector('[data-renewal-risk-banner]');
  if (renewalBanner) {
    if (view.alerts.renewalRisk) {
      renewalBanner.dataset.status = view.renewal.priority_status || 'watch';
      renewalBanner.textContent = view.alerts.renewalRisk;
    } else {
      renewalBanner.removeAttribute('data-status');
      renewalBanner.textContent = '';
    }
  }

  const expansionBanner = document.querySelector('[data-expansion-risk-banner]');
  if (expansionBanner) {
    expansionBanner.dataset.status = view.expansion.risk_status;
    expansionBanner.textContent = view.expansion.risk_note;
  }

  const renewalPanel = document.querySelector('[data-renewal-panel]');
  if (renewalPanel) {
    renewalPanel.classList.toggle('is-priority', view.derivedMetrics?.isRenewalPriority === true);
  }
};

const renderSuccessPlan = (container, items, audience = 'internal') => {
  if (!container) return;
  container.innerHTML = '';
  if (!items || items.length === 0) {
    setEmptyFlag(container, true);
    container.innerHTML = '<p class="empty-text">No success plan objectives defined yet.</p>';
    return;
  }
  setEmptyFlag(container, false);
  items.forEach((objective) => {
    const band = objective.status === 'at_risk' ? 'risk' : objective.status === 'complete' ? 'good' : 'watch';
    const card = document.createElement('article');
    card.className = 'success-item';
    const dependencies = objective.dependencies || [];
    const blockers = objective.blockers || [];
    const outcomes = objective.verifiable_outcomes || [];
    const mitigations = objective.mitigations || [];
    const ownerCustomer = objective.owner_customer || objective.owner || 'Customer';
    const ownerGitlab = objective.owner_gitlab || 'CSM';
    const ownerLine =
      audience === 'customer'
        ? `Owner: ${ownerCustomer}`
        : `Owner (Customer): ${ownerCustomer} | Owner (GitLab): ${ownerGitlab}`;
    const summary = `${objective.title}\nStatus: ${objective.status.replace('_', ' ')}\nOwner: ${ownerCustomer}\nTarget: ${formatDate(
      objective.target_date
    )}\nProgress: ${Math.round(objective.progress_pct * 100)}%\nNext milestone: ${objective.next_milestone}\nBlockers: ${
      blockers.join(', ') || 'None'
    }`;

    card.innerHTML = `
      <h4>${objective.title}</h4>
      <div class="success-meta">${ownerLine} | Target: ${formatDate(objective.target_date)}</div>
      <div class="success-meta">Timeline: ${objective.timeline || 'TBD'}</div>
      <div class="success-meta">Baseline: ${objective.baseline || 'Baseline pending'}</div>
      <div class="success-meta">Success criteria: ${objective.success_criteria || 'Criteria pending'}</div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(
        objective.progress_pct * 100
      )}">
        <span class="progress-bar" style="width: ${Math.round(objective.progress_pct * 100)}%"></span>
      </div>
      <div class="success-meta">Status: <span class="status-pill" data-status="${band}">${objective.status.replace('_', ' ')}</span></div>
      <div class="success-meta">Status detail: ${objective.status_detail || 'No detail provided.'}</div>
      <div class="success-meta">Next milestone: ${objective.next_milestone}</div>
      <div class="success-meta">Dependencies: ${dependencies.join(', ') || 'None'}</div>
      ${blockers.length ? `<div class="success-meta">Blockers: ${blockers.join(', ')}</div>` : ''}
      ${mitigations.length ? `<div class="success-meta">Mitigations: ${mitigations.join(', ')}</div>` : ''}
      ${objective.value_statement ? `<div class="success-meta">Value: ${objective.value_statement}</div>` : ''}
      ${audience === 'internal' && objective.internal_notes ? `<div class="success-meta">Internal notes: ${objective.internal_notes}</div>` : ''}
      ${outcomes.length ? `<div class="success-meta">Verifiable outcomes</div>` : ''}
      ${outcomes.length ? `<ul class="mini-list">${outcomes.map((item) => `<li class="mini-item">${item}</li>`).join('')}</ul>` : ''}
      <a class="inline-link" href="${objective.evidence}" target="_blank" rel="noopener">Evidence</a>
      ${audience === 'internal' ? '<button class="inline-button" type="button" data-copy-objective>Copy status update</button>' : ''}
    `;
    container.appendChild(card);
    const copyBtn = card.querySelector('[data-copy-objective]');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        await copyToClipboard(summary);
        flashButton(copyBtn, 'Copied');
      });
    }
  });
};

const renderDoraCards = (container, dora, objectives) => {
  if (!container) return;
  container.innerHTML = '';
  const metrics = dora.metrics || {};
  const levels = dora.levels || {};
  const objectiveTitle = objectives?.[0]?.title || 'Success plan objective';

  if (!Object.keys(metrics).length) {
    setEmptyFlag(container, true);
    container.innerHTML = '<p class="empty-text">No DORA metrics available yet.</p>';
    return;
  }
  setEmptyFlag(container, false);

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
    const changeBaseline = computeChange(current, baseline);

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
      <div class="metric-meta">Change vs baseline: ${changeBaseline >= 0 ? '+' : ''}${changeBaseline}%</div>
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
  renderEventList(
    list,
    items,
    (item) => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `
        <div class="event-title">${item.label}</div>
        <div class="event-meta">${item.value}</div>
      `;
      return li;
    },
    {
      message: 'No value stream metrics captured yet.',
      link: { href: 'https://docs.gitlab.com/user/analytics/value_streams_dashboard/', label: 'View VSA docs' }
    }
  );
};

const renderRecommendations = (list, items) => {
  renderSimpleEventList(list, items, {
    message: 'No bottleneck recommendations logged yet.',
    link: { href: '#outcomes', label: 'Review value stream' }
  });
};

const renderDigitalBreakdown = (list, touchpoints) => {
  if (!list) return;
  const items = [
    `Email open rate ${formatPercent(touchpoints.email_metrics?.open_rate || 0)}`,
    `Email CTR ${formatPercent(touchpoints.email_metrics?.ctr || 0)}`,
    `Email response rate ${formatPercent(touchpoints.email_metrics?.response_rate || 0)}`,
    `Doc views ${formatNumber(touchpoints.self_service_metrics?.doc_views || 0)}`,
    `Self-service adoption ${formatPercent(touchpoints.self_service_metrics?.self_service_adoption || 0)}`,
    `Training completion ${formatPercent(touchpoints.self_service_metrics?.training_completion || 0)}`,
    `Ticket deflection ${formatPercent(touchpoints.self_service_metrics?.ticket_deflection || 0)}`,
    `Community participation ${formatPercent(touchpoints.community_metrics?.participation_rate || 0)}`,
    `Community posts ${formatNumber(touchpoints.community_metrics?.posts || 0)}`,
    `Community responses ${formatNumber(touchpoints.community_metrics?.responses || 0)}`,
    `In-app views ${formatNumber(touchpoints.in_app_metrics?.views || 0)}`,
    `In-app clicks ${formatNumber(touchpoints.in_app_metrics?.clicks || 0)}`,
    `Survey completion ${formatPercent(touchpoints.in_app_metrics?.survey_completion || 0)}`
  ];
  renderSimpleEventList(list, items, {
    message: 'No digital touchpoints captured yet.',
    link: { href: '#engagement', label: 'Log touchpoint' }
  });
};

const renderCadenceCalendar = (list, items) => {
  renderEventList(
    list,
    items,
    (item) => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `
        <div class="event-title">${item.cadence} | ${item.focus}</div>
        <div class="event-meta">Owner: ${item.owner} | Next: ${formatDate(item.next_date)}</div>
      `;
      return li;
    },
    { message: 'No cadence sessions scheduled yet.', link: { href: '#engagement', label: 'Add cadence' } }
  );
};

const renderOrientationDueItems = (list, items) => {
  renderEventList(
    list,
    items,
    (item) => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `
        <div class="event-title">${item.title}</div>
        <div class="event-meta">
          <span class="status-pill" data-status="${item.status}">${
            item.status === 'good' ? 'On track' : item.status === 'watch' ? 'Due soon' : 'Overdue'
          }</span>
          ${item.detail}
        </div>
        <a class="inline-link" href="${item.link}">View</a>
      `;
      return li;
    },
    { message: 'No due items available for this account.' }
  );
};

const renderEbrDates = (list, items) => {
  renderEventList(
    list,
    items,
    (item) => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `
        <div class="event-title">${item.label}</div>
        <div class="event-meta">${item.value}</div>
      `;
      return li;
    },
    { message: 'No EBR/QBR dates scheduled yet.', link: { href: '#engagement', label: 'Add cadence' } }
  );
};

const renderWorkshopOutcomes = (list, items) => {
  renderEventList(
    list,
    items,
    (item) => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `
        <div class="event-title">${formatDate(item.date)} • Attendance ${
          item.attendance_pct === null || item.attendance_pct === undefined ? 'N/A' : `${item.attendance_pct}%`
        }</div>
        <div class="event-meta">Decisions: ${item.decisions}</div>
        <div class="event-meta">Next step: ${item.next_step}</div>
      `;
      return li;
    },
    { message: 'No workshop outcomes logged yet.' }
  );
};

const renderWorkshops = (container, items) => {
  if (!container) return;
  container.innerHTML = '';
  if (!items || items.length === 0) {
    setEmptyFlag(container, true);
    container.innerHTML = '<p class="empty-text">No workshops scheduled yet. Add enablement sessions to drive adoption.</p>';
    return;
  }
  setEmptyFlag(container, false);
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
  renderSimpleEventList(list, items, {
    message: 'No collaboration metrics tracked yet.',
    link: { href: '#collaboration', label: 'Connect project' }
  });
};

const renderHealthDrivers = (list, drivers) => {
  if (!list) return;
  list.innerHTML = '';
  if (!drivers || drivers.length === 0) {
    setEmptyFlag(list, true);
    renderEmptyState(list, 'No health driver narrative yet.', {
      href: '#health-risk',
      label: 'Update health rubric'
    });
    return;
  }
  setEmptyFlag(list, false);
  drivers.forEach((driver) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `
      <div class="event-title">
        <span class="status-pill" data-status="${driver.status}">${driver.pillar}</span>
      </div>
      <div class="event-meta">${driver.detail}</div>
      <div class="event-meta">Action: ${driver.action}</div>
    `;
    list.appendChild(li);
  });
};

const renderValuePoints = (list, items) => {
  renderSimpleEventList(list, items, {
    message: 'No quantified value points captured yet.',
    link: { href: '#outcomes', label: 'Add value evidence' }
  });
};

const renderFreshnessList = (list, freshness) => {
  if (!list) return;
  const metrics = freshness.metrics || [];
  list.innerHTML = '';
  if (!metrics.length) {
    setEmptyFlag(list, true);
    renderEmptyState(list, 'No freshness data available yet.', {
      href: '#overview-summary',
      label: 'Update data'
    });
    return;
  }
  setEmptyFlag(list, false);
  metrics.forEach((metric) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    const statusLabel = metric.status === 'fresh' ? 'Fresh' : metric.status === 'manual' ? 'Manual' : 'Stale';
    li.innerHTML = `
      <div class="event-title">${metric.label}</div>
      <div class="event-meta">
        <span class="status-pill" data-status="${metric.status === 'fresh' ? 'good' : metric.status === 'stale' ? 'watch' : 'watch'}">
          ${statusLabel}
        </span>
        ${metric.note ? ` • ${metric.note}` : ''}
      </div>
      <div class="event-meta">Last sync: ${formatDateTime(metric.last_sync)}</div>
    `;
    list.appendChild(li);
  });
};

const updateFreshnessBadges = (view) => {
  const metrics = view.lists.freshness.metrics || [];
  document.querySelectorAll('[data-freshness-badge]').forEach((el) => {
    const key = el.dataset.freshnessBadge;
    const metric = metrics.find((item) => item.key === key);
    if (!metric) return;
    const statusLabel = metric.status === 'fresh' ? 'Fresh' : metric.status === 'manual' ? 'Manual update' : 'Stale';
    el.textContent = statusLabel;
    el.dataset.status = metric.status;
    if (metric.note) {
      el.setAttribute('title', metric.note);
    }
  });
};

const updateRenewalBadges = (view) => {
  document.querySelectorAll('[data-renewal-badge]').forEach((el) => {
    el.textContent = view.customer.renewal_status_label;
    el.dataset.status = view.customer.renewal_status;
  });
};

const buildActionsSummary = (actions) =>
  actions
    .map((action) => {
      const steps = action.steps?.length ? `\n  Steps: ${action.steps.join('; ')}` : '';
      return `${action.title}\n  Why: ${action.rationale || action.why}\n  Owner: ${action.owner}\n  Due: ${action.due_date}${steps}`;
    })
    .join('\n\n');

const renderPlaybookChecklist = (list, items, state, keyPrefix, audience = 'internal') => {
  if (!list) return;
  list.innerHTML = '';
  if (!items || items.length === 0) {
    setEmptyFlag(list, true);
    renderEmptyState(list, 'No checklist items yet.', { href: '#health-risk', label: 'Update playbook' });
    return;
  }
  setEmptyFlag(list, false);
  items.forEach((item, index) => {
    const id = `${keyPrefix}-${index}`;
    const li = document.createElement('li');
    li.className = 'action-task';
    if (audience === 'customer') {
      li.innerHTML = `
        <div class="action-title">${item}</div>
      `;
    } else {
      const checked = state.playbookState[id];
      li.innerHTML = `
        <label class="action-check">
          <input type="checkbox" data-playbook-id="${id}" ${checked ? 'checked' : ''} />
          <span class="action-title">${item}</span>
        </label>
      `;
    }
    list.appendChild(li);
  });

  if (audience !== 'customer') {
    list.querySelectorAll('[data-playbook-id]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const id = event.target.dataset.playbookId;
        state.playbookState[id] = event.target.checked;
        saveStorage(STORAGE_KEYS.playbooks, state.playbookState);
      });
    });
  }
};

const renderPlaybookList = (list, items) => {
  renderSimpleEventList(list, items || [], {
    message: 'No items defined yet.',
    link: { href: '#health-risk', label: 'Update playbook' }
  });
};

const renderPlaybookSummary = (list, playbook, label) => {
  if (!list) return;
  const summaryItems = [
    ...(playbook.week1 || []).slice(0, 2),
    ...(playbook.week2 || []).slice(0, 1),
    ...(playbook.ongoing || []).slice(0, 1)
  ].filter(Boolean);
  renderSimpleEventList(list, summaryItems.length ? summaryItems : [], {
    message: `No ${label} response actions currently required.`
  });
};

const renderResponsePlaybooks = (playbooks, state, audience) => {
  if (!playbooks) return;
  const yellow = playbooks.yellow || {};
  const red = playbooks.red || {};
  renderPlaybookChecklist(document.querySelector('[data-playbook="yellow-week1"]'), yellow.week1 || [], state, 'yellow-week1', audience);
  renderPlaybookChecklist(document.querySelector('[data-playbook="yellow-week2"]'), yellow.week2 || [], state, 'yellow-week2', audience);
  renderPlaybookChecklist(document.querySelector('[data-playbook="yellow-ongoing"]'), yellow.ongoing || [], state, 'yellow-ongoing', audience);
  renderPlaybookList(document.querySelector('[data-playbook="yellow-escalation"]'), yellow.escalation_triggers || []);
  renderPlaybookList(document.querySelector('[data-playbook="yellow-success"]'), yellow.success_criteria || []);
  renderPlaybookChecklist(document.querySelector('[data-playbook="red-week1"]'), red.week1 || [], state, 'red-week1', audience);
  renderPlaybookChecklist(document.querySelector('[data-playbook="red-week2"]'), red.week2 || [], state, 'red-week2', audience);
  renderPlaybookChecklist(document.querySelector('[data-playbook="red-ongoing"]'), red.ongoing || [], state, 'red-ongoing', audience);
  renderPlaybookList(document.querySelector('[data-playbook="red-escalation"]'), red.escalation_triggers || []);
  renderPlaybookList(document.querySelector('[data-playbook="red-success"]'), red.success_criteria || []);

  renderPlaybookSummary(document.querySelector('[data-playbook-summary="yellow"]'), yellow, 'yellow');
  renderPlaybookSummary(document.querySelector('[data-playbook-summary="red"]'), red, 'red');
};

const renderNextActions = (list, actions, actionState, onToggle, audience = 'internal') => {
  if (!list) return;
  list.innerHTML = '';
  if (!actions || actions.length === 0) {
    setEmptyFlag(list, true);
    list.innerHTML = '<p class="empty-text">No actions generated yet. Update data to generate recommendations.</p>';
    return;
  }
  setEmptyFlag(list, false);

  const grouped = {
    urgent: actions.filter((action) => action.urgency === 'urgent'),
    important: actions.filter((action) => action.urgency === 'important'),
    opportunity: actions.filter((action) => action.urgency === 'opportunity')
  };
  const groupLabels = {
    urgent: 'Urgent (this week)',
    important: 'Important (next two weeks)',
    opportunity: 'Opportunity'
  };

  Object.keys(grouped).forEach((priority) => {
    const items = grouped[priority];
    if (!items.length) return;
    const group = document.createElement('div');
    group.className = 'action-group';
    group.innerHTML = `<div class="action-group-title">${groupLabels[priority]}</div>`;

    const listEl = document.createElement('ul');
    listEl.className = 'action-list';
    items.forEach((action) => {
      const li = document.createElement('li');
      li.className = 'action-task';
      const checked = actionState[action.id];
      const ownerLabel = audience === 'customer' ? 'GitLab team' : action.owner;
      li.innerHTML = `
        <label class="action-check">
          ${
            audience === 'customer'
              ? ''
              : `<input type="checkbox" data-action-id="${action.id}" ${checked ? 'checked' : ''} />`
          }
          <span class="action-title">${action.title}</span>
        </label>
        <div class="action-meta">Why: ${action.rationale || action.why}</div>
        <div class="action-meta">Owner: ${ownerLabel} | Due ${action.due_date}</div>
        ${
          action.steps && action.steps.length
            ? `<ul class="mini-list">${action.steps.map((step) => `<li class="mini-item">${step}</li>`).join('')}</ul>`
            : ''
        }
        ${action.link ? `<a class="inline-link" href="${action.link}" target="_blank" rel="noopener">Playbook</a>` : ''}
      `;
      listEl.appendChild(li);
    });
    group.appendChild(listEl);
    list.appendChild(group);
  });

  if (audience !== 'customer') {
    list.querySelectorAll('[data-action-id]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const id = event.target.dataset.actionId;
        onToggle(id, event.target.checked);
      });
    });
  }
};

const renderTemplates = (templates) => {
  document.querySelectorAll('[data-template]').forEach((el) => {
    const key = el.dataset.template;
    el.textContent = templates[key] || '';
  });
};

const initTemplateCopy = () => {
  document.querySelectorAll('[data-copy-template]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', async () => {
      const key = btn.dataset.copyTemplate;
      const templateEl = document.querySelector(`[data-template="${key}"]`);
      await copyToClipboard(templateEl?.textContent || '');
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

  select.onchange = renderPhase;
  renderPhase();
};

const initCollabModal = (getTemplates) => {
  const select = document.querySelector('[data-collab-template]');
  const textarea = document.querySelector('[data-collab-body]');
  if (!select || !textarea) return;
  const options = [
    { key: 'collab_agenda', label: 'Agenda' },
    { key: 'collab_action_items', label: 'Action items' },
    { key: 'collab_escalation', label: 'Escalation' },
    { key: 'collab_success_report', label: 'Success report' }
  ];
  if (!select.dataset.optionsLoaded) {
    select.innerHTML = '';
    options.forEach((option) => {
      const el = document.createElement('option');
      el.value = option.key;
      el.textContent = option.label;
      select.appendChild(el);
    });
    select.dataset.optionsLoaded = 'true';
  }
  const updateBody = () => {
    const templates = typeof getTemplates === 'function' ? getTemplates() : getTemplates;
    textarea.value = templates[select.value] || '';
  };
  select.onchange = updateBody;
  updateBody();
};

const initAccountSwitcher = (accounts, selectedId, onChange) => {
  const select = document.querySelector('[data-account-switcher]');
  if (!Array.isArray(accounts) || !accounts.length) return accounts?.[0]?.account_id || null;
  const sorted = [...accounts].sort((a, b) => (a.account_name || '').localeCompare(b.account_name || ''));
  const validSelected = sorted.some((account) => account.account_id === selectedId);
  const initial = validSelected ? selectedId : sorted[0].account_id;

  if (!select) {
    return initial;
  }

  select.innerHTML = '';
  sorted.forEach((account) => {
    const option = document.createElement('option');
    option.value = account.account_id;
    option.textContent = account.account_name;
    select.appendChild(option);
  });
  select.value = initial;

  if (!select.dataset.bound) {
    select.dataset.bound = 'true';
    select.addEventListener('change', (event) => {
      onChange(event.target.value);
    });
  }

  return initial;
};

const initResourceControls = (state, refresh) => {
  const input = document.querySelector('[data-resource-search]');
  const categoryContainer = document.querySelector('[data-resource-categories]');
  if (input && !input.dataset.bound) {
    input.dataset.bound = 'true';
    input.addEventListener('input', (event) => {
      state.resourceQuery = event.target.value;
      refresh();
    });
  }
  if (categoryContainer && !categoryContainer.dataset.bound) {
    categoryContainer.dataset.bound = 'true';
    categoryContainer.addEventListener('click', (event) => {
      const button = event.target.closest('[data-resource-category]');
      if (!button) return;
      state.resourceCategory = button.dataset.resourceCategory;
      refresh();
    });
  }
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

const updateSectionBadges = (metrics) => {
  document.querySelectorAll('[data-section]').forEach((section) => {
    const metric = metrics[section.id];
    const badge = section.querySelector('[data-section-status]');
    if (!metric || !badge) return;
    badge.textContent = statusLabel(metric.status);
    badge.dataset.status = metric.status;
  });
};

const updateProgressSidebar = (metrics) => {
  const overall = [];
  document.querySelectorAll('[data-progress-item]').forEach((item) => {
    const metric = metrics[item.dataset.sectionId];
    if (!metric) return;
    const valueEl = item.querySelector('[data-progress-value]');
    const statusEl = item.querySelector('[data-progress-status]');
    if (valueEl) valueEl.textContent = metric.value;
    if (statusEl) statusEl.dataset.status = metric.status;
    overall.push(metric.progress);
  });
  const avg = overall.length ? overall.reduce((sum, value) => sum + value, 0) / overall.length : 0;
  const fill = document.querySelector('[data-overall-progress]');
  const label = document.querySelector('[data-overall-progress-label]');
  const track = document.querySelector('.progress-track');
  if (fill) {
    fill.style.setProperty('--value', avg);
  }
  if (label) {
    label.textContent = `${Math.round(avg * 100)}%`;
  }
  if (track) {
    track.setAttribute('aria-valuenow', Math.round(avg * 100).toString());
  }
};

const applySectionState = (section, collapsed) => {
  section.classList.toggle('is-collapsed', collapsed);
  const btn = section.querySelector('[data-section-toggle]');
  const body = section.querySelector('[data-section-body]');
  if (body) {
    body.setAttribute('aria-hidden', collapsed.toString());
  }
  if (btn) {
    btn.textContent = collapsed ? 'Expand section' : 'Collapse section';
    btn.setAttribute('aria-expanded', (!collapsed).toString());
  }
};

const initSectionControls = (metrics) => {
  const storedState = loadStorage(STORAGE_KEYS.sections, {});
  const sections = [...document.querySelectorAll('.section[data-section]')];
  const defaults = {};
  sections.forEach((section) => {
    const metric = metrics[section.id];
    if (storedState[section.id] !== undefined) return;
    if (section.id === 'overview-summary') {
      defaults[section.id] = false;
      return;
    }
    if (metric && metric.progress >= 0.95 && metric.status === 'good') {
      defaults[section.id] = true;
      return;
    }
    defaults[section.id] = metric ? metric.status === 'good' && metric.progress >= 0.8 : false;
  });
  const mergedState = { ...defaults, ...storedState };

  sections.forEach((section) => {
    applySectionState(section, mergedState[section.id]);
  });

  const persist = () => saveStorage(STORAGE_KEYS.sections, mergedState);

  sections.forEach((section) => {
    const btn = section.querySelector('[data-section-toggle]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      mergedState[section.id] = !mergedState[section.id];
      applySectionState(section, mergedState[section.id]);
      persist();
    });
  });

  document.querySelectorAll('[data-sections-expand]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sections.forEach((section) => {
        mergedState[section.id] = false;
        applySectionState(section, false);
      });
      persist();
    });
  });

  document.querySelectorAll('[data-sections-collapse]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sections.forEach((section) => {
        mergedState[section.id] = true;
        applySectionState(section, true);
      });
      persist();
    });
  });
};

const initSidebar = () => {
  const html = document.documentElement;
  const stored = loadStorage(STORAGE_KEYS.sidebar, 'show');
  const applyState = (value) => {
    html.dataset.sidebarHidden = value === 'hide';
  };
  applyState(stored);
  document.querySelectorAll('[data-sidebar-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = html.dataset.sidebarHidden === 'true' ? 'show' : 'hide';
      applyState(next);
      saveStorage(STORAGE_KEYS.sidebar, next);
      const select = document.querySelector('[data-setting-sidebar]');
      if (select) select.value = next;
    });
  });
  const select = document.querySelector('[data-setting-sidebar]');
  if (select) {
    select.value = stored;
    select.addEventListener('change', (event) => {
      applyState(event.target.value);
      saveStorage(STORAGE_KEYS.sidebar, event.target.value);
    });
  }
};

const initFab = () => {
  const fab = document.querySelector('[data-fab]');
  const toggle = document.querySelector('[data-fab-toggle]');
  if (!fab || !toggle) return;
  const stored = loadStorage(STORAGE_KEYS.fab, false);
  const setOpen = (open) => {
    fab.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open.toString());
    const menu = document.querySelector('[data-fab-menu]');
    if (menu) menu.setAttribute('aria-hidden', (!open).toString());
    saveStorage(STORAGE_KEYS.fab, open);
  };
  setOpen(Boolean(stored));
  toggle.addEventListener('click', () => setOpen(!fab.classList.contains('is-open')));
  document.addEventListener('click', (event) => {
    if (!fab.classList.contains('is-open')) return;
    if (fab.contains(event.target)) return;
    setOpen(false);
  });
};

const initBackToTop = () => {
  const btn = document.querySelector('[data-back-to-top]');
  if (!btn) return;
  const toggle = () => {
    btn.classList.toggle('is-visible', window.scrollY > 400);
  };
  toggle();
  window.addEventListener('scroll', toggle);
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
};

const initMobileNav = () => {
  const nav = document.querySelector('[data-mobile-nav]');
  const openBtn = document.querySelector('[data-open-nav]');
  if (!nav || !openBtn) return;
  const closeButtons = nav.querySelectorAll('[data-close-nav]');
  const links = nav.querySelectorAll('[data-mobile-link]');

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    nav.setAttribute('aria-hidden', (!open).toString());
    document.body.classList.toggle('nav-open', open);
  };

  openBtn.addEventListener('click', () => setOpen(true));
  closeButtons.forEach((btn) => btn.addEventListener('click', () => setOpen(false)));
  links.forEach((link) => link.addEventListener('click', () => setOpen(false)));
  nav.querySelector('.mobile-nav-backdrop')?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
    }
  });
};

const initSettings = () => {
  const settingsModal = document.getElementById('settings-modal');
  if (!settingsModal) return;
  document.querySelectorAll('[data-open-settings]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof settingsModal.showModal === 'function') {
        settingsModal.showModal();
      } else {
        settingsModal.setAttribute('open', '');
      }
    });
  });
  settingsModal.querySelector('[data-reset-preferences]')?.addEventListener('click', () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  });
  settingsModal.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (typeof settingsModal.close === 'function') {
        settingsModal.close();
      } else {
        settingsModal.removeAttribute('open');
      }
    });
  });
};

const initBreadcrumbs = () => {
  const sectionEl = document.querySelector('[data-breadcrumb-section]');
  const subEl = document.querySelector('[data-breadcrumb-subsection]');
  const subSep = document.querySelector('.crumb-sub-sep');
  const state = { sectionId: null };

  const setSection = (label, id) => {
    if (sectionEl) sectionEl.textContent = label || 'Overview';
    state.sectionId = id;
    setSubsection('');
  };

  const setSubsection = (label) => {
    if (!subEl || !subSep) return;
    if (!label) {
      subEl.textContent = '';
      subEl.style.display = 'none';
      subSep.style.display = 'none';
      return;
    }
    subEl.textContent = label;
    subEl.style.display = 'inline';
    subSep.style.display = 'inline';
  };

  return { setSection, setSubsection, getSectionId: () => state.sectionId };
};

const initDetailBreadcrumbs = (breadcrumbs) => {
  document.querySelectorAll('details').forEach((detail) => {
    detail.addEventListener('toggle', () => {
      const section = detail.closest('[data-section]');
      if (!section || section.id !== breadcrumbs.getSectionId()) return;
      if (detail.open) {
        breadcrumbs.setSubsection(detail.querySelector('summary')?.textContent?.trim() || '');
        return;
      }
      const openDetail = section.querySelector('details[open]');
      breadcrumbs.setSubsection(openDetail?.querySelector('summary')?.textContent?.trim() || '');
    });
  });
};

const initModeSwitch = () => {
  const buttons = [...document.querySelectorAll('[data-mode]')];
  const hint = document.querySelector('[data-mode-hint]');
  const modeCopy = {
    all: 'Showing all sections.',
    exec: 'Executive focus: outcomes and risks.',
    devops: 'DevOps focus: adoption and enablement.',
    csm: 'CSM focus: health drivers and cadence.'
  };
  const setMode = (mode, persist = true) => {
    document.documentElement.dataset.mode = mode;
    buttons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.mode === mode));
    if (hint) {
      hint.textContent = modeCopy[mode] || modeCopy.all;
    }
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

const initGuidedModeSwitch = () => {
  const buttons = [...document.querySelectorAll('[data-guided-mode]')];
  const hint = document.querySelector('[data-guided-hint]');
  const sections = [...document.querySelectorAll('.section[data-section]')];
  const navLinks = [...document.querySelectorAll('[data-nav-link]')];
  const progressItems = [...document.querySelectorAll('[data-progress-item]')];

  const visibilityMap = {
    today: new Set(['overview-summary', 'health-risk', 'engagement']),
    review: new Set(['overview-summary', 'outcomes', 'engagement', 'health-risk']),
    deep: null
  };
  const copy = {
    today: 'Today mode: immediate due actions and triage.',
    review: 'Review mode: EBR/QBR outcomes, risks, and narrative.',
    deep: 'Deep Dive: full dashboard with all sections.'
  };

  const applyVisibility = (mode) => {
    const allowed = visibilityMap[mode];
    sections.forEach((section) => {
      const visible = !allowed || allowed.has(section.id);
      section.hidden = !visible;
    });

    navLinks.forEach((link) => {
      const sectionId = link.getAttribute('href')?.replace('#', '');
      if (!sectionId || sectionId === 'overview') {
        link.classList.remove('is-hidden');
        return;
      }
      const visible = !allowed || allowed.has(sectionId);
      link.classList.toggle('is-hidden', !visible);
    });

    progressItems.forEach((item) => {
      const sectionId = item.dataset.sectionId;
      if (!sectionId || sectionId === 'overview') {
        item.classList.remove('is-hidden');
        return;
      }
      const visible = !allowed || allowed.has(sectionId);
      item.classList.toggle('is-hidden', !visible);
    });
  };

  const setGuidedMode = (mode, persist = true) => {
    document.documentElement.dataset.guidedMode = mode;
    buttons.forEach((button) => button.classList.toggle('is-active', button.dataset.guidedMode === mode));
    if (hint) {
      hint.textContent = copy[mode] || copy.today;
    }
    applyVisibility(mode);
    if (persist) {
      saveStorage(STORAGE_KEYS.guided, mode);
    }
  };

  const params = new URLSearchParams(window.location.search);
  const paramMode = params.get('guided');
  const storedMode = loadStorage(STORAGE_KEYS.guided, 'today');
  const initial = ['today', 'review', 'deep'].includes(paramMode) ? paramMode : storedMode;
  setGuidedMode(['today', 'review', 'deep'].includes(initial) ? initial : 'today', false);

  buttons.forEach((button) => {
    button.addEventListener('click', () => setGuidedMode(button.dataset.guidedMode));
  });

  return () => document.documentElement.dataset.guidedMode || 'today';
};

const initAudienceSwitch = () => {
  const buttons = [...document.querySelectorAll('[data-audience-toggle]')];
  const setAudience = (audience, persist = true) => {
    document.documentElement.dataset.audience = audience;
    buttons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.audienceToggle === audience));
    if (persist) {
      saveStorage(STORAGE_KEYS.audience, audience);
    }
  };
  const params = new URLSearchParams(window.location.search);
  const paramAudience = params.get('audience');
  const storedAudience = loadStorage(STORAGE_KEYS.audience, 'internal');
  const initialAudience = ['customer', 'internal'].includes(paramAudience) ? paramAudience : storedAudience;
  setAudience(initialAudience, false);

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => setAudience(btn.dataset.audienceToggle));
  });

  return () => document.documentElement.dataset.audience || 'internal';
};

const initNavSpy = (breadcrumbs) => {
  const links = [...document.querySelectorAll('[data-nav-link]')];
  const progressItems = [...document.querySelectorAll('[data-progress-item]')];
  const sections = [...document.querySelectorAll('[data-section]')];
  const linkMap = new Map(links.map((link) => [link.getAttribute('href')?.replace('#', ''), link]));

  let activeId = null;
  const setActive = (section) => {
    if (!section) return;
    const alias = section.dataset.sectionAlias;
    const targetId = linkMap.has(section.id) ? section.id : alias || section.id;
    if (activeId === targetId) return;
    activeId = targetId;
    links.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${targetId}`;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    progressItems.forEach((item) => item.classList.toggle('is-active', item.dataset.sectionId === targetId));

    const label = section.dataset.sectionLabel || section.querySelector('h2')?.textContent || 'Overview';
    if (breadcrumbs) {
      breadcrumbs.setSection(label, targetId);
      const openDetail = section.querySelector('details[open]');
      breadcrumbs.setSubsection(openDetail?.querySelector('summary')?.textContent?.trim() || '');
    }
    saveStorage(STORAGE_KEYS.lastSection, targetId);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(entry.target);
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
      const label = section.dataset.sectionLabel || heading.textContent.trim();
      const targetId = section.dataset.sectionAlias || section.id;
      items.push({
        label,
        meta: 'Section',
        breadcrumb: `Dashboard / ${label}`,
        type: 'section',
        target: `#${targetId}`
      });
    });

    (currentView.lists.workshops || []).forEach((workshop) => {
      items.push({
        label: workshop.title,
        meta: 'Workshop',
        breadcrumb: 'Dashboard / Engagement & Enablement',
        type: 'link',
        target: workshop.link
      });
    });

    (currentView.lists.useCaseCards || []).forEach((useCase) => {
      items.push({
        label: useCase.name,
        meta: 'Use case score',
        breadcrumb: 'Dashboard / Adoption',
        type: 'section',
        target: '#adoption'
      });
    });

    const doraMetrics = currentView.lists.dora?.metrics || {};
    Object.keys(doraMetrics).forEach((key) => {
      items.push({
        label: doraMetrics[key].label,
        meta: 'DORA metric',
        breadcrumb: 'Dashboard / Outcomes',
        type: 'section',
        target: '#outcomes'
      });
    });

    [
      { label: 'Health score', target: '#overview-summary', breadcrumb: 'Dashboard / Overview' },
      { label: 'Platform adoption', target: '#adoption', breadcrumb: 'Dashboard / Adoption' },
      { label: 'License utilization', target: '#overview-summary', breadcrumb: 'Dashboard / Overview' },
      { label: 'Digital health score', target: '#engagement', breadcrumb: 'Dashboard / Engagement' }
    ].forEach((metric) => {
      items.push({
        label: metric.label,
        meta: 'Metric',
        breadcrumb: metric.breadcrumb,
        type: 'section',
        target: metric.target
      });
    });

    (currentView.lists.nextActions || []).forEach((action) => {
      items.push({
        label: action.title,
        meta: 'Next action',
        breadcrumb: 'Dashboard / Overview',
        type: 'section',
        target: '#next-actions'
      });
    });

    (currentView.lists.onboardingTasks || []).forEach((task) => {
      items.push({
        label: task.task,
        meta: 'Onboarding task',
        breadcrumb: 'Dashboard / Journey',
        type: 'section',
        target: '#journey'
      });
    });

    (currentView.lists.risks || []).forEach((risk) => {
      items.push({
        label: risk.driver,
        meta: 'Risk',
        breadcrumb: 'Dashboard / Health & Risk',
        type: 'section',
        target: '#health-risk'
      });
    });

    (currentView.handbook?.checks || []).forEach((check) => {
      items.push({
        label: check.name,
        meta: 'Compliance check',
        breadcrumb: 'Dashboard / AMER Handbook Compliance',
        type: 'section',
        target: check.anchor || '#handbook-compliance'
      });
    });

    (currentView.lists.orientationDueItems || []).forEach((item) => {
      items.push({
        label: item.title,
        meta: 'Due item',
        breadcrumb: 'Dashboard / Orientation',
        type: 'section',
        target: item.link || '#orientation-strip'
      });
    });

    [
      { label: 'cadence breach', target: '#cadence-tracker' },
      { label: 'success plan validation', target: '#success-plan' },
      { label: 'EBR checklist', target: '#ebr-prep' },
      { label: 'escalation cadence', target: '#health-updates' },
      { label: 'workshop plan', target: '#workshop-plan' },
      { label: 'triage state', target: '#cadence-tracker' }
    ].forEach((item) => {
      items.push({
        label: item.label,
        meta: 'Shortcut',
        breadcrumb: 'Dashboard / Quick jump',
        type: 'section',
        target: item.target
      });
    });

    const resources = currentView.lists.resources || {};
    Object.keys(resources).forEach((group) => {
      resources[group].forEach((resource) => {
        items.push({
          label: resource.title,
          meta: 'Resource',
          breadcrumb: 'Dashboard / Resources',
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
        breadcrumb: 'Dashboard / Engagement & Enablement',
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
        <span class="palette-label">${highlightMatch(item.label, input.value.trim())}</span>
        <span class="palette-meta">${item.meta}</span>
        ${item.breadcrumb ? `<span class="palette-crumb">${item.breadcrumb}</span>` : ''}
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
      const target = document.querySelector(item.target);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('section-flash');
        setTimeout(() => target.classList.remove('section-flash'), 1400);
      } else {
        window.location.hash = item.target;
      }
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

const initQuickActions = (getMode, getGuidedMode, getSection, getView, getAudience) => {
  document.querySelectorAll('[data-share-link]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', getMode());
      if (getGuidedMode) {
        url.searchParams.set('guided', getGuidedMode());
      }
      if (getAudience) {
        url.searchParams.set('audience', getAudience());
      }
      const section = getSection();
      if (section) {
        url.hash = `#${section}`;
      }
      await copyToClipboard(url.toString());
      flashButton(btn, 'Copied');
    });
  });

  document.querySelectorAll('[data-schedule-meeting]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const collabModal = document.getElementById('collab-modal');
      if (collabModal) {
        const select = collabModal.querySelector('[data-collab-template]');
        if (select) {
          select.value = 'collab_agenda';
          select.dispatchEvent(new Event('change'));
        }
        if (typeof collabModal.showModal === 'function') {
          collabModal.showModal();
        } else {
          collabModal.setAttribute('open', '');
        }
        return;
      }
      const view = getView();
      if (view?.collaboration_project?.url) {
        window.open(view.collaboration_project.url, '_blank', 'noopener');
      }
    });
  });
};

const restoreScrollPosition = () => {
  if (window.location.hash) return;
  const lastSection = loadStorage(STORAGE_KEYS.lastSection, null);
  if (!lastSection) return;
  const target =
    document.getElementById(lastSection) || document.querySelector(`[data-section-alias="${lastSection}"]`);
  if (target) {
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }
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
        form.elements.product_score.value = state.view.health.product_score;
        form.elements.risk_score.value = state.view.health.risk_score;
        form.elements.outcomes_score.value = state.view.health.outcomes_score;
        form.elements.voice_score.value = state.view.health.voice_score;
        form.elements.engagement_score.value = state.view.health.engagement_score;
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
    const accountId = state.selectedAccountId;
    const accountOverrides = state.overridesByAccount[accountId] || {};
    accountOverrides.health = {
      product_score: Number(form.elements.product_score.value),
      risk_score: Number(form.elements.risk_score.value),
      outcomes_score: Number(form.elements.outcomes_score.value),
      voice_score: Number(form.elements.voice_score.value),
      engagement_score: Number(form.elements.engagement_score.value)
    };
    state.overridesByAccount[accountId] = accountOverrides;
    saveStorage(STORAGE_KEYS.overrides, state.overridesByAccount);
    closeDialog(healthModal);
    refresh();
  });

  touchpointModal?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const accountId = state.selectedAccountId;
    const accountOverrides = state.overridesByAccount[accountId] || {};
    const entry = {
      date: form.elements.date.value,
      title: `${form.elements.channel.value} touchpoint`,
      detail: form.elements.summary.value
    };
    accountOverrides.touchpoints_log = [...(accountOverrides.touchpoints_log || []), entry];
    state.overridesByAccount[accountId] = accountOverrides;
    saveStorage(STORAGE_KEYS.overrides, state.overridesByAccount);
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

const buildCsv = (view) => {
  const rows = [
    ['Metric', 'Value'],
    ['Health score', view.health.overall_score],
    ['Health band', view.health.band_label],
    ['Platform adoption', view.adoption.platform_adoption_summary],
    ['License utilization', view.seats.utilization_pct],
    ['Renewal countdown', view.customer.renewal_countdown],
    ['Digital health score', view.touchpoints.digital_health_score],
    ['Next EBR', view.engagement.next_ebr_date]
  ];
  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(escape).join(',')).join('\n');
};

const initExport = (getView) => {
  document.querySelectorAll('[data-export-ebr]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = new URL('print/ebr.html', window.location.href);
      window.open(url.toString(), '_blank', 'noopener');
    });
  });

  document.querySelectorAll('[data-export-csv]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = getView();
      if (!view) return;
      const csv = buildCsv(view);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gitlab-health-dashboard.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  });
};

const render = (view, state) => {
  applyBindings(view);
  renderComplianceStrip(
    document.querySelector('[data-list="handbook-compliance"]'),
    document.querySelector('[data-list="compliance-alerts"]'),
    document.querySelector('[data-handbook-overall]'),
    view.handbook,
    document.querySelector('[data-handbook-passed]'),
    document.querySelector('[data-handbook-failing]')
  );
  renderPortfolioRollup(state.portfolio, state.selectedAccountId);
  updateHealthStatus(view);
  updateFreshnessBadges(view);
  updateRenewalBadges(view);
  updateProgressBars(view);
  updateRing(view);
  updateTimeline(view);
  const sectionMetrics = computeSectionMetrics(view);
  updateSectionBadges(sectionMetrics);
  updateProgressSidebar(sectionMetrics);
  if (!state.sectionControlsReady) {
    initSectionControls(sectionMetrics);
    state.sectionControlsReady = true;
  }

  renderSeatTrend(document.querySelector('[data-list="seat-trend"]'), view.lists.seatTrend);
  renderOrientationDueItems(document.querySelector('[data-list="orientation-due-items"]'), view.lists.orientationDueItems);
  renderRenewalChecklist(document.querySelector('[data-list="renewal-checklist"]'), view.lists.renewalChecklist);
  renderActivityFeed(document.querySelector('[data-list="activity-feed"]'), view.lists.activityFeed);
  renderFreshnessList(document.querySelector('[data-list="data-freshness"]'), view.lists.freshness);
  renderTaskList(document.querySelector('[data-list="onboarding-tasks"]'), view.lists.onboardingTasks);
  renderSimpleEventList(document.querySelector('[data-list="onboarding-risks"]'), view.lists.onboardingRisks);
  renderUsecaseSummary(document.querySelector('[data-list="usecase-summary"]'), view.lists.useCaseSummary);
  renderUsecaseCards(document.querySelector('[data-usecase-cards]'), view.lists.useCaseCards);
  renderHealthList(document.querySelector('[data-list="early-warnings"]'), view.lists.earlyWarnings, view.audience);
  renderRiskRegister(document.querySelector('[data-list="risk-register"]'), view.lists.risks);
  renderHealthDrivers(document.querySelector('[data-list="health-drivers"]'), view.lists.healthDrivers);
  renderResponsePlaybooks(view.lists.responsePlaybooks, state, view.audience);
  renderResourceList(document.querySelector('[data-list="risk-playbooks-red"]'), view.lists.riskPlaybooks.red || []);
  renderResourceList(document.querySelector('[data-list="risk-playbooks-yellow"]'), view.lists.riskPlaybooks.yellow || []);
  renderSuccessPlan(document.querySelector('[data-list="success-plan"]'), view.lists.successPlan, view.audience);
  renderDoraCards(document.querySelector('[data-list="dora-cards"]'), view.lists.dora, view.lists.successPlan);
  renderVsaMetrics(document.querySelector('[data-list="vsa-metrics"]'), view.lists.vsa);
  renderRecommendations(document.querySelector('[data-list="vsa-recommendations"]'), view.lists.vsa.recommendations || []);
  renderValuePoints(document.querySelector('[data-list="value-points"]'), view.lists.valuePoints);
  renderDigitalBreakdown(document.querySelector('[data-list="digital-breakdown"]'), view.lists.digitalBreakdown);
  renderCadenceCalendar(document.querySelector('[data-list="cadence-calendar"]'), view.lists.cadenceCalendar);
  renderTriageRecoveryChecklist(document.querySelector('[data-list="triage-recovery-checklist"]'), view.cadence);
  renderWorkshopOutcomes(document.querySelector('[data-list="workshop-outcomes"]'), view.lists.workshopOutcomes);
  renderEbrDates(document.querySelector('[data-list="ebr-dates"]'), view.lists.ebrDates);
  renderEbrPrepChecklist(document.querySelector('[data-list="ebr-prep-checklist"]'), view.lists.ebrPrepChecklist);
  renderWorkshops(document.querySelector('[data-list="workshops"]'), view.lists.workshops);
  renderCollaborationMetrics(document.querySelector('[data-list="collaboration-metrics"]'), view.lists.collaboration);
  renderRenewalReadiness(document.querySelector('[data-list="renewal-readiness"]'), view.lists.renewalReadiness);
  renderSimpleEventList(document.querySelector('[data-list="growth-plan-objectives"]'), view.lists.growthObjectives, {
    message: 'No growth objectives defined.'
  });
  renderSimpleEventList(document.querySelector('[data-list="growth-plan-hypotheses"]'), view.lists.growthHypotheses, {
    message: 'No expansion hypotheses defined.'
  });
  renderSimpleEventList(document.querySelector('[data-list="growth-plan-plays"]'), view.lists.growthPlays, {
    message: 'No active plays defined.'
  });
  renderSimpleEventList(document.querySelector('[data-list="growth-plan-owners"]'), view.lists.growthOwners, {
    message: 'No owners assigned.'
  });
  renderResourceRegistry(view, state);

  renderTemplates(view.templates);
  applyOperationalStatuses(view);

  renderNextActions(
    document.querySelector('[data-list="next-best-actions"]'),
    view.lists.nextActions,
    state.actionState,
    (id, checked) => {
      state.actionState[id] = checked;
      if (typeof state.persistActionState === 'function') {
        state.persistActionState();
      } else {
        saveStorage(STORAGE_KEYS.actions, state.actionState);
      }
    },
    view.audience
  );

  const copyActionsBtn = document.querySelector('[data-copy-actions]');
  if (copyActionsBtn && !copyActionsBtn.dataset.bound) {
    copyActionsBtn.dataset.bound = 'true';
    copyActionsBtn.addEventListener('click', async () => {
      const summary = buildActionsSummary(view.lists.nextActions || []);
      await copyToClipboard(summary || 'No actions generated.');
      flashButton(copyActionsBtn, 'Copied');
    });
  }

  if (state.palette && state.palette.update) {
    state.palette.update(view);
  }

  if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && view.handbook) {
    const rows = view.handbook.checks.map((check) => ({
      check: check.name,
      status: check.statusLabel,
      reason: check.reason
    }));
    // Development-only rules verification trace.
    console.table(rows);
  }

  document.body.classList.add('loaded');
};

const init = async () => {
  const payload = await loadDashboardData();
  const accounts = payload.accounts || [];
  const resources = payload.resources || DEFAULT_RESOURCE_REGISTRY;
  const playbookState = loadStorage(STORAGE_KEYS.playbooks, {});
  const storedAccount = loadStorage(STORAGE_KEYS.account, null);
  const rawOverrides = loadStorage(STORAGE_KEYS.overrides, {});
  const rawActionState = loadStorage(STORAGE_KEYS.actions, {});

  const accountIds = accounts.map((account) => account.account_id);
  const normalizeMap = (value, fallbackAccountId) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const looksLikeAccountMap = Object.keys(value).some((key) => accountIds.includes(key));
    if (looksLikeAccountMap) return value;
    return fallbackAccountId ? { [fallbackAccountId]: value } : {};
  };

  const state = {
    accounts,
    resources,
    selectedAccountId: null,
    overridesByAccount: {},
    actionStateByAccount: {},
    playbookState,
    actionState: {},
    view: null,
    portfolio: null,
    palette: null,
    sectionControlsReady: false,
    resourceQuery: '',
    resourceCategory: 'all',
    persistActionState: null
  };

  syncPersonaAttributes();
  initSidebar();
  initMobileNav();
  initFab();
  initBackToTop();
  initSettings();

  const breadcrumbs = initBreadcrumbs();
  const getMode = initModeSwitch();
  const getGuidedMode = initGuidedModeSwitch();
  const getAudience = initAudienceSwitch();
  const getSection = initNavSpy(breadcrumbs);
  initDetailBreadcrumbs(breadcrumbs);
  initDetailsControls();
  initQuickActions(getMode, getGuidedMode, getSection, () => state.view, getAudience);
  initExport(() => state.view);

  state.selectedAccountId = initAccountSwitcher(accounts, storedAccount, (accountId) => {
    state.selectedAccountId = accountId;
    saveStorage(STORAGE_KEYS.account, accountId);
    refresh();
  });
  if (state.selectedAccountId) {
    saveStorage(STORAGE_KEYS.account, state.selectedAccountId);
  }

  state.overridesByAccount = normalizeMap(rawOverrides, state.selectedAccountId);
  state.actionStateByAccount = normalizeMap(rawActionState, state.selectedAccountId);

  const getSelectedAccount = () =>
    state.accounts.find((account) => account.account_id === state.selectedAccountId) || state.accounts[0];

  const refresh = () => {
    const account = getSelectedAccount();
    if (!account) return;
    state.selectedAccountId = account.account_id;
    state.portfolio = computePortfolioRollup(state.accounts, { now: new Date() });
    let normalizedAccount = account;
    if (window.DerivedMetrics && typeof window.DerivedMetrics.validateAccountData === 'function') {
      const validation = window.DerivedMetrics.validateAccountData(account);
      normalizedAccount = validation.normalized || account;
      if (!validation.valid && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.warn('Account data validation issues', account.account_id, validation.errors);
      }
    }
    const accountOverrides = state.overridesByAccount[state.selectedAccountId] || {};
    const accountActionState = state.actionStateByAccount[state.selectedAccountId] || {};
    state.actionStateByAccount[state.selectedAccountId] = accountActionState;
    state.actionState = accountActionState;
    state.persistActionState = () => saveStorage(STORAGE_KEYS.actions, state.actionStateByAccount);

    state.view = buildView(
      normalizedAccount,
      accountOverrides,
      accountActionState,
      getAudience(),
      state.resources
    );
    render(state.view, state);
    initLandingZone(state.view);
    initCollabModal(() => state.view?.templates || {});
  };

  initResourceControls(state, refresh);
  refresh();
  state.palette = initPalette(state.view);
  initTemplateCopy();
  initModals(state, refresh);
  restoreScrollPosition();
};

document.addEventListener('DOMContentLoaded', init);
