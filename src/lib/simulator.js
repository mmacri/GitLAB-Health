const STAGE_ORDER = ['Align', 'Onboard', 'Enable', 'Expand', 'Renew'];
const CORE_USE_CASES = ['SCM', 'CI', 'CD', 'Security'];

const MINIMUM_REFERENCE_LINKS = [
  'https://handbook.gitlab.com/job-families/sales/customer-success-engineer/',
  'https://handbook.gitlab.com/handbook/customer-success/product-usage-data/platform-value-score/',
  'https://handbook.gitlab.com/handbook/customer-success/customer-health-scoring/',
  'https://docs.gitlab.com/ee/ci/',
  'https://docs.gitlab.com/ee/user/application_security/',
  'https://docs.gitlab.com/ee/user/analytics/value_stream_analytics/',
  'https://about.gitlab.com/stages-devops-lifecycle/'
];

const DEPLOYMENT_FREQUENCY_TIERS = [
  'Monthly',
  'Bi-weekly',
  'Weekly',
  'Daily',
  'Multiple times per day'
];

const LEAD_TIME_TIERS = [
  '21+ days',
  '10-20 days',
  '3-9 days',
  '1-2 days',
  '<1 day'
];

const CHANGE_FAILURE_RATE_TIERS = [
  '25%+',
  '15-24%',
  '10-14%',
  '6-9%',
  '<6%'
];

const MTTR_TIERS = [
  '48h+',
  '24-47h',
  '8-23h',
  '4-7h',
  '<4h'
];

const compare = (left, operator, right) => {
  if (operator === '==') return left === right;
  if (operator === '!=') return left !== right;
  if (operator === '<') return Number(left) < Number(right);
  if (operator === '<=') return Number(left) <= Number(right);
  if (operator === '>') return Number(left) > Number(right);
  if (operator === '>=') return Number(left) >= Number(right);
  if (operator === 'includes') return String(left || '').toLowerCase().includes(String(right || '').toLowerCase());
  return false;
};

const toReferenceRecord = (url) => ({
  title: url,
  url
});

const collectByArea = (capabilities = []) => {
  const grouped = new Map();
  (capabilities || []).forEach((item) => {
    if (!grouped.has(item.area)) grouped.set(item.area, []);
    grouped.get(item.area).push(item);
  });
  return grouped;
};

const formatTemplate = (text, values = {}) =>
  String(text || '').replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key) => {
    const value = values[key];
    return value === null || value === undefined ? '' : String(value);
  });

const ruleMatched = (rule, selectedMap, metrics) => {
  const condition = rule?.condition || {};
  const all = condition.all_capabilities || [];
  const any = condition.any_capabilities || [];
  const missingAny = condition.any_missing_capabilities || [];
  const metricConditions = condition.metric_conditions || [];

  const allOk = all.every((capabilityId) => Boolean(selectedMap[capabilityId]));
  const anyOk = any.length ? any.some((capabilityId) => Boolean(selectedMap[capabilityId])) : true;
  const missingAnyOk = missingAny.length ? missingAny.some((capabilityId) => !selectedMap[capabilityId]) : true;
  const metricOk = metricConditions.every((item) => compare(metrics[item.key], item.operator, item.value));

  return allOk && anyOk && missingAnyOk && metricOk;
};

const tierClamp = (value) => Math.max(0, Math.min(4, Number(value || 0)));

const parseUseCaseRules = (rules = []) => (rules || []).filter((item) => item.type === 'use_case');
const parseStageRules = (rules = []) => (rules || []).filter((item) => item.type === 'stage');
const parseActionRules = (rules = []) => (rules || []).filter((item) => item.type === 'action');

const defaultUseCaseState = (rules = []) => {
  const map = {};
  parseUseCaseRules(rules).forEach((rule) => {
    const key = rule?.outputs?.use_case;
    if (!key) return;
    if (!map[key]) map[key] = 'gray';
  });
  return map;
};

const fallbackJourneyStage = (greenCount) => {
  if (greenCount <= 0) return 'Align';
  if (greenCount === 1) return 'Onboard';
  if (greenCount === 2) return 'Enable';
  return 'Expand';
};

const hasCapability = (selectedMap, id) => Boolean(selectedMap?.[id]);

