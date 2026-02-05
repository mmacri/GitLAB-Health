(function () {
  'use strict';

  var DateUtils = window.DateUtils || {};
  var DEFAULT_TIMEZONE = DateUtils.DEFAULT_TIMEZONE || 'America/Los_Angeles';
  var HEALTH_CADENCE_DAYS = { Green: 30, Yellow: 14, Red: 7 };
  var ESCALATION_CADENCE_DAYS = { P1: 1, P2: 3, P3: 7 };
  var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function parse(value) {
    return DateUtils.parseISO ? DateUtils.parseISO(value) : value ? new Date(value) : null;
  }

  function diffDays(start, end, timezone) {
    return DateUtils.diffInDays ? DateUtils.diffInDays(start, end, timezone) : null;
  }

  function addDays(date, days) {
    return DateUtils.addDays ? DateUtils.addDays(date, days) : null;
  }

  function addMonths(date, months) {
    return DateUtils.addMonths ? DateUtils.addMonths(date, months) : null;
  }

  function toISO(date, timezone) {
    return DateUtils.toISODate ? DateUtils.toISODate(date, timezone) : null;
  }

  function getQuarterStart(date, timezone) {
    return DateUtils.getQuarterStart ? DateUtils.getQuarterStart(date, timezone) : null;
  }

  function getQuarterEnd(date, timezone) {
    return DateUtils.getQuarterEnd ? DateUtils.getQuarterEnd(date, timezone) : null;
  }

  function isSameQuarter(a, b, timezone) {
    return DateUtils.isSameQuarter ? DateUtils.isSameQuarter(a, b, timezone) : false;
  }

  function quarterLabel(date, timezone) {
    return DateUtils.quarterLabel ? DateUtils.quarterLabel(date, timezone) : 'Unknown quarter';
  }

  function diffQuarters(from, to, timezone) {
    return DateUtils.diffInQuarters ? DateUtils.diffInQuarters(from, to, timezone) : null;
  }

  function quarterIndex(date, timezone) {
    return DateUtils.quarterIndex ? DateUtils.quarterIndex(date, timezone) : null;
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeBooleanDateField(value) {
    var normalized = value || {};
    return {
      value: normalized.value === true,
      date: normalized.date || null
    };
  }

  function normalizeTimezone(timezone) {
    return timezone || DEFAULT_TIMEZONE;
  }

  function triageStateStatus(state) {
    if (state === 'Engaged' || state === 'Re-Engaged') return 'good';
    if (state === 'At Risk') return 'watch';
    return 'risk';
  }

  function normalizeCadenceFrequency(value) {
    if (!value || typeof value !== 'string') return null;
    var text = value.trim().toLowerCase();
    if (!text) return null;
    if (text.indexOf('weekly') > -1 && text.indexOf('bi') === -1) return 'Weekly';
    if (text.indexOf('biweekly') > -1 || text.indexOf('bi-weekly') > -1 || text.indexOf('every 2') > -1) {
      return 'Biweekly';
    }
    if (text.indexOf('monthly') > -1) return 'Monthly';
    return value.trim();
  }

  function normalizeAccountData(account) {
    var clone = JSON.parse(JSON.stringify(account || {}));
    clone.timezone = normalizeTimezone(clone.timezone);
    clone.start_date = clone.start_date || clone.customer?.start_date || null;
    clone.account_name = clone.account_name || clone.customer?.name || 'Unknown account';
    clone.account_id = clone.account_id || clone.account_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    clone.workshops = ensureArray(clone.workshops);
    clone.workshop_outcomes = ensureArray(clone.workshop_outcomes);
    clone.workshop_plan = clone.workshop_plan || {
      title: null,
      target_use_case: null,
      success_criteria: null,
      expected_health_delta: null,
      next_milestone: null
    };
    clone.workshop_catalog = ensureArray(clone.workshop_catalog || clone.workshops_catalog || clone.workshops_library || []);
    clone.growth_plan = clone.growth_plan || {
      objectives: [],
      hypotheses: [],
      active_plays: [],
      owners: []
    };
    clone.growth_plan.objectives = ensureArray(clone.growth_plan.objectives);
    clone.growth_plan.hypotheses = ensureArray(clone.growth_plan.hypotheses);
    clone.growth_plan.active_plays = ensureArray(clone.growth_plan.active_plays);
    clone.growth_plan.owners = ensureArray(clone.growth_plan.owners);

    clone.success_plan_customer_validated = normalizeBooleanDateField(clone.success_plan_customer_validated);
    clone.success_plan_manager_validated = normalizeBooleanDateField(clone.success_plan_manager_validated);

    clone.renewal_readiness = clone.renewal_readiness || {
      stakeholders_confirmed: { value: false, date: null },
      outcomes_validated: { value: false, date: null },
      exec_alignment_done: { value: false, date: null },
      risk_plan_in_place: { value: false, date: null },
      commercial_terms_discussed: { value: false, date: null }
    };

    var readinessKeys = [
      'stakeholders_confirmed',
      'outcomes_validated',
      'exec_alignment_done',
      'risk_plan_in_place',
      'commercial_terms_discussed'
    ];

    readinessKeys.forEach(function (key) {
      clone.renewal_readiness[key] = normalizeBooleanDateField(clone.renewal_readiness[key]);
    });

    clone.expansion_motion = clone.expansion_motion || {
      plays_opened_qoq: 0,
      plays_completed_qoq: 0,
      win_rate_percent: 0,
      sentiment_trend: 'Flat',
      last_sentiment_logged_date: null,
      top_expansion_use_case: null
    };

    clone.response_playbooks = clone.response_playbooks || { yellow: {}, red: {} };

    clone.triage_state = clone.triage_state || null;
    clone.triage_recovery_plan = clone.triage_recovery_plan || {
      schedule_next_call: { value: false, date: null },
      stakeholders_aligned: { value: false, date: null },
      workshop_scheduled: { value: false, date: null }
    };
    ['schedule_next_call', 'stakeholders_aligned', 'workshop_scheduled'].forEach(function (key) {
      clone.triage_recovery_plan[key] = normalizeBooleanDateField(clone.triage_recovery_plan[key]);
    });

    return clone;
  }

  function validateDateField(errors, fieldName, value, allowNull) {
    if (!value) {
      if (!allowNull) {
        errors.push(fieldName + ' is missing');
      }
      return;
    }
    if (typeof value !== 'string' || !ISO_DATE_RE.test(value) || !parse(value)) {
      errors.push(fieldName + ' must be a valid ISO date string (YYYY-MM-DD)');
    }
  }

  function validateAccountData(account) {
    var normalized = normalizeAccountData(account);
    var errors = [];

    if (!normalized.account_id) errors.push('account_id is required');
    if (!normalized.account_name) errors.push('account_name is required');
    if (!normalized.timezone) errors.push('timezone is required');

    validateDateField(errors, 'start_date', normalized.start_date, false);
    validateDateField(errors, 'first_engage_date', normalized.first_engage_date, true);
    validateDateField(errors, 'first_value_date', normalized.first_value_date, true);
    validateDateField(errors, 'onboarding_complete_date', normalized.onboarding_complete_date, true);
    validateDateField(errors, 'last_cadence_call_date', normalized.last_cadence_call_date, true);
    validateDateField(errors, 'next_cadence_call_date', normalized.next_cadence_call_date, true);
    validateDateField(errors, 'next_workshop_date', normalized.next_workshop_date, true);
    validateDateField(errors, 'last_ebr_date', normalized.last_ebr_date, true);
    validateDateField(errors, 'next_ebr_target_date', normalized.next_ebr_target_date, true);
    validateDateField(errors, 'last_qbr_date', normalized.last_qbr_date, true);
    validateDateField(errors, 'next_qbr_date', normalized.next_qbr_date, true);
    validateDateField(errors, 'success_plan_last_updated_date', normalized.success_plan_last_updated_date, true);
    validateDateField(errors, 'success_plan_next_review_date', normalized.success_plan_next_review_date, true);
    validateDateField(errors, 'renewal_date', normalized.renewal_date, true);
    validateDateField(errors, 'last_health_update_date', normalized.last_health_update_date, true);
    validateDateField(errors, 'last_escalation_update_date', normalized.last_escalation_update_date, true);

    normalized.workshops.forEach(function (workshop, index) {
      validateDateField(errors, 'workshops[' + index + '].date', workshop.date, false);
      if (!workshop.theme) {
        errors.push('workshops[' + index + '].theme is required');
      }
    });

    normalized.workshop_outcomes.forEach(function (entry, index) {
      validateDateField(errors, 'workshop_outcomes[' + index + '].date', entry.date, false);
      if (entry.attendance_percent !== undefined && entry.attendance_percent !== null) {
        var pct = Number(entry.attendance_percent);
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
          errors.push('workshop_outcomes[' + index + '].attendance_percent must be between 0 and 100');
        }
      }
      if (!entry.decisions) {
        errors.push('workshop_outcomes[' + index + '].decisions is required');
      }
      if (!entry.next_step) {
        errors.push('workshop_outcomes[' + index + '].next_step is required');
      }
    });

    ['objectives', 'hypotheses', 'active_plays', 'owners'].forEach(function (key) {
      if (!Array.isArray(normalized.growth_plan[key])) {
        errors.push('growth_plan.' + key + ' must be an array');
      }
    });

    var triageStates = ['Engaged', 'At Risk', 'Non-Engaged', 'Triaged', 'Triage In Progress', 'Re-Engaged'];
    if (normalized.triage_state && triageStates.indexOf(normalized.triage_state) === -1) {
      errors.push('triage_state must be one of: ' + triageStates.join(', '));
    }

    ['schedule_next_call', 'stakeholders_aligned', 'workshop_scheduled'].forEach(function (key) {
      var planItem = normalized.triage_recovery_plan[key];
      if (!planItem || typeof planItem.value !== 'boolean') {
        errors.push('triage_recovery_plan.' + key + '.value must be boolean');
        return;
      }
      validateDateField(errors, 'triage_recovery_plan.' + key + '.date', planItem.date, true);
    });

    return {
      valid: errors.length === 0,
      errors: errors,
      normalized: normalized
    };
  }

  function toStatus(status) {
    if (status === 'Green') return 'good';
    if (status === 'Red') return 'risk';
    return 'watch';
  }

  function boolLabel(flag) {
    return flag ? 'Validated' : 'Missing validation';
  }

  function prepChecklist(ebrDueDate, now, timezone) {
    if (!ebrDueDate) return [];
    var milestones = [
      { key: 'days_60', offsetDays: 60, label: '60 days before: confirm attendees + goals' },
      { key: 'days_30', offsetDays: 30, label: '30 days before: draft deck + collect metrics' },
      { key: 'days_14', offsetDays: 14, label: '14 days before: finalize outcomes + review internally' },
      { key: 'days_7', offsetDays: 7, label: '7 days before: send pre-read + agenda' }
    ];

    return milestones.map(function (milestone) {
      var dueDate = addDays(ebrDueDate, -milestone.offsetDays);
      var daysFromNow = diffDays(now, dueDate, timezone);
      var daysUntilEbr = diffDays(now, ebrDueDate, timezone);
      var status;
      var statusLabel;
      if (daysUntilEbr < 0) {
        status = 'risk';
        statusLabel = 'Overdue';
      } else if (daysFromNow > 0) {
        status = 'watch';
        statusLabel = 'Upcoming';
      } else if (daysFromNow >= -7) {
        status = 'watch';
        statusLabel = 'Due now';
      } else {
        status = 'good';
        statusLabel = 'Completed window';
      }

      return {
        key: milestone.key,
        label: milestone.label,
        due_date: toISO(dueDate, timezone),
        due_in_days: daysFromNow,
        status: status,
        status_label: statusLabel
      };
    });
  }

  function deriveAccountMetrics(account, options) {
    var opts = options || {};
    var now = parse(opts.now) || new Date();
    var normalized = normalizeAccountData(account);
    var timezone = normalizeTimezone(normalized.timezone);

    var startDate = parse(normalized.start_date);
    var firstEngageDate = parse(normalized.first_engage_date);
    var firstValueDate = parse(normalized.first_value_date);
    var onboardingCompleteDate = parse(normalized.onboarding_complete_date);

    var timeToEngage = startDate && firstEngageDate ? diffDays(startDate, firstEngageDate, timezone) : null;
    var timeToFirstValue = startDate && firstValueDate ? diffDays(startDate, firstValueDate, timezone) : null;
    var timeToOnboard = startDate && onboardingCompleteDate ? diffDays(startDate, onboardingCompleteDate, timezone) : null;

    var lastCadenceCallDate = parse(normalized.last_cadence_call_date);
    var nextCadenceCallDate = parse(normalized.next_cadence_call_date);
    var daysSinceLastCall = lastCadenceCallDate ? diffDays(lastCadenceCallDate, now, timezone) : null;
    var cadenceStatus = 'watch';
    if (daysSinceLastCall !== null) {
      if (daysSinceLastCall <= 30) cadenceStatus = 'good';
      else if (daysSinceLastCall <= 45) cadenceStatus = 'watch';
      else cadenceStatus = 'risk';
    }

    var cadenceViolated = daysSinceLastCall !== null && daysSinceLastCall > 30;
    var cadenceFrequency = normalizeCadenceFrequency(
      normalized.engagement?.cadence_call_frequency || normalized.engagement?.cadence_frequency || null
    );
    var cadenceFrequencyStatus = cadenceFrequency === null ? 'watch' : cadenceFrequency === 'Weekly' || cadenceFrequency === 'Biweekly' ? 'good' : 'risk';
    var recommendedCadenceAction =
      daysSinceLastCall === null
        ? 'Capture cadence baseline and schedule next customer call'
        : daysSinceLastCall > 45
        ? 'Escalate Non-Engaged status and execute recovery plan checklist'
        : daysSinceLastCall > 30
        ? 'Flag as Non-Engaged + Triage and schedule next customer call'
        : 'Maintain cadence; confirm next agenda';

    var suggestedTriageState =
      daysSinceLastCall === null
        ? 'At Risk'
        : daysSinceLastCall > 45
        ? 'Triaged'
        : daysSinceLastCall > 30
        ? 'Non-Engaged'
        : 'Engaged';

    var triageState =
      normalized.triage_state ||
      suggestedTriageState;
    var triageStatus = triageStateStatus(triageState);
    var triageStateAligned =
      daysSinceLastCall === null
        ? triageState === 'At Risk' || triageState === 'Non-Engaged'
        : daysSinceLastCall > 45
        ? triageState === 'Triaged' || triageState === 'Triage In Progress'
        : daysSinceLastCall > 30
        ? triageState === 'Non-Engaged' || triageState === 'Triage In Progress' || triageState === 'Triaged'
        : triageState === 'Engaged' || triageState === 'Re-Engaged';
    var triageRecoveryChecklist = [
      {
        key: 'schedule_next_call',
        label: 'Schedule next customer call',
        data: normalized.triage_recovery_plan.schedule_next_call
      },
      {
        key: 'stakeholders_aligned',
        label: 'Confirm stakeholder alignment',
        data: normalized.triage_recovery_plan.stakeholders_aligned
      },
      {
        key: 'workshop_scheduled',
        label: 'Schedule adoption workshop',
        data: normalized.triage_recovery_plan.workshop_scheduled
      }
    ].map(function (item) {
      return {
        key: item.key,
        label: item.label,
        value: item.data.value === true,
        date: item.data.date || null,
        status: item.data.value === true ? 'good' : 'risk'
      };
    });
    var triageRecoveryRequired = daysSinceLastCall !== null && daysSinceLastCall > 45;
    var triageRecoveryComplete = triageRecoveryChecklist.every(function (item) {
      return item.value === true;
    });
    var triageAutomationCue =
      daysSinceLastCall === null
        ? 'Cadence baseline is missing; capture last call date and set next call.'
        : daysSinceLastCall > 45
        ? 'Cadence exceeded 45 days: require triage recovery plan and weekly leadership updates.'
        : daysSinceLastCall > 30
        ? 'Cadence exceeded 30 days: flag as Non-Engaged and start triage motion.'
        : 'Cadence is inside the one-month expectation.';

    var quarterStart = getQuarterStart(now, timezone);
    var quarterEnd = getQuarterEnd(now, timezone);

    var workshopCountThisQuarter = normalized.workshops.filter(function (workshop) {
      var workshopDate = parse(workshop.date);
      return workshopDate && isSameQuarter(workshopDate, now, timezone);
    }).length;

    var nextWorkshopDate = parse(normalized.next_workshop_date);
    var daysUntilNextWorkshop = nextWorkshopDate ? diffDays(now, nextWorkshopDate, timezone) : null;
    var nextWorkshopToQuarterEnd = nextWorkshopDate ? diffDays(nextWorkshopDate, quarterEnd, timezone) : null;
    var workshopStatus = 'risk';
    if (workshopCountThisQuarter >= 1) {
      workshopStatus = 'good';
    } else if (
      daysUntilNextWorkshop !== null &&
      daysUntilNextWorkshop >= 0 &&
      nextWorkshopToQuarterEnd !== null &&
      nextWorkshopToQuarterEnd >= 0
    ) {
      workshopStatus = 'watch';
    }

    var lastEbrDate = parse(normalized.last_ebr_date);
    var ebrDueDate = parse(normalized.next_ebr_target_date) || (lastEbrDate ? addMonths(lastEbrDate, 12) : null);
    var ebrCountdownDays = ebrDueDate ? diffDays(now, ebrDueDate, timezone) : null;

    var lastQbrDate = parse(normalized.last_qbr_date);
    var nextQbrDate = parse(normalized.next_qbr_date);

    var prepItems = prepChecklist(ebrDueDate, now, timezone);

    var successPlanLastUpdated = parse(normalized.success_plan_last_updated_date);
    var successPlanNextReview = parse(normalized.success_plan_next_review_date) || quarterEnd;
    var successPlanDueBy = quarterEnd;
    var quartersSinceSuccessPlanUpdate = successPlanLastUpdated ? diffQuarters(successPlanLastUpdated, now, timezone) : null;

    var customerValidation = normalizeBooleanDateField(normalized.success_plan_customer_validated);
    var managerValidation = normalizeBooleanDateField(normalized.success_plan_manager_validated);
    var validationsComplete = customerValidation.value && managerValidation.value;
    var updatedThisQuarter = successPlanLastUpdated ? isSameQuarter(successPlanLastUpdated, now, timezone) : false;

    var successPlanStatus = 'in_progress';
    if (quartersSinceSuccessPlanUpdate !== null && quartersSinceSuccessPlanUpdate > 2) {
      successPlanStatus = 'stale';
    } else if (updatedThisQuarter && validationsComplete) {
      successPlanStatus = 'active';
    }

    var renewalDate = parse(normalized.renewal_date);
    var daysToRenewal = renewalDate ? diffDays(now, renewalDate, timezone) : null;
    var isRenewalPriority = daysToRenewal !== null && daysToRenewal <= 90;
    var isRenewalCritical = daysToRenewal !== null && daysToRenewal <= 60;

    var readinessItems = [
      { key: 'stakeholders_confirmed', label: 'Stakeholders confirmed', data: normalized.renewal_readiness.stakeholders_confirmed },
      { key: 'outcomes_validated', label: 'Outcomes validated', data: normalized.renewal_readiness.outcomes_validated },
      { key: 'exec_alignment_done', label: 'Executive alignment done', data: normalized.renewal_readiness.exec_alignment_done },
      { key: 'risk_plan_in_place', label: 'Risk plan in place', data: normalized.renewal_readiness.risk_plan_in_place },
      { key: 'commercial_terms_discussed', label: 'Commercial terms discussed', data: normalized.renewal_readiness.commercial_terms_discussed }
    ].map(function (item) {
      return {
        key: item.key,
        label: item.label,
        value: item.data.value === true,
        date: item.data.date || null,
        status: item.data.value === true ? 'good' : 'watch'
      };
    });

    var renewalOutcomesValidated = normalized.renewal_readiness.outcomes_validated.value === true;

    var expansion = normalized.expansion_motion || {};
    var expansionSentiment = expansion.sentiment_trend || 'Flat';

    var expansionTrendStatus = 'good';
    if (expansionSentiment === 'Down' && isRenewalPriority) {
      expansionTrendStatus = normalized.overall_health === 'Red' ? 'risk' : 'watch';
    }

    var healthStatus = normalized.overall_health || 'Yellow';
    var healthCadenceDays = HEALTH_CADENCE_DAYS[healthStatus] || 14;
    var healthUpdateFrequency = healthStatus === 'Red' ? 'Weekly' : healthStatus === 'Green' ? 'Monthly' : 'Biweekly';

    var lastHealthUpdate = parse(normalized.last_health_update_date);
    var nextHealthUpdateDue = lastHealthUpdate ? addDays(lastHealthUpdate, healthCadenceDays) : addDays(now, healthCadenceDays);
    var healthUpdateOverdueByDays = nextHealthUpdateDue ? diffDays(nextHealthUpdateDue, now, timezone) : null;
    var isHealthUpdateOverdue = healthUpdateOverdueByDays !== null && healthUpdateOverdueByDays > 0;

    var escalated = normalized.escalated === true;
    var escalationSeverity = escalated ? normalized.escalation_severity : null;
    var escalationCadenceDays = escalationSeverity ? ESCALATION_CADENCE_DAYS[escalationSeverity] || 7 : null;

    var recommendedCadenceFrequency = 'Biweekly';
    if (escalated || healthStatus === 'Red' || (daysToRenewal !== null && daysToRenewal <= 90)) {
      recommendedCadenceFrequency = 'Weekly';
    } else if (healthStatus === 'Yellow') {
      recommendedCadenceFrequency = 'Biweekly';
    } else {
      recommendedCadenceFrequency = 'Monthly';
    }

    var lastEscalationUpdate = parse(normalized.last_escalation_update_date);
    var nextEscalationUpdateDue =
      escalated && escalationCadenceDays
        ? addDays(lastEscalationUpdate || now, escalationCadenceDays)
        : null;

    var escalationOverdueByDays = nextEscalationUpdateDue ? diffDays(nextEscalationUpdateDue, now, timezone) : null;
    var isEscalationUpdateOverdue = escalationOverdueByDays !== null && escalationOverdueByDays > 0;

    return {
      timezone: timezone,
      now_iso: toISO(now, timezone),
      current_quarter_label: quarterLabel(now, timezone),
      current_quarter_index: quarterIndex(now, timezone),
      quarter_start: toISO(quarterStart, timezone),
      quarter_end: toISO(quarterEnd, timezone),

      timeToEngage: timeToEngage,
      timeToFirstValue: timeToFirstValue,
      timeToOnboard: timeToOnboard,

      daysSinceLastCall: daysSinceLastCall,
      cadenceStatus: cadenceStatus,
      cadenceViolated: cadenceViolated,
      cadenceFrequency: cadenceFrequency,
      cadenceFrequencyStatus: cadenceFrequencyStatus,
      recommendedCadenceAction: recommendedCadenceAction,
      recommendedCadenceFrequency: recommendedCadenceFrequency,
      triageState: triageState,
      suggestedTriageState: suggestedTriageState,
      triageStateAligned: triageStateAligned,
      triageStatus: triageStatus,
      triageAutomationCue: triageAutomationCue,
      triageRecoveryChecklist: triageRecoveryChecklist,
      triageRecoveryRequired: triageRecoveryRequired,
      triageRecoveryComplete: triageRecoveryComplete,

      workshopCountThisQuarter: workshopCountThisQuarter,
      workshopStatus: workshopStatus,
      nextWorkshopDate: toISO(nextWorkshopDate, timezone),

      ebrDueDate: toISO(ebrDueDate, timezone),
      ebrCountdownDays: ebrCountdownDays,
      ebrPrepChecklist: prepItems,

      successPlanStatus: successPlanStatus,
      successPlanLastUpdated: toISO(successPlanLastUpdated, timezone),
      successPlanNextReview: toISO(successPlanNextReview, timezone),
      successPlanDueBy: toISO(successPlanDueBy, timezone),
      successPlanUpdatedThisQuarter: updatedThisQuarter,
      quartersSinceSuccessPlanUpdate: quartersSinceSuccessPlanUpdate,
      successPlanCustomerValidated: customerValidation,
      successPlanManagerValidated: managerValidation,
      successPlanValidationsComplete: validationsComplete,

      renewalDate: toISO(renewalDate, timezone),
      daysToRenewal: daysToRenewal,
      isRenewalPriority: isRenewalPriority,
      isRenewalCritical: isRenewalCritical,
      renewalReadinessItems: readinessItems,
      renewalOutcomesValidated: renewalOutcomesValidated,

      expansionTrendStatus: expansionTrendStatus,

      healthStatus: healthStatus,
      healthUpdateFrequency: healthUpdateFrequency,
      nextHealthUpdateDue: toISO(nextHealthUpdateDue, timezone),
      isHealthUpdateOverdue: isHealthUpdateOverdue,
      healthUpdateOverdueByDays: healthUpdateOverdueByDays,

      escalated: escalated,
      escalationSeverity: escalationSeverity,
      escalationCadenceDays: escalationCadenceDays,
      nextEscalationUpdateDue: toISO(nextEscalationUpdateDue, timezone),
      isEscalationUpdateOverdue: isEscalationUpdateOverdue,
      escalationOverdueByDays: escalationOverdueByDays,

      lastCadenceCallDate: toISO(lastCadenceCallDate, timezone),
      nextCadenceCallDate: toISO(nextCadenceCallDate, timezone),
      lastEbrDate: toISO(lastEbrDate, timezone),
      lastQbrDate: toISO(lastQbrDate, timezone),
      nextQbrDate: toISO(nextQbrDate, timezone)
    };
  }

  window.DerivedMetrics = {
    DEFAULT_TIMEZONE: DEFAULT_TIMEZONE,
    normalizeAccountData: normalizeAccountData,
    validateAccountData: validateAccountData,
    deriveAccountMetrics: deriveAccountMetrics,
    toStatus: toStatus,
    boolLabel: boolLabel
  };
})();
