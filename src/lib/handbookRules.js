(function () {
  'use strict';

  var DateUtils = window.DateUtils || {};
  var DerivedMetrics = window.DerivedMetrics || {};
  var DEFAULT_TIMEZONE = DateUtils.DEFAULT_TIMEZONE || 'America/Los_Angeles';

  function parse(value) {
    return DateUtils.parseISO ? DateUtils.parseISO(value) : value ? new Date(value) : null;
  }

  function diffDays(start, end, timezone) {
    return DateUtils.diffInDays ? DateUtils.diffInDays(start, end, timezone) : null;
  }

  function quarterLabel(date, timezone) {
    return DateUtils.quarterLabel ? DateUtils.quarterLabel(date, timezone) : 'Unknown quarter';
  }

  function toStatusLabel(status) {
    if (status === 'good') return 'Green';
    if (status === 'risk') return 'Red';
    return 'Yellow';
  }

  function maxStatus(a, b) {
    var rank = { good: 0, watch: 1, risk: 2 };
    return rank[a] >= rank[b] ? a : b;
  }

  function missingFieldReason(fields) {
    return 'Missing required field(s): ' + fields.join(', ') + '.';
  }

  function evaluateMilestone(account, options) {
    var now = options.now;
    var timezone = options.timezone;
    var startDate = parse(account.start_date);
    var dateValue = parse(account[options.field]);

    if (!startDate) {
      return {
        status: 'watch',
        reason: missingFieldReason(['start_date']),
        days: null
      };
    }

    if (!dateValue) {
      return {
        status: 'watch',
        reason: missingFieldReason([options.field]),
        days: null
      };
    }

    var days = diffDays(startDate, dateValue, timezone);
    if (days === null || days < 0) {
      return {
        status: 'watch',
        reason: 'Invalid date sequence between start_date and ' + options.field + '.',
        days: days
      };
    }

    if (days <= options.greenMax) {
      return {
        status: 'good',
        reason: days + ' days from start date; within <= ' + options.greenMax + ' days.',
        days: days
      };
    }

    if (days <= options.yellowMax) {
      return {
        status: 'watch',
        reason:
          days +
          ' days from start date; inside grace window (' +
          (options.greenMax + 1) +
          '-' +
          options.yellowMax +
          ' days).',
        days: days
      };
    }

    return {
      status: 'risk',
      reason: days + ' days from start date; exceeds ' + options.yellowMax + '-day threshold.',
      days: days
    };
  }

  function evaluateCadence(account, timezone, now) {
    var lastCall = parse(account.last_cadence_call_date);
    if (!lastCall) {
      return {
        status: 'watch',
        reason: missingFieldReason(['last_cadence_call_date']),
        daysSince: null
      };
    }

    var daysSince = diffDays(lastCall, now, timezone);
    if (daysSince === null || daysSince < 0) {
      return {
        status: 'watch',
        reason: 'Invalid last_cadence_call_date value.',
        daysSince: daysSince
      };
    }

    if (daysSince <= 30) {
      return {
        status: 'good',
        reason: daysSince + ' days since last call; within 30-day expectation.',
        daysSince: daysSince
      };
    }

    if (daysSince <= 45) {
      return {
        status: 'watch',
        reason: daysSince + ' days since last call; exceeds 30-day target. Flag as Non-Engaged + Triage.',
        daysSince: daysSince
      };
    }

    return {
      status: 'risk',
      reason: daysSince + ' days since last call; cadence violation (>45 days). Recovery plan checklist required.',
      daysSince: daysSince
    };
  }

  function evaluateCadenceFrequency(derived) {
    var frequency = derived?.cadenceFrequency;
    if (!frequency) {
      return {
        status: 'watch',
        reason: missingFieldReason(['engagement.cadence_call_frequency']),
        frequency: null
      };
    }

    if (frequency === 'Weekly' || frequency === 'Biweekly') {
      return {
        status: 'good',
        reason: 'Cadence frequency is ' + frequency + '; matches weekly/biweekly expectation.',
        frequency: frequency
      };
    }

    return {
      status: 'risk',
      reason: 'Cadence frequency is ' + frequency + '; outside weekly/biweekly expectation.',
      frequency: frequency
    };
  }

  function evaluateTriageState(derived) {
    var state = derived?.triageState;
    if (!state) {
      return {
        status: 'watch',
        reason: missingFieldReason(['triage_state']),
        state: null
      };
    }

    if (derived?.triageStateAligned) {
      return {
        status: 'good',
        reason: 'Engagement state is ' + state + ' and aligned to cadence behavior.',
        state: state
      };
    }

    var suggested = derived?.suggestedTriageState || 'At Risk';
    return {
      status: derived?.daysSinceLastCall > 45 ? 'risk' : 'watch',
      reason: 'Engagement state is ' + state + '; expected ' + suggested + ' based on cadence thresholds.',
      state: state
    };
  }

  function evaluateWorkshop(derived) {
    var count = derived?.workshopCountThisQuarter;
    if (count === null || count === undefined) {
      return {
        status: 'watch',
        reason: missingFieldReason(['workshops']),
        count: null
      };
    }

    if (count >= 1) {
      return {
        status: 'good',
        reason: count + ' workshop(s) delivered this quarter; meets quarterly expectation.',
        count: count
      };
    }

    if (derived?.workshopStatus === 'watch') {
      return {
        status: 'watch',
        reason: 'No workshop delivered yet this quarter, but one is scheduled before quarter end.',
        count: count
      };
    }

    return {
      status: 'risk',
      reason: 'No workshop delivered or scheduled this quarter.',
      count: count
    };
  }

  function evaluateRiskUpdateCadence(derived) {
    if (!derived) {
      return {
        status: 'watch',
        reason: 'Risk update cadence unavailable because derived metrics are missing.'
      };
    }

    if (derived.isHealthUpdateOverdue) {
      return {
        status: 'risk',
        reason:
          'Health update cadence missed by ' +
          Math.abs(derived.healthUpdateOverdueByDays || 0) +
          ' day(s); next due was ' +
          (derived.nextHealthUpdateDue || 'unknown') +
          '.'
      };
    }

    if (derived.escalated && derived.isEscalationUpdateOverdue) {
      return {
        status: 'risk',
        reason:
          'Escalation cadence missed by ' +
          Math.abs(derived.escalationOverdueByDays || 0) +
          ' day(s); next due was ' +
          (derived.nextEscalationUpdateDue || 'unknown') +
          '.'
      };
    }

    if (derived.escalated) {
      return {
        status: 'good',
        reason:
          'Escalation cadence is current (' +
          (derived.escalationSeverity || 'P3') +
          ' updates every ' +
          (derived.escalationCadenceDays || 7) +
          ' day(s)).'
      };
    }

    return {
      status: 'good',
      reason:
        'Health update cadence is current (' +
        (derived.healthUpdateFrequency || 'Biweekly') +
        ', next due ' +
        (derived.nextHealthUpdateDue || 'unknown') +
        ').'
    };
  }

  function evaluateEbr(account, timezone, now) {
    var lastEbr = parse(account.last_ebr_date);
    if (!lastEbr) {
      return {
        status: 'watch',
        reason: missingFieldReason(['last_ebr_date']),
        daysSince: null
      };
    }

    var daysSince = diffDays(lastEbr, now, timezone);
    if (daysSince === null || daysSince < 0) {
      return {
        status: 'watch',
        reason: 'Invalid last_ebr_date value.',
        daysSince: daysSince
      };
    }

    if (daysSince <= 365) {
      return {
        status: 'good',
        reason: daysSince + ' days since last EBR; within annual expectation.',
        daysSince: daysSince
      };
    }

    if (daysSince <= 456) {
      return {
        status: 'watch',
        reason: daysSince + ' days since last EBR; in 12-15 month grace window.',
        daysSince: daysSince
      };
    }

    return {
      status: 'risk',
      reason: daysSince + ' days since last EBR; beyond 15 months.',
      daysSince: daysSince
    };
  }

  function evaluateSuccessPlan(account, timezone, now, derivedMetrics) {
    var lastUpdated = parse(account.success_plan_last_updated_date);
    var customerValidated = account.success_plan_customer_validated || {};
    var managerValidated = account.success_plan_manager_validated || {};

    if (!lastUpdated) {
      return {
        status: 'watch',
        reason: missingFieldReason(['success_plan_last_updated_date']),
        quarter: null
      };
    }

    var quartersSince =
      derivedMetrics && typeof derivedMetrics.quartersSinceSuccessPlanUpdate === 'number'
        ? derivedMetrics.quartersSinceSuccessPlanUpdate
        : DateUtils.diffInQuarters
        ? DateUtils.diffInQuarters(lastUpdated, now, timezone)
        : null;

    var updatedThisQuarter = DateUtils.isSameQuarter ? DateUtils.isSameQuarter(lastUpdated, now, timezone) : false;

    var validationsMissing =
      customerValidated.value !== true || managerValidated.value !== true || !customerValidated.date || !managerValidated.date;

    var label = quarterLabel(lastUpdated, timezone);

    if (quartersSince !== null && quartersSince > 2) {
      return {
        status: 'risk',
        reason: 'Last success plan update was ' + label + '; more than 2 quarters old.',
        quarter: label
      };
    }

    if (!updatedThisQuarter) {
      return {
        status: 'watch',
        reason: 'Last success plan update was ' + label + '; update required this quarter.',
        quarter: label
      };
    }

    if (validationsMissing) {
      return {
        status: 'watch',
        reason: 'Success plan updated this quarter, but customer and manager validations are incomplete.',
        quarter: label
      };
    }

    return {
      status: 'good',
      reason: 'Success plan updated this quarter and validated by customer and manager.',
      quarter: label
    };
  }

  function evaluateHandbookCompliance(accountData, options) {
    var opts = options || {};
    var now = parse(opts.now) || new Date();
    var timezone = accountData.timezone || opts.timezone || DEFAULT_TIMEZONE;
    var derived =
      opts.derivedMetrics ||
      (DerivedMetrics.deriveAccountMetrics ? DerivedMetrics.deriveAccountMetrics(accountData, { now: now }) : null);

    var checks = [];

    var engage = evaluateMilestone(accountData, {
      field: 'first_engage_date',
      greenMax: 14,
      yellowMax: 21,
      timezone: timezone,
      now: now
    });
    checks.push({
      id: 'first-engage',
      name: 'First Engage <= 14 days',
      status: engage.status,
      statusLabel: toStatusLabel(engage.status),
      reason: engage.reason,
      anchor: '#journey'
    });

    var firstValue = evaluateMilestone(accountData, {
      field: 'first_value_date',
      greenMax: 30,
      yellowMax: 45,
      timezone: timezone,
      now: now
    });
    checks.push({
      id: 'first-value',
      name: 'First Value <= 30 days',
      status: firstValue.status,
      statusLabel: toStatusLabel(firstValue.status),
      reason: firstValue.reason,
      anchor: '#journey'
    });

    var onboard = evaluateMilestone(accountData, {
      field: 'onboarding_complete_date',
      greenMax: 45,
      yellowMax: 60,
      timezone: timezone,
      now: now
    });
    checks.push({
      id: 'onboarding-complete',
      name: 'Onboarding Complete <= 45 days',
      status: onboard.status,
      statusLabel: toStatusLabel(onboard.status),
      reason: onboard.reason,
      anchor: '#journey'
    });

    var cadence = evaluateCadence(accountData, timezone, now);
    checks.push({
      id: 'cadence-call',
      name: 'Cadence Call within last 30 days',
      status: cadence.status,
      statusLabel: toStatusLabel(cadence.status),
      reason: cadence.reason,
      anchor: '#engagement'
    });

    var cadenceFrequency = evaluateCadenceFrequency(derived);
    checks.push({
      id: 'cadence-frequency',
      name: 'Cadence Frequency weekly/biweekly',
      status: cadenceFrequency.status,
      statusLabel: toStatusLabel(cadenceFrequency.status),
      reason: cadenceFrequency.reason,
      anchor: '#engagement'
    });

    var triage = evaluateTriageState(derived);
    checks.push({
      id: 'triage-state',
      name: 'Non-Engaged and Triage State aligned',
      status: triage.status,
      statusLabel: toStatusLabel(triage.status),
      reason: triage.reason,
      anchor: '#cadence-tracker'
    });

    var workshop = evaluateWorkshop(derived);
    checks.push({
      id: 'workshop-quarter',
      name: 'Workshop delivered this quarter',
      status: workshop.status,
      statusLabel: toStatusLabel(workshop.status),
      reason: workshop.reason,
      anchor: '#workshop-tracker'
    });

    var ebr = evaluateEbr(accountData, timezone, now);
    var ebrRoadmapDate = derived?.ebrDueDate || null;
    var ebrStatus = ebr.status;
    var ebrReason = ebr.reason;
    if (!ebrRoadmapDate) {
      if (ebrStatus === 'good') ebrStatus = 'watch';
      ebrReason += ' Roadmap target date is missing.';
    } else {
      ebrReason += ' Roadmap target: ' + ebrRoadmapDate + '.';
    }
    checks.push({
      id: 'ebr-annual',
      name: 'EBR within last 12 months',
      status: ebrStatus,
      statusLabel: toStatusLabel(ebrStatus),
      reason: ebrReason,
      anchor: '#engagement'
    });

    var successPlan = evaluateSuccessPlan(accountData, timezone, now, derived);
    checks.push({
      id: 'success-plan-quarter',
      name: 'Success Plan updated this quarter + validated',
      status: successPlan.status,
      statusLabel: toStatusLabel(successPlan.status),
      reason: successPlan.reason,
      anchor: '#success-plan'
    });

    var riskCadence = evaluateRiskUpdateCadence(derived);
    checks.push({
      id: 'risk-update-cadence',
      name: 'Risk update cadence by health and escalation',
      status: riskCadence.status,
      statusLabel: toStatusLabel(riskCadence.status),
      reason: riskCadence.reason,
      anchor: '#health-updates'
    });

    var overallStatus = checks.reduce(function (status, check) {
      return maxStatus(status, check.status);
    }, 'good');

    var alerts = [];
    if (derived && derived.isHealthUpdateOverdue) {
      alerts.push({
        id: 'health-update-overdue',
        status: 'risk',
        label: 'Health update overdue',
        reason:
          'Health update overdue by ' +
          Math.abs(derived.healthUpdateOverdueByDays || 0) +
          ' day(s). Next due was ' +
          (derived.nextHealthUpdateDue || 'unknown') +
          '.',
        anchor: '#health-risk'
      });
      overallStatus = maxStatus(overallStatus, 'risk');
    }

    if (derived && derived.escalated && derived.isEscalationUpdateOverdue) {
      alerts.push({
        id: 'escalation-update-overdue',
        status: 'risk',
        label: 'Escalation update overdue',
        reason:
          'Escalation update overdue by ' +
          Math.abs(derived.escalationOverdueByDays || 0) +
          ' day(s). Next due was ' +
          (derived.nextEscalationUpdateDue || 'unknown') +
          '.',
        anchor: '#health-risk'
      });
      overallStatus = maxStatus(overallStatus, 'risk');
    }

    return {
      checks: checks,
      alerts: alerts,
      overallStatus: overallStatus,
      overallStatusLabel: toStatusLabel(overallStatus)
    };
  }

  window.HandbookRules = {
    evaluateHandbookCompliance: evaluateHandbookCompliance
  };
})();