const forecastBaseTiers = (selectedMap, useCaseStates) => {
  const scmGreen = useCaseStates.SCM === 'green';
  const ciGreen = useCaseStates.CI === 'green';
  const cdGreen = useCaseStates.CD === 'green';
  const securityGreen = useCaseStates.Security === 'green';

  const deploymentFrequencyTier = tierClamp((scmGreen ? 1 : 0) + (ciGreen ? 1 : 0) + (cdGreen ? 1 : 0) + (hasCapability(selectedMap, 'analytics_dora_tracking') ? 1 : 0));
  const leadTimeTier = tierClamp((scmGreen ? 1 : 0) + (ciGreen ? 1 : 0) + (cdGreen ? 1 : 0) + (hasCapability(selectedMap, 'operating_cadence_current') ? 1 : 0));
  const changeFailureTier = tierClamp((ciGreen ? 1 : 0) + (securityGreen ? 1 : 0) + (hasCapability(selectedMap, 'security_container_scanning') ? 1 : 0) + (hasCapability(selectedMap, 'operating_exec_alignment') ? 1 : 0));
  const mttrTier = tierClamp((cdGreen ? 1 : 0) + (securityGreen ? 1 : 0) + (hasCapability(selectedMap, 'analytics_value_stream') ? 1 : 0) + (hasCapability(selectedMap, 'operating_cadence_current') ? 1 : 0));

  return {
    deployment_frequency_tier: deploymentFrequencyTier,
    lead_time_tier: leadTimeTier,
    change_failure_rate_tier: changeFailureTier,
    mttr_tier: mttrTier
  };
};

const toImpactForecast = (tiers) => ({
  deployment_frequency: DEPLOYMENT_FREQUENCY_TIERS[tierClamp(tiers.deployment_frequency_tier)],
  lead_time: LEAD_TIME_TIERS[tierClamp(tiers.lead_time_tier)],
  change_failure_rate: CHANGE_FAILURE_RATE_TIERS[tierClamp(tiers.change_failure_rate_tier)],
  mttr: MTTR_TIERS[tierClamp(tiers.mttr_tier)]
});

const missingCapabilitiesForArea = (capabilities = [], selectedMap, area) =>
  (capabilities || [])
    .filter((item) => item.area === area && !selectedMap[item.id])
    .map((item) => item.label);

const biggestGapWorkshop = (state) => {
  const securityGreen = state.use_case_states.Security === 'green';
  const ciGreen = state.use_case_states.CI === 'green';
  const cdGreen = state.use_case_states.CD === 'green';
  if (!securityGreen) return 'Security Enablement Workshop';
  if (!ciGreen) return 'CI Pipeline Foundations Workshop';
  if (!cdGreen) return 'CD Workflow Activation Workshop';
  return 'Executive Value Realization Workshop';
};

const uniqueReferences = (references = []) => {
  const seen = new Set();
  const output = [];
  references.forEach((item) => {
    const url = typeof item === 'string' ? item : item?.url;
    if (!url) return;
    const normalized = String(url).trim().toLowerCase().replace(/\/+$/, '');
    if (seen.has(normalized)) return;
    seen.add(normalized);
    output.push(typeof item === 'string' ? toReferenceRecord(item) : { title: item.title || item.url, url: item.url });
  });
  return output;
};

export const SIMULATOR_PRESETS = [
  { id: 'starter_scm_only', label: 'Starter SCM only' },
  { id: 'ci_adoption', label: 'CI adoption' },
  { id: 'cicd_adoption', label: 'CI/CD adoption' },
  { id: 'devsecops_adoption', label: 'DevSecOps adoption (Security + CI)' },
  { id: 'mature_platform', label: 'Mature platform (3+ use cases green)' }
];

