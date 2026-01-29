
const DEFAULT_DATA = {
  "meta": {
    "last_updated": "2025-10-08"
  },
  "customer": {
    "name": "Northwind Industries",
    "plan": "Ultimate",
    "csm": "Jordan Lee",
    "start_date": "2025-08-27"
  },
  "licenses": {
    "purchased": 500,
    "active": 40,
    "production": 480
  },
  "projects": {
    "total": 120,
    "ci_enabled": 30,
    "deploying": 4,
    "security_scans": 6
  },
  "teams": {
    "total": 30,
    "scm_adopted": 12
  },
  "usage": {
    "monthly_active_users": 34,
    "merge_requests_month": 120,
    "issues_month": 260,
    "billable_users": 320
  },
  "events": [
    {
      "name": "First login",
      "date": "2025-08-28"
    },
    {
      "name": "First project created",
      "date": "2025-09-05"
    },
    {
      "name": "First merge request",
      "date": "2025-09-18"
    },
    {
      "name": "First pipeline run",
      "date": "2025-10-02"
    },
    {
      "name": "First security scan",
      "date": "2025-10-05"
    },
    {
      "name": "First deployment",
      "date": "2025-10-06"
    }
  ],
  "onboarding": {
    "tasks": [
      {
        "name": "Kickoff and stakeholder alignment",
        "done": true,
        "date": "2025-08-29"
      },
      {
        "name": "GitLab instance deployed",
        "done": true,
        "date": "2025-09-10"
      },
      {
        "name": "SSO configured",
        "done": true,
        "date": "2025-09-12"
      },
      {
        "name": "Pilot teams onboarded",
        "done": true,
        "date": "2025-09-20"
      },
      {
        "name": "Repository migration",
        "done": true,
        "date": "2025-09-25"
      },
      {
        "name": "CI runners configured",
        "done": true,
        "date": "2025-09-28"
      },
      {
        "name": "First pipelines running",
        "done": true,
        "date": "2025-10-02"
      },
      {
        "name": "Security baseline defined",
        "done": true,
        "date": "2025-10-05"
      },
      {
        "name": "Training sessions complete",
        "done": false,
        "date": ""
      },
      {
        "name": "Success plan validated",
        "done": false,
        "date": ""
      }
    ]
  },
  "milestones": {
    "engagement": {
      "date": "2025-09-01"
    },
    "infra_ready": {
      "date": "2025-09-15"
    },
    "onboarding_complete": {
      "date": ""
    },
    "first_value": {
      "date": "",
      "expected_date": "2025-10-15"
    },
    "outcome": {
      "date": "",
      "expected_date": "2025-12-15"
    }
  },
  "cicd": {
    "pipelines_week": 38,
    "pipeline_success_rate": 0.72,
    "pipeline_duration_minutes": 18,
    "deployments_week": 4,
    "milestones": [
      {
        "name": "First pipeline created",
        "date": "2025-10-02",
        "status": "complete"
      },
      {
        "name": "Shared runners enabled",
        "date": "2025-09-28",
        "status": "complete"
      },
      {
        "name": "First production deployment",
        "date": "",
        "status": "pending"
      }
    ]
  },
  "targets": {
    "engage_days": 14,
    "onboard_days": 45,
    "first_value_days": 30
  },
  "use_case_scoring": {
    "platform_adoption_target_green": 3,
    "devops_score": 0.35,
    "gainsight_ranges": {
      "red": "0-50",
      "yellow": "51-75",
      "green": "76-100"
    },
    "use_cases": [
      {
        "id": "plan",
        "name": "Use Case Adoption: Plan",
        "stage": "Plan",
        "adoption_timeline": "1 month after license purchase",
        "rollup_rule": "single_metric",
        "summary_metric_index": 0,
        "green_criteria": "Track planning usage once service ping data is available.",
        "placeholder": true,
        "metrics": [
          {
            "name": "Planning feature utilization (issues/epics)",
            "value": null,
            "format": "number",
            "calc": "Issues + epics created L28D / Billable users",
            "threshold_text": "Not yet tracked in this snapshot",
            "thresholds": {}
          }
        ]
      },
      {
        "id": "scm",
        "name": "Use Case Adoption: Create (SCM)",
        "stage": "Create",
        "adoption_timeline": "1 month after license purchase",
        "rollup_rule": "single_metric",
        "summary_metric_index": 0,
        "green_criteria": "Green when more than 33% of billable users triggered Git operations in the last 28 days.",
        "metrics": [
          {
            "name": "Git operation utilization % (L28D)",
            "value": 0.28,
            "format": "percent",
            "calc": "Git Operations - Users L28D / Billable Users",
            "threshold_text": "Red <=10%, Yellow >10% and <=33%, Green >33%",
            "thresholds": {
              "red_max": 0.1,
              "yellow_max": 0.33,
              "green_inclusive": false
            }
          }
        ]
      },
      {
        "id": "ci",
        "name": "Use Case Adoption: Verify (CI)",
        "stage": "Verify",
        "adoption_timeline": "1 month after license purchase",
        "rollup_rule": "single_metric",
        "summary_metric_index": 0,
        "green_criteria": "Green when CI builds per billable user in the last 28 days is greater than 40.",
        "metrics": [
          {
            "name": "CI builds per billable user (L28D)",
            "value": 18,
            "format": "number",
            "calc": "CI Builds L28D / Billable Users",
            "threshold_text": "Red <=2, Yellow >2 and <=40, Green >40",
            "thresholds": {
              "red_max": 2,
              "yellow_max": 40,
              "green_inclusive": false
            }
          }
        ]
      },
      {
        "id": "security",
        "name": "Use Case Adoption: Secure (DevSecOps)",
        "stage": "Secure",
        "adoption_timeline": "1 month after license purchase",
        "rollup_rule": "two_green_one_yellow",
        "summary_metric_index": 0,
        "green_criteria": "Green when two of three measures are green and the remaining measure is yellow or green.",
        "metrics": [
          {
            "name": "Secure scanner utilization %",
            "value": 0.08,
            "format": "percent",
            "calc": "Secure Scanners - Users L28D / Billable Users",
            "threshold_text": "Red <=5%, Yellow >5% and <20%, Green >=20%",
            "thresholds": {
              "red_max": 0.05,
              "yellow_max": 0.2,
              "green_min": 0.2,
              "green_inclusive": true
            }
          },
          {
            "name": "Average scans per CI pipeline",
            "value": 0.22,
            "format": "number",
            "calc": "Total scans / CI internal pipelines L28D",
            "threshold_text": "Red <0.1, Yellow >=0.1 and <=0.5, Green >0.5",
            "thresholds": {
              "red_max": 0.1,
              "yellow_max": 0.5,
              "green_inclusive": false
            }
          },
          {
            "name": "Number of scanners in use",
            "value": 2,
            "format": "number",
            "calc": "Sum of scanners used (SAST, DAST, dependency, etc)",
            "threshold_text": "Red <=1, Yellow 2, Green >=3",
            "thresholds": {
              "red_max": 1,
              "yellow_max": 2,
              "green_min": 3,
              "green_inclusive": true
            }
          }
        ]
      },
      {
        "id": "cd",
        "name": "Use Case Adoption: Release (CD)",
        "stage": "Release",
        "adoption_timeline": "1 month after license purchase",
        "rollup_rule": "two_green_one_yellow",
        "summary_metric_index": 1,
        "green_criteria": "Green when two of three measures are green and the remaining measure is yellow or green.",
        "metrics": [
          {
            "name": "User deployments utilization %",
            "value": 0.06,
            "format": "percent",
            "calc": "Deployments - Users L28D / Billable Users",
            "threshold_text": "Red <5%, Yellow 5-12%, Green >12%",
            "thresholds": {
              "red_max": 0.05,
              "yellow_max": 0.12,
              "green_inclusive": false
            }
          },
          {
            "name": "Deployments per user (L28D)",
            "value": 1.8,
            "format": "number",
            "calc": "Deployments L28D / Billable Users",
            "threshold_text": "Red <2, Yellow 2-7, Green >7",
            "thresholds": {
              "red_max": 2,
              "yellow_max": 7,
              "green_inclusive": false
            }
          },
          {
            "name": "Successful deployments %",
            "value": 0.82,
            "format": "percent",
            "calc": "Successful deploys L28D / (Successful + Failed deploys L28D)",
            "threshold_text": "Red <25%, Yellow 25-80%, Green >80%",
            "thresholds": {
              "red_max": 0.25,
              "yellow_max": 0.8,
              "green_inclusive": false
            }
          }
        ]
      },
      {
        "id": "measure",
        "name": "Use Case Adoption: Measure",
        "stage": "Measure",
        "adoption_timeline": "1 month after license purchase",
        "rollup_rule": "single_metric",
        "summary_metric_index": 0,
        "green_criteria": "Track value stream analytics usage once enabled.",
        "placeholder": true,
        "metrics": [
          {
            "name": "Value stream analytics utilization",
            "value": null,
            "format": "number",
            "calc": "VSA views L28D / Billable users",
            "threshold_text": "Not yet tracked in this snapshot",
            "thresholds": {}
          }
        ]
      }
    ]
  },
  "success_plan": {
    "objectives": [
      {
        "objective": "Automate Tier-1 release workflows",
        "success_metric": "Tier-1 apps deploying via GitLab",
        "target": "10 of 12 apps by 2025-12-15",
        "status": "in_progress",
        "evidence": "",
        "owner": "DevOps Lead"
      },
      {
        "objective": "Expand CI adoption to 60% of projects",
        "success_metric": "Projects running pipelines",
        "target": "72 of 120 projects by 2025-11-30",
        "status": "in_progress",
        "evidence": "",
        "owner": "Platform Engineering"
      },
      {
        "objective": "Enable security scanning for regulated apps",
        "success_metric": "Regulated apps with SAST + dependency scanning",
        "target": "100% by 2025-11-15",
        "status": "at_risk",
        "evidence": "",
        "owner": "Security"
      }
    ]
  },
  "health": {
    "overall_status": "watch",
    "last_exec_review": "2025-09-30",
    "factors": [
      {
        "label": "License utilization",
        "status": "risk",
        "detail": "8% active vs 80% target"
      },
      {
        "label": "Use case adoption",
        "status": "watch",
        "detail": "0 of 4 use cases green"
      },
      {
        "label": "Leadership engagement",
        "status": "watch",
        "detail": "Last executive review 2025-09-30"
      },
      {
        "label": "Support activity",
        "status": "watch",
        "detail": "5 open high-priority tickets"
      },
      {
        "label": "Success plan progress",
        "status": "watch",
        "detail": "0 objectives completed"
      }
    ]
  },
  "dora": {
    "deploy_freq_per_day": 0.2,
    "lead_time_days": 7,
    "change_failure_pct": 12,
    "mttr_hours": 12
  },
  "outcomes": {
    "primary_goal": "Automate release workflow for Tier-1 apps",
    "primary_status": "In progress",
    "primary_progress": 0.35,
    "primary_note": "4 of 12 Tier-1 apps deploy via GitLab",
    "narrative": "CI coverage reached 25% of projects. Next focus is enabling security scans and expanding deployment automation to improve lead time and MTTR."
  },
  "learning": {
    "recommended": [
      {
        "title": "GitLab CI/CD fundamentals",
        "type": "Course",
        "detail": "Pipeline basics, runners, and best practices",
        "link": "https://learn.gitlab.com/"
      },
      {
        "title": "GitLab administration essentials",
        "type": "Course",
        "detail": "Instance management and security baselines",
        "link": "https://learn.gitlab.com/"
      }
    ],
    "webinars": [
      {
        "title": "Accelerating time to value with GitLab",
        "type": "Webinar",
        "detail": "Customer success and onboarding best practices",
        "link": "https://about.gitlab.com/resources/"
      },
      {
        "title": "DevOps metrics and DORA deep dive",
        "type": "Webinar",
        "detail": "How to interpret DORA metrics in GitLab",
        "link": "https://about.gitlab.com/resources/"
      }
    ],
    "templates": [
      {
        "title": "Onboarding issue board template",
        "detail": "Track setup tasks with a ready-made issue board",
        "link": "https://docs.gitlab.com/ee/user/project/issues/"
      },
      {
        "title": "Success plan template",
        "detail": "Capture outcomes, owners, and KPIs",
        "link": "https://handbook.gitlab.com/handbook/customer-success/csm/success-plans/"
      }
    ],
    "cadence": [
      {
        "title": "Leadership recurring check-ins",
        "detail": "Quarterly leadership check-ins with goals, adoption metrics, and next steps",
        "link": "https://handbook.gitlab.com/handbook/customer-success/csm/leadership-recurring-checkin/"
      },
      {
        "title": "Executive Business Review (EBR)",
        "detail": "Strategic review focused on outcomes, ROI, and roadmap alignment",
        "link": "https://handbook.gitlab.com/handbook/customer-success/csm/ebr/"
      }
    ],
    "playbooks": [
      {
        "title": "CI / Verify workshop",
        "detail": "Half-day enablement with project conversion and pipeline onboarding",
        "link": "https://handbook.gitlab.com/handbook/customer-success/playbooks/ci-verify/"
      },
      {
        "title": "Customer Success Playbooks catalog",
        "detail": "Index of playbooks for onboarding, adoption, and expansion",
        "link": "https://handbook.gitlab.com/handbook/customer-success/playbooks/"
      }
    ],
    "collaboration": [
      {
        "title": "Customer Collaboration Project",
        "detail": "Shared project for agenda issues, enablement planning, and transparency",
        "link": "https://handbook.gitlab.com/handbook/customer-success/csm/customer-collaboration-project/"
      },
      {
        "title": "Use this dashboard with the Collaboration Project",
        "detail": "Link dashboard insights to shared issues, agendas, and action items",
        "link": "https://handbook.gitlab.com/handbook/customer-success/csm/customer-collaboration-project/"
      }
    ],
    "reporting": [
      {
        "title": "Reporting and dashboarding framework",
        "detail": "Operationalize vs insights and recommendations",
        "link": "https://handbook.gitlab.com/handbook/customer-success/reporting-and-dashboarding-framework/"
      }
    ],
    "collaboration_templates": [
      {
        "title": "Onboarding checklist issue",
        "detail": "Track onboarding tasks and owners",
        "link": "https://handbook.gitlab.com/handbook/customer-success/csm/customer-collaboration-project/"
      },
      {
        "title": "Workshop follow-up issue",
        "detail": "Capture actions from enablement sessions",
        "link": "https://handbook.gitlab.com/handbook/customer-success/playbooks/"
      },
      {
        "title": "Risk tracking issue",
        "detail": "Document blockers and mitigation owners",
        "link": "https://handbook.gitlab.com/handbook/customer-success/csm/"
      },
      {
        "title": "Feature request intake",
        "detail": "Log and prioritize product feedback",
        "link": "https://handbook.gitlab.com/handbook/customer-success/csm/customer-collaboration-project/"
      }
    ],
    "operating_cadence": [
      {
        "title": "Monthly adoption review",
        "detail": "Review milestone status, adoption gaps, and enablement actions",
        "link": "#adoption"
      },
      {
        "title": "Quarterly executive review",
        "detail": "Share outcomes, ROI narrative, and roadmap alignment",
        "link": "#outcomes"
      },
      {
        "title": "Continuous workshop tracking",
        "detail": "Run playbooks and update collaboration issues",
        "link": "#resources"
      }
    ]
  },
  "journey_phase": {
    "current": "onboarding",
    "phases": [
      {
        "key": "onboarding",
        "label": "Onboarding",
        "focus": "Milestones and first value",
        "description": "Confirm engagement, platform readiness, and initial activation."
      },
      {
        "key": "early_adoption",
        "label": "Early adoption",
        "focus": "Verify and Secure enablement",
        "description": "Expand CI coverage, stabilize pipelines, and start scanning."
      },
      {
        "key": "broad_adoption",
        "label": "Broad adoption",
        "focus": "Use case coverage and health stabilization",
        "description": "Scale use cases across teams and improve health drivers."
      },
      {
        "key": "value_realization",
        "label": "Value realization",
        "focus": "Outcomes, ROI, and executive alignment",
        "description": "Validate success plan outcomes and executive cadence."
      }
    ]
  },
  "next_actions": {
    "executive": [
      {
        "text": "Review success plan objective progress",
        "link": "#outcomes"
      },
      {
        "text": "Confirm platform adoption score trajectory",
        "link": "#adoption"
      },
      {
        "text": "Discuss top health risks and mitigations",
        "link": "#health"
      },
      {
        "text": "Prepare QBR/EBR agenda",
        "link": "#resources"
      }
    ],
    "adoption": [
      {
        "text": "Enable CI for remaining teams",
        "link": "#adoption"
      },
      {
        "text": "Schedule Verify workshop",
        "link": "#resources"
      },
      {
        "text": "Expand security scanning coverage",
        "link": "#adoption"
      },
      {
        "text": "Update onboarding checklist items",
        "link": "#onboarding"
      }
    ],
    "csm": [
      {
        "text": "Update health drivers and risks",
        "link": "#health"
      },
      {
        "text": "Align collaboration project issues",
        "link": "#resources"
      },
      {
        "text": "Refresh success plan evidence links",
        "link": "#outcomes"
      },
      {
        "text": "Review reporting cadence outputs",
        "link": "#resources"
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

const MODE_CONFIG = {
  executive: {
    label: 'Executive Summary',
    description: 'Executive summary focused on outcomes, risk, and platform adoption.'
  },
  adoption: {
    label: 'Adoption & Enablement',
    description: 'Use case adoption detail, enablement progress, and workshop focus areas.'
  },
  csm: {
    label: 'CSM / Operator',
    description: 'Health drivers, risks, collaboration cadence, and playbook execution.'
  }
};

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

const labelForSignal = (status) => {
  switch (status) {
    case 'good':
      return 'Green';
    case 'risk':
      return 'Red';
    default:
      return 'Yellow';
  }
};

const formatMetricValue = (value, format) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'Not tracked';
  if (format === 'percent') return formatPercent(value);
  if (format === 'number') return formatDecimal(value, 1);
  return value.toString();
};

const buildThresholdText = (metric) => {
  if (metric.threshold_text) return metric.threshold_text;
  const thresholds = metric.thresholds || {};
  const formatValue = (val) => (metric.format === 'percent' ? formatPercent(val) : formatDecimal(val, 1));
  if (thresholds.red_max !== undefined && thresholds.yellow_max !== undefined) {
    const red = `Red <=${formatValue(thresholds.red_max)}`;
    const yellow = `Yellow >${formatValue(thresholds.red_max)} and <=${formatValue(thresholds.yellow_max)}`;
    const green = `Green >${formatValue(thresholds.yellow_max)}`;
    return `${red}, ${yellow}, ${green}`;
  }
  return '';
};

const scoreMetric = (metric) => {
  const value = metric.value;
  if (value === undefined || value === null || Number.isNaN(value)) return 'watch';
  const thresholds = metric.thresholds || {};
  if (thresholds.green_min !== undefined) {
    if (value >= thresholds.green_min) return 'good';
  } else if (thresholds.yellow_max !== undefined) {
    if (value > thresholds.yellow_max) return 'good';
  }
  if (thresholds.red_max !== undefined && value <= thresholds.red_max) return 'risk';
  return 'watch';
};

const rollupUseCaseStatus = (metricStatuses, rule) => {
  const greenCount = metricStatuses.filter((status) => status === 'good').length;
  const riskCount = metricStatuses.filter((status) => status === 'risk').length;
  if (rule === 'two_green_one_yellow') {
    if (greenCount >= 2 && riskCount === 0) return 'good';
    if (riskCount >= 2) return 'risk';
    return 'watch';
  }
  return metricStatuses[0] || 'watch';
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

const buildView = (data) => {
  const startDate = parseDate(data.customer.start_date);
  const updatedDate = parseDate(data.meta.last_updated) || new Date();
  const journeyPhases = data.journey_phase?.phases || [];
  const journeyCurrentKey = data.journey_phase?.current || journeyPhases[0]?.key || 'onboarding';
  const journeyCurrent = journeyPhases.find((phase) => phase.key === journeyCurrentKey) || journeyPhases[0] || {
    key: 'onboarding',
    label: 'Onboarding',
    focus: 'Milestones and first value',
    description: 'Confirm engagement, platform readiness, and initial activation.'
  };

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

  const rawUseCases = data.use_case_scoring?.use_cases || [];
  const useCaseCards = rawUseCases.map((useCase) => {
    const metrics = (useCase.metrics || []).map((metric) => {
      const status = scoreMetric(metric);
      return {
        ...metric,
        status,
        value_display: formatMetricValue(metric.value, metric.format),
        threshold_display: buildThresholdText(metric)
      };
    });
    const overallStatus = rollupUseCaseStatus(metrics.map((metric) => metric.status), useCase.rollup_rule);
    const summaryMetricIndex = useCase.summary_metric_index ?? 0;
    const summaryMetric = metrics[summaryMetricIndex];
    const summaryNote = summaryMetric ? `${summaryMetric.name}: ${summaryMetric.value_display}` : useCase.summary_note || '';
    return {
      ...useCase,
      metrics,
      overall_status: overallStatus,
      summary_note: summaryNote
    };
  });

  const greenUseCases = useCaseCards.filter((useCase) => useCase.overall_status === 'good').length;
  const platformTarget = data.use_case_scoring?.platform_adoption_target_green ?? 3;
  const devopsScore = data.use_case_scoring?.devops_score ?? adoptionIndex;
  const gainsightRanges = data.use_case_scoring?.gainsight_ranges || { red: '0-50', yellow: '51-75', green: '76-100' };
  const platformStatusLabel = greenUseCases >= platformTarget ? 'On track' : 'Needs improvement';
  const platformScoreText = `Platform adoption: ${greenUseCases} / ${useCaseCards.length} (${platformStatusLabel})`;

  const successObjectives = data.success_plan?.objectives || [];
  const normalizedObjectives = successObjectives.map((objective) => ({
    ...objective,
    status: normalizeStatus(objective.status)
  }));
  const objectivesComplete = normalizedObjectives.filter((objective) => objective.status === 'good').length;
  const objectivesProgress =
    normalizedObjectives.length > 0
      ? normalizedObjectives.reduce((sum, objective) => sum + (objective.progress || 0), 0) / normalizedObjectives.length
      : 0;

  const healthFactors = (data.health?.factors || []).map((factor) => ({
    ...factor,
    status: normalizeStatus(factor.status)
  }));
  const healthStatus = data.health?.overall_status ? normalizeStatus(data.health.overall_status) : deriveOverallStatus(healthFactors);

  const execRisks = healthFactors.filter((factor) => factor.status !== 'good').slice(0, 3);
  const execSuccessPlan = normalizedObjectives.slice(0, 3).map((objective) => ({
    text: objective.objective || objective.title || 'Objective',
    status: objective.status
  }));

  const outcomes = {
    ...data.outcomes,
    primary_progress: data.outcomes?.primary_progress ?? objectivesProgress
  };

  const cicd = data.cicd || {};
  const nextActions = data.next_actions || {};

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
      pipeline_success_rate_pct: formatPercent(cicd.pipeline_success_rate || 0),
      pipelines_week: numberFormat.format(cicd.pipelines_week || 0),
      deployments_week: numberFormat.format(cicd.deployments_week || 0),
      pipeline_duration: `${formatDecimal(cicd.pipeline_duration_minutes || 0, 0)} min`,
      devops_score_pct: formatPercent(devopsScore),
      use_cases_green: `${greenUseCases} of ${useCaseCards.length} use cases green`,
      platform_adoption_score: platformScoreText,
      platform_adoption_target: `${platformTarget}+ green use cases`,
      platform_adoption_status: platformStatusLabel,
      gainsight_red_range: gainsightRanges.red,
      gainsight_yellow_range: gainsightRanges.yellow,
      gainsight_green_range: gainsightRanges.green
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
      summary: `${objectivesComplete} of ${normalizedObjectives.length} objectives achieved`
    },
    health: {
      overall_status: healthStatus,
      overall_label: labelForStatus(healthStatus),
      last_exec_review: formatDate(data.health?.last_exec_review)
    },
    journey: {
      current_key: journeyCurrent.key,
      current_label: journeyCurrent.label,
      current_focus: journeyCurrent.focus,
      current_description: journeyCurrent.description,
      phases: journeyPhases
    },
    mode: {
      current: 'executive',
      label: MODE_CONFIG.executive.label,
      description: MODE_CONFIG.executive.description
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
    additional: {
      onboardingCompletion,
      adoptionIndex,
      firstValueProgress,
      licenseUtil
    },
    lists: {
      useCaseCards,
      useCaseSummaries: useCaseCards.map((useCase) => ({
        name: useCase.name,
        status: useCase.overall_status,
        note: useCase.summary_note
      })),
      healthFactors,
      execRisks,
      execSuccessPlan,
      events: data.events || [],
      cicdMilestones: cicd.milestones || [],
      learning: data.learning || {},
      successObjectives: normalizedObjectives,
      nextActions
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

const renderUseCaseCards = (selector, useCases) => {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '';
  useCases.forEach((useCase, index) => {
    const card = document.createElement('article');
    card.className = 'card usecase-card';
    card.style.setProperty('--order', (index + 2).toString());
    const statusLabel = labelForSignal(useCase.overall_status);
    const placeholderNote = useCase.placeholder ? '<p class="metric-placeholder">Tracking not enabled for this use case.</p>' : '';
    const metricsHtml = useCase.metrics
      .map(
        (metric) => `
        <div class="metric-row">
          <span class="status-dot" data-status="${metric.status}"></span>
          <div>
            <div class="metric-name">${metric.name}</div>
            <div class="metric-meta">Value: ${metric.value_display}</div>
            <div class="metric-threshold">${metric.threshold_display}</div>
            ${metric.calc ? `<div class="metric-calc">${metric.calc}</div>` : ''}
          </div>
        </div>
      `
      )
      .join('');

    card.innerHTML = `
      <div class="metric-head">
        <div>
          <h3>${useCase.name}</h3>
          <p class="muted">${useCase.adoption_timeline || ''}</p>
        </div>
        <span class="status-pill" data-status="${useCase.overall_status}">${statusLabel}</span>
      </div>
      <div class="usecase-metrics">
        ${metricsHtml}
      </div>
      ${placeholderNote}
      <p class="usecase-criteria">${useCase.green_criteria || ''}</p>
    `;

    container.appendChild(card);
  });
};

const renderSuccessPlanTable = (selector, objectives) => {
  const tableBody = document.querySelector(selector);
  if (!tableBody) return;
  tableBody.innerHTML = '';
  objectives.forEach((objective) => {
    const row = document.createElement('tr');
    const status = normalizeStatus(objective.status);
    const statusLabel = labelForStatus(status);
    const evidence = objective.evidence ? `<a href="${objective.evidence}">Evidence</a>` : 'Add link';
    const ownerMeta = objective.owner ? `<div class="table-meta">Owner: ${objective.owner}</div>` : '';
    row.innerHTML = `
      <td>${objective.objective || objective.title || 'Objective'}${ownerMeta}</td>
      <td>${objective.success_metric || objective.success_criteria || ''}</td>
      <td>${objective.target || formatDate(objective.due)}</td>
      <td><span class="status-pill" data-status="${status}">${statusLabel}</span></td>
      <td>${evidence}</td>
    `;
    tableBody.appendChild(row);
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

  const makeItem = (resource) => {
    const item = document.createElement('li');
    item.className = 'resource-item';
    item.innerHTML = `
      <div class="resource-title">${resource.title}</div>
      <div class="resource-meta">${resource.type ? `${resource.type} - ` : ''}${resource.detail || ''}</div>
      <a href="${resource.link}">Open resource</a>
    `;
    return item;
  };

  if (!resources.length) return;

  const [primary, ...rest] = resources;
  list.appendChild(makeItem(primary));

  if (rest.length) {
    const moreItem = document.createElement('li');
    moreItem.className = 'resource-more';
    const details = document.createElement('details');
    details.innerHTML = '<summary>More resources</summary>';
    const moreList = document.createElement('ul');
    moreList.className = 'resource-list';
    rest.forEach((resource) => {
      moreList.appendChild(makeItem(resource));
    });
    details.appendChild(moreList);
    moreItem.appendChild(details);
    list.appendChild(moreItem);
  }
};

const renderMiniList = (selector, items, fallbackLabel = 'No updates yet') => {
  const list = document.querySelector(selector);
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) {
    const item = document.createElement('li');
    item.className = 'mini-item muted';
    item.textContent = fallbackLabel;
    list.appendChild(item);
    return;
  }
  items.forEach((itemData) => {
    const item = document.createElement('li');
    item.className = 'mini-item';
    const status = normalizeStatus(itemData.status);
    item.innerHTML = `
      <span class="status-dot" data-status="${status}"></span>
      <span>${itemData.text || itemData.label || ''}</span>
    `;
    list.appendChild(item);
  });
};

const renderNextActions = (selector, actions = []) => {
  const list = document.querySelector(selector);
  if (!list) return;
  list.innerHTML = '';
  if (!actions.length) {
    const item = document.createElement('li');
    item.className = 'action-item muted';
    item.textContent = 'No actions defined.';
    list.appendChild(item);
    return;
  }
  actions.forEach((action) => {
    const item = document.createElement('li');
    item.className = 'action-item';
    const link = action.link ? `<a href="${action.link}">${action.text}</a>` : action.text;
    item.innerHTML = link;
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

const updateModeLinks = (mode) => {
  document.querySelectorAll('[data-mode-link]').forEach((link) => {
    const modes = link.dataset.modeLink;
    if (!modes || modes === 'all') {
      link.classList.remove('is-hidden');
      return;
    }
    const allowed = modes.split(' ').includes(mode);
    link.classList.toggle('is-hidden', !allowed);
  });
};

const initModeTabs = (view) => {
  const tabs = Array.from(document.querySelectorAll('[data-mode]'));
  const panels = Array.from(document.querySelectorAll('[data-mode-panel]'));
  if (!tabs.length || !panels.length) return;

  const setActive = (mode) => {
    document.body.dataset.mode = mode;
    tabs.forEach((tab) => {
      const isActive = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive.toString());
    });
    panels.forEach((panel) => {
      const isActive = panel.dataset.modePanel === mode;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', (!isActive).toString());
    });
    const modeCopy = MODE_CONFIG[mode] || MODE_CONFIG.executive;
    document.querySelectorAll('[data-mode-label]').forEach((node) => {
      node.textContent = modeCopy.label;
    });
    document.querySelectorAll('[data-field="mode.description"]').forEach((node) => {
      node.textContent = modeCopy.description;
    });
    renderNextActions('[data-list="next-actions"]', view.lists.nextActions[mode] || []);
    updateModeLinks(mode);
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActive(tab.dataset.mode);
    });
  });

  setActive(view.mode.current || 'executive');
};

const initPhaseTabs = (view) => {
  const tabs = Array.from(document.querySelectorAll('[data-phase]'));
  if (!tabs.length) return;
  const phaseMap = new Map((view.journey.phases || []).map((phase) => [phase.key, phase]));

  const setActive = (phaseKey) => {
    document.body.dataset.phase = phaseKey;
    tabs.forEach((tab) => {
      const isActive = tab.dataset.phase === phaseKey;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive.toString());
    });
    const phase = phaseMap.get(phaseKey);
    if (!phase) return;
    document.querySelectorAll('[data-field="journey.current_label"]').forEach((node) => {
      node.textContent = phase.label;
    });
    document.querySelectorAll('[data-field="journey.current_focus"]').forEach((node) => {
      node.textContent = phase.focus;
    });
    document.querySelectorAll('[data-field="journey.current_description"]').forEach((node) => {
      node.textContent = phase.description;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActive(tab.dataset.phase);
    });
  });

  setActive(view.journey.current_key || 'onboarding');
};

const init = async () => {
  const data = await loadData();
  const view = buildView(data);

  renderTasks(data.onboarding.tasks);
  renderEventList('[data-list="ttv-events"]', view.lists.events, parseDate(data.customer.start_date));
  renderMilestoneList('[data-list="cicd-milestones"]', view.lists.cicdMilestones);
  renderUseCases('[data-list="devops-usecases"]', view.lists.useCaseSummaries);
  renderUseCases('[data-list="maturity-map"]', view.lists.useCaseSummaries);
  renderUseCaseCards('[data-usecase-cards]', view.lists.useCaseCards);
  renderSuccessPlanTable('[data-list="success-plan-table"]', view.lists.successObjectives);
  renderHealthFactors('[data-list="health-factors"]', view.lists.healthFactors);
  renderMiniList('[data-list="exec-risks"]', view.lists.execRisks, 'No risks flagged');
  renderMiniList('[data-list="exec-success-plan"]', view.lists.execSuccessPlan, 'No objectives yet');

  renderResourceList('[data-list="learning-recommended"]', view.lists.learning.recommended || []);
  renderResourceList('[data-list="learning-webinars"]', view.lists.learning.webinars || []);
  renderResourceList('[data-list="learning-templates"]', view.lists.learning.templates || []);
  renderResourceList('[data-list="learning-cadence"]', view.lists.learning.cadence || []);
  renderResourceList('[data-list="learning-playbooks"]', view.lists.learning.playbooks || []);
  renderResourceList('[data-list="learning-collaboration"]', view.lists.learning.collaboration || []);
  renderResourceList('[data-list="learning-reporting"]', view.lists.learning.reporting || []);
  renderResourceList('[data-list="collaboration-templates"]', view.lists.learning.collaboration_templates || []);
  renderResourceList('[data-list="operating-cadence"]', view.lists.learning.operating_cadence || []);
  renderResourceList('[data-list="onboarding-templates"]', view.lists.learning.templates || []);

  updateBindings(view);
  updateProgressBars(view.progressValues);
  updateRing(view.additional.licenseUtil);
  updateChips(view);
  renderTimeline(view);
  updateHealthBadge(view);
  initPhaseTabs(view);
  initModeTabs(view);

  document.body.classList.add('loaded');
};

init();
