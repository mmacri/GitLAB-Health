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
        reason: daysSince + ' days since last call; exceeds 30-day target but inside grace window.',
        daysSince: daysSince
      };
    }

    return {
      status: 'risk',
      reason: daysSince + ' days since last call; cadence violation (>45 days).',
      daysSince: daysSince
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

    var ebr = evaluateEbr(accountData, timezone, now);
    checks.push({
      id: 'ebr-annual',
      name: 'EBR within last 12 months',
      status: ebr.status,
      statusLabel: toStatusLabel(ebr.status),
      reason: ebr.reason,
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