export const presetCapabilityMap = (presetId, capabilities = []) => {
  const selected = {};
  (capabilities || []).forEach((item) => {
    selected[item.id] = false;
  });

  const enable = (ids) => ids.forEach((id) => { selected[id] = true; });

  if (presetId === 'starter_scm_only') {
    enable(['scm_repositories_migrated', 'scm_merge_requests_enabled', 'operating_cadence_current', 'operating_cse_role_context', 'lifecycle_story_visible']);
  } else if (presetId === 'ci_adoption') {
    enable(['scm_repositories_migrated', 'scm_merge_requests_enabled', 'scm_review_policies', 'ci_pipeline_templates', 'ci_shared_runners', 'ci_test_automation', 'operating_cadence_current', 'operating_cse_role_context', 'lifecycle_story_visible']);
  } else if (presetId === 'cicd_adoption') {
    enable(['scm_repositories_migrated', 'scm_merge_requests_enabled', 'scm_review_policies', 'ci_pipeline_templates', 'ci_shared_runners', 'ci_test_automation', 'cd_environments', 'cd_release_governance', 'cd_progressive_delivery', 'operating_exec_alignment', 'operating_cadence_current', 'operating_value_metrics_ready', 'operating_cse_role_context', 'lifecycle_story_visible']);
  } else if (presetId === 'devsecops_adoption') {
    enable(['scm_repositories_migrated', 'scm_merge_requests_enabled', 'scm_review_policies', 'ci_pipeline_templates', 'ci_shared_runners', 'ci_test_automation', 'security_sast', 'security_dependency_scanning', 'security_container_scanning', 'operating_exec_alignment', 'operating_cadence_current', 'operating_cse_role_context', 'lifecycle_story_visible']);
  } else if (presetId === 'mature_platform') {
    (capabilities || []).forEach((item) => { selected[item.id] = true; });
  } else {
    return presetCapabilityMap('starter_scm_only', capabilities);
  }
  return selected;
};

export const deriveSimulatorState = ({ capabilities = [], rules = [], selected = {}, customerSafe = false }) => {
  const useCaseStates = defaultUseCaseState(rules);
  const references = [...MINIMUM_REFERENCE_LINKS];

  parseUseCaseRules(rules).forEach((rule) => {
    const useCase = rule?.outputs?.use_case;
    if (!useCase) return;
    const allRequired = rule?.condition?.all_capabilities || [];
    const enabledCount = allRequired.filter((id) => selected[id]).length;
    const matched = ruleMatched(rule, selected, {});
    if (matched) {
      useCaseStates[useCase] = 'green';
    } else if (enabledCount > 0) {
      useCaseStates[useCase] = 'yellow';
    } else if (!useCaseStates[useCase]) {
      useCaseStates[useCase] = 'gray';
    }
    (rule.references || []).forEach((link) => references.push(link));
  });

  const useCaseGreenCount = CORE_USE_CASES.filter((name) => useCaseStates[name] === 'green').length;
  const metrics = {
    use_case_green_count: useCaseGreenCount,
    adoption_high: useCaseGreenCount >= 3,
    security_green: useCaseStates.Security === 'green',
    renewal_window_soon: Boolean(selected.operating_renewal_window_soon),
    cadence_current: Boolean(selected.operating_cadence_current),
    value_metrics_ready: Boolean(selected.operating_value_metrics_ready),
    exec_alignment: Boolean(selected.operating_exec_alignment)
  };

  const stageMatches = parseStageRules(rules)
    .filter((rule) => ruleMatched(rule, selected, metrics))
    .sort((left, right) => Number(right?.outputs?.priority || 0) - Number(left?.outputs?.priority || 0));
  const journeyStage = stageMatches[0]?.outputs?.journey_stage || fallbackJourneyStage(useCaseGreenCount);

  const actionRules = parseActionRules(rules).filter((rule) => ruleMatched(rule, selected, metrics));
  const recommendedActions = actionRules
    .map((rule) => {
      const output = rule.outputs || {};
      const context = {
        ...metrics,
        journey_stage: journeyStage
      };
      const why = formatTemplate(output.why || '', context) || output.description || 'Action recommended from simulator signals.';
      const action = {
        id: rule.id,
        title: output.title || rule.id,
        description: output.description || '',
        why,
        playbook: output.playbook || 'Playbook',
        resource: output.resource_url ? { title: output.resource_title || output.resource_url, url: output.resource_url } : null,
        impact_adjustments: output.impact_adjustments || {},
        references: uniqueReferences([...(rule.references || []), output.resource_url ? { title: output.resource_title || output.resource_url, url: output.resource_url } : null].filter(Boolean)),
        internal_note: output.internal_note || ''
      };
      return customerSafe ? { ...action, internal_note: '' } : action;
    })
    .slice(0, 6);

  if (!recommendedActions.length) {
    recommendedActions.push({
      id: 'default_action',
      title: 'Sustain Adoption Momentum',
      description: 'Continue with quarterly platform review and value evidence updates.',
      why: 'No critical rule triggers detected in this scenario.',
      playbook: 'Executive Business Review (EBR) Playbook',
      resource: {
        title: 'Customer Success Handbook',
        url: 'https://handbook.gitlab.com/handbook/customer-success/'
      },
      impact_adjustments: {},
      references: uniqueReferences([
        'https://handbook.gitlab.com/handbook/customer-success/'
      ]),
      internal_note: ''
    });
  }

  const baseTiers = forecastBaseTiers(selected, useCaseStates);
  const adjustedTiers = recommendedActions.reduce((acc, action) => {
    const adjustments = action.impact_adjustments || {};
    return {
      deployment_frequency_tier: tierClamp(acc.deployment_frequency_tier + Number(adjustments.deployment_frequency || 0)),
      lead_time_tier: tierClamp(acc.lead_time_tier + Number(adjustments.lead_time || 0)),
      change_failure_rate_tier: tierClamp(acc.change_failure_rate_tier + Number(adjustments.change_failure_rate || 0)),
      mttr_tier: tierClamp(acc.mttr_tier + Number(adjustments.mttr || 0))
    };
  }, baseTiers);

  recommendedActions.forEach((action) => (action.references || []).forEach((item) => references.push(item)));
  (capabilities || [])
    .filter((item) => selected[item.id])
    .forEach((item) => (item.doc_links || []).forEach((link) => references.push(link)));

  const referenceRecords = uniqueReferences(references);

  return {
    selected_capabilities: { ...selected },
    grouped_capabilities: collectByArea(capabilities),
    use_case_states: useCaseStates,
    use_case_green_count: useCaseGreenCount,
    journey_stage: journeyStage,
    stage_progress_index: Math.max(0, STAGE_ORDER.indexOf(journeyStage)),
    recommended_actions: recommendedActions,
    impact_forecast: toImpactForecast(adjustedTiers),
    references: referenceRecords,
    metrics
  };
};

