import { DEVSECOPS_STAGES, STAGE_STATUSES, USE_CASE_KEYS, ensureWorkspaceShape } from './model.js';

const PLACEHOLDER_PATTERN = /\b(tbd|lorem ipsum|placeholder|example customer|example corp)\b/i;

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const hasPlaceholder = (value) => PLACEHOLDER_PATTERN.test(String(value || '').trim());

const ensureUniqueIds = (rows = [], field, errors, label) => {
  const seen = new Set();
  rows.forEach((row) => {
    const id = String(row?.[field] || '').trim();
    if (!id) return;
    if (seen.has(id)) {
      errors.push(`Duplicate ${label} id detected: ${id}`);
      return;
    }
    seen.add(id);
  });
};

export const validateWorkspaceIntegrity = (workspace, fallback = null) => {
  const model = ensureWorkspaceShape(workspace, fallback);
  const errors = [];
  const warnings = [];

  if (!model.version) errors.push('Workspace is missing version.');
  if (!model.updatedAt) warnings.push('Workspace is missing updatedAt timestamp.');

  if (!Array.isArray(model.customers) || !model.customers.length) {
    errors.push('Workspace must include at least one customer.');
  }

  ensureUniqueIds(model.customers, 'id', errors, 'customer');
  ensureUniqueIds(model.programs || [], 'id', errors, 'program');
  ensureUniqueIds(model.voc || [], 'id', errors, 'VOC');

  const customerIds = new Set((model.customers || []).map((customer) => customer.id));
  const useCaseSet = new Set(USE_CASE_KEYS);
  const stageSet = new Set(DEVSECOPS_STAGES);

  (model.customers || []).forEach((customer) => {
    const customerId = customer.id;
    if (!customer.name) errors.push(`Customer ${customerId} is missing name.`);
    if (hasPlaceholder(customer.name)) errors.push(`Customer ${customerId} uses placeholder-like name.`);
    if (!customer.renewalDate) warnings.push(`Customer ${customerId} is missing renewalDate.`);
    if (!Array.isArray(customer.contacts)) warnings.push(`Customer ${customerId} contacts must be an array.`);

    const adoption = model.adoption?.[customerId];
    if (!adoption) {
      errors.push(`Customer ${customerId} is missing adoption block.`);
      return;
    }

    const stages = adoption.devsecopsStages || {};
    DEVSECOPS_STAGES.forEach((stage) => {
      const status = stages[stage];
      if (!STAGE_STATUSES.includes(status)) {
        errors.push(`Customer ${customerId} stage ${stage} has invalid status "${status}".`);
      }
    });

    const useCases = adoption.useCases || {};
    USE_CASE_KEYS.forEach((useCase) => {
      const row = useCases[useCase];
      if (!isObject(row)) {
        errors.push(`Customer ${customerId} use case ${useCase} is missing.`);
        return;
      }
      const percent = Number(row.percent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        errors.push(`Customer ${customerId} use case ${useCase} has invalid percent "${row.percent}".`);
      }
      if (hasPlaceholder(row.evidence)) {
        warnings.push(`Customer ${customerId} use case ${useCase} evidence contains placeholder text.`);
      }
    });

    const risk = model.risk?.[customerId];
    if (!risk) errors.push(`Customer ${customerId} is missing risk block.`);
    const successPlan = model.successPlans?.[customerId];
    if (!successPlan) errors.push(`Customer ${customerId} is missing success plan block.`);
    const engagement = model.engagements?.[customerId];
    if (!Array.isArray(engagement)) errors.push(`Customer ${customerId} engagements must be an array.`);
    const expansion = model.expansion?.[customerId];
    if (!Array.isArray(expansion)) errors.push(`Customer ${customerId} expansion must be an array.`);
  });

  (model.programs || []).forEach((program) => {
    if (!program.name) errors.push(`Program ${program.id || '(unknown)'} missing name.`);
    if (hasPlaceholder(program.name)) warnings.push(`Program ${program.id} uses placeholder-like name.`);
    const cohort = Array.isArray(program.cohortCustomerIds) ? program.cohortCustomerIds : [];
    cohort.forEach((customerId) => {
      if (!customerIds.has(customerId)) {
        errors.push(`Program ${program.id} references unknown customer ${customerId}.`);
      }
    });
  });

  (model.voc || []).forEach((entry) => {
    if (!entry.customerId || !customerIds.has(entry.customerId)) {
      errors.push(`VOC entry ${entry.id || '(unknown)'} references unknown customer.`);
    }
    if (!entry.request) errors.push(`VOC entry ${entry.id || '(unknown)'} missing request.`);
    if (hasPlaceholder(entry.request) || hasPlaceholder(entry.impact)) {
      warnings.push(`VOC entry ${entry.id || '(unknown)'} contains placeholder-like text.`);
    }
  });

  const scoringWeights = model.settings?.scoringWeights || {};
  const adoptionWeight = Number(scoringWeights.adoption || 0);
  const engagementWeight = Number(scoringWeights.engagement || 0);
  const riskWeight = Number(scoringWeights.risk || 0);
  const totalWeight = adoptionWeight + engagementWeight + riskWeight;
  if (!totalWeight) {
    errors.push('Scoring weights sum to zero. Configure adoption/engagement/risk weights.');
  } else if (Math.abs(totalWeight - 100) > 0.01) {
    warnings.push(`Scoring weights sum to ${totalWeight}. They should usually total 100.`);
  }

  // Ensure no unsupported stage/use-case keys are silently drifting.
  Object.values(model.adoption || {}).forEach((adoptionRow) => {
    Object.keys(adoptionRow?.devsecopsStages || {}).forEach((key) => {
      if (!stageSet.has(key)) warnings.push(`Unknown DevSecOps stage key found: ${key}`);
    });
    Object.keys(adoptionRow?.useCases || {}).forEach((key) => {
      if (!useCaseSet.has(key)) warnings.push(`Unknown use case key found: ${key}`);
    });
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized: model
  };
};