const referencesSection = (references = []) => [
  '## References',
  ...uniqueReferences(references).map((item) => `- [${item.title}](${item.url})`)
].join('\n');

export const buildSimulatorSuccessPlanMarkdown = ({ state, customerSafe = false, customerName = 'Scenario Customer' }) => {
  const actions = state?.recommended_actions || [];
  const useCaseStates = state?.use_case_states || {};
  const topActions = actions.slice(0, 3);
  const lines = [
    `# Customer Success Plan - ${customerName}`,
    '',
    `- Journey Stage: ${state?.journey_stage || 'Align'}`,
    `- Platform Adoption: ${state?.use_case_green_count || 0} of 4 core use cases green`,
    '',
    '## Strategic Goals',
    '- Expand platform adoption depth to 3+ green use cases',
    '- Improve engineering delivery outcomes with DevSecOps practices',
    '',
    '## GitLab Use Cases',
    ...Object.entries(useCaseStates).map(([name, status]) => `- ${name}: ${status}`),
    '',
    '## Success Metrics',
    `- Deployment frequency: ${state?.impact_forecast?.deployment_frequency || 'n/a'}`,
    `- Lead time for changes: ${state?.impact_forecast?.lead_time || 'n/a'}`,
    `- Change failure rate: ${state?.impact_forecast?.change_failure_rate || 'n/a'}`,
    `- MTTR: ${state?.impact_forecast?.mttr || 'n/a'}`,
    '',
    '## Milestones',
    '- Week 1: Confirm expansion objective, owner, and baseline',
    '- Week 2: Execute recommended workshop and implement first remediation',
    '- Week 4: Validate adoption delta and publish executive-ready evidence',
    '',
    '## Recommended Next Steps',
    ...topActions.map((item) => `- ${item.title}: ${item.description}`)
  ];
  if (!customerSafe) {
    lines.push('', '## Internal Notes', `- Triggered recommendations: ${(actions || []).map((item) => item.id).join(', ')}`);
  }
  lines.push('', referencesSection(state?.references || []));
  return lines.join('\n');
};

export const buildSimulatorExecutiveSummaryMarkdown = ({ state, customerSafe = true, customerName = 'Scenario Customer' }) => {
  const topAction = (state?.recommended_actions || [])[0];
  const lines = [
    `# Executive Summary - ${customerName}`,
    '',
    `- Journey Stage: ${state?.journey_stage || 'Align'}`,
    `- Adoption Coverage: ${state?.use_case_green_count || 0} of 4 core use cases green`,
    '',
    '## Adoption Coverage',
    ...Object.entries(state?.use_case_states || {}).map(([name, status]) => `- ${name}: ${status}`),
    '',
    '## Expected Outcome Improvements',
    `- Deployment frequency forecast: ${state?.impact_forecast?.deployment_frequency || 'n/a'}`,
    `- Lead time forecast: ${state?.impact_forecast?.lead_time || 'n/a'}`,
    `- Change failure rate forecast: ${state?.impact_forecast?.change_failure_rate || 'n/a'}`,
    `- MTTR forecast: ${state?.impact_forecast?.mttr || 'n/a'}`,
    '',
    '## Next Recommended Enablement Session',
    `- ${topAction?.title || 'Platform adoption review'}: ${topAction?.description || 'Run next enablement checkpoint.'}`
  ];
  if (!customerSafe) {
    lines.push('', '## Internal Signal Notes', `- Trigger IDs: ${(state?.recommended_actions || []).map((item) => item.id).join(', ')}`);
  }
  lines.push('', referencesSection(state?.references || []));
  return lines.join('\n');
};

export const buildSimulatorWorkshopPlanMarkdown = ({ state, capabilities = [], customerSafe = true, customerName = 'Scenario Customer' }) => {
  const workshopTitle = biggestGapWorkshop(state || {});
  const gapArea =
    workshopTitle.includes('Security') ? 'Security' : workshopTitle.includes('CI') ? 'CI' : workshopTitle.includes('CD') ? 'CD' : 'OperatingModel';
  const prerequisites = missingCapabilitiesForArea(capabilities, state?.selected_capabilities || {}, gapArea).slice(0, 5);
  const lines = [
    `# Workshop Plan - ${workshopTitle}`,
    '',
    `- Customer: ${customerName}`,
    `- Journey Stage: ${state?.journey_stage || 'Align'}`,
    '',
    '## Agenda',
    '1. Review current capability baseline',
    '2. Implement prioritized workflow changes',
    '3. Validate expected impact and owner commitments',
    '',
    '## Prerequisites',
    ...(prerequisites.length ? prerequisites.map((item) => `- [ ] ${item}`) : ['- [ ] Access and owner assignments confirmed']),
    '',
    '## Follow-up',
    '- [ ] Log adoption delta in account update',
    '- [ ] Publish customer-safe recap',
    '- [ ] Confirm next checkpoint date'
  ];
  if (!customerSafe) {
    lines.push('', '## Internal Follow-up', '- [ ] Update internal risk register with workshop outcomes');
  }
  lines.push('', referencesSection(state?.references || []));
  return lines.join('\n');
};

export const buildSimulatorIssueBodyMarkdown = ({ state, customerSafe = true, customerName = 'Scenario Customer' }) => {
  const topAction = (state?.recommended_actions || [])[0];
  const lines = [
    `# Simulator Scenario Issue - ${customerName}`,
    '',
    `## Title Suggestion`,
    `${topAction?.title || 'Adoption simulation follow-up'} for ${customerName}`,
    '',
    '## Description',
    `Scenario indicates journey stage ${state?.journey_stage || 'Align'} with ${state?.use_case_green_count || 0} core use cases green.`,
    topAction ? `Primary recommendation: ${topAction.description}` : 'Primary recommendation: run adoption review.',
    '',
    '## Acceptance Criteria',
    '- [ ] Recommended motion scheduled',
    '- [ ] Owner and due date confirmed',
    '- [ ] Updated adoption and outcome forecast recorded',
    '',
    '## References'
  ];
  uniqueReferences(state?.references || []).forEach((item) => {
    lines.push(`- [${item.title}](${item.url})`);
  });
  if (!customerSafe) {
    lines.push('', `## Internal Trigger Context`, `- Triggered actions: ${(state?.recommended_actions || []).map((item) => item.id).join(', ')}`);
  }
  return lines.join('\n');
};

export const simulatorReferencesMinimum = () => MINIMUM_REFERENCE_LINKS.map((url) => ({ title: url, url }));

export const simulatorStageOrder = () => [...STAGE_ORDER];
