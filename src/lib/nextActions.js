(function () {
  'use strict';

  var DateUtils = window.DateUtils || {};

  function parse(value) {
    if (DateUtils.parseISO) return DateUtils.parseISO(value);
    if (!value) return null;
    var parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function diffDays(start, end, timezone) {
    if (DateUtils.diffInDays) return DateUtils.diffInDays(start, end, timezone);
    if (!start || !end) return null;
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (24 * 60 * 60 * 1000));
  }

  function addDays(date, days) {
    if (DateUtils.addDays) return DateUtils.addDays(date, days);
    var parsed = parse(date) || new Date();
    parsed.setDate(parsed.getDate() + Number(days || 0));
    return parsed;
  }

  function toISODate(date, timezone) {
    if (DateUtils.toISODate) return DateUtils.toISODate(date, timezone);
    var parsed = parse(date);
    if (!parsed) return null;
    return parsed.toISOString().slice(0, 10);
  }

  function statusFromDaysUntil(daysUntil) {
    if (daysUntil === null || daysUntil === undefined) return 'due_soon';
    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 14) return 'due_soon';
    return 'upcoming';
  }

  function statusLabel(status) {
    if (status === 'overdue') return 'Overdue';
    if (status === 'due_soon') return 'Due soon';
    return 'Upcoming';
  }

  function statusPriority(status) {
    if (status === 'overdue') return 300;
    if (status === 'due_soon') return 200;
    return 100;
  }

  function addAction(list, action) {
    if (!action || !action.id || !action.title) return;
    if (!action.status) action.status = 'upcoming';
    action.statusLabel = statusLabel(action.status);
    action.priority = statusPriority(action.status) + Number(action.rank || 0);
    list.push(action);
  }

  function buildNextActions(account, metrics, options) {
    var opts = options || {};
    var now = parse(opts.now) || new Date();
    var timezone = metrics?.timezone || account?.timezone || 'America/Los_Angeles';
    var owner = account?.customer?.csm || account?.renewal_owner || 'CSM';
    var actions = [];

    var daysSinceCall = metrics?.daysSinceLastCall;
    if (daysSinceCall === null || daysSinceCall === undefined) {
      addAction(actions, {
        id: 'cadence-baseline-missing',
        title: 'Capture cadence baseline',
        status: 'due_soon',
        reason: 'last_cadence_call_date is missing. Add the latest customer call and schedule the next one.',
        dueDate: toISODate(addDays(now, 3), timezone),
        jumpTo: '#cadence-tracker',
        owner: owner,
        audience: 'internal',
        rank: 75
      });
    } else if (daysSinceCall > 30) {
      addAction(actions, {
        id: 'cadence-overdue',
        title: daysSinceCall > 45 ? 'Execute non-engaged recovery plan' : 'Flag non-engaged and triage cadence',
        status: daysSinceCall > 45 ? 'overdue' : 'due_soon',
        reason:
          daysSinceCall > 45
            ? daysSinceCall +
              ' days since last call. AMER expectation is never more than 30 days and requires triage recovery.'
            : daysSinceCall + ' days since last call. Flag as Non-Engaged and schedule the next call immediately.',
        dueDate: metrics?.nextCadenceCallDate || toISODate(addDays(now, 1), timezone),
        jumpTo: '#cadence-tracker',
        owner: owner,
        audience: 'internal',
        rank: 95
      });
    }

    if (metrics?.nextHealthUpdateDue) {
      var healthDueIn = diffDays(now, metrics.nextHealthUpdateDue, timezone);
      var healthStatus = statusFromDaysUntil(healthDueIn);
      if (healthStatus !== 'upcoming' || (metrics?.healthStatus || '') !== 'Green') {
        addAction(actions, {
          id: 'health-update-cadence',
          title: 'Update account health cadence',
          status: healthStatus,
          reason:
            healthStatus === 'overdue'
              ? 'Health update is overdue. ' +
                Math.abs(healthDueIn) +
                ' day(s) past due based on ' +
                (metrics?.healthUpdateFrequency || 'Biweekly') +
                ' cadence.'
              : 'Next health update due in ' +
                healthDueIn +
                ' day(s) under ' +
                (metrics?.healthUpdateFrequency || 'Biweekly') +
                ' cadence.',
          dueDate: metrics.nextHealthUpdateDue,
          jumpTo: '#health-updates',
          owner: owner,
          audience: 'both',
          rank: 70
        });
      }
    }

    if (metrics?.escalated && metrics?.nextEscalationUpdateDue) {
      var escalationDueIn = diffDays(now, metrics.nextEscalationUpdateDue, timezone);
      var escalationStatus = statusFromDaysUntil(escalationDueIn);
      if (escalationStatus !== 'upcoming') {
        addAction(actions, {
          id: 'escalation-update-cadence',
          title: 'Post escalation update',
          status: escalationStatus,
          reason:
            'Escalation ' +
            (metrics?.escalationSeverity || 'P3') +
            ' update is ' +
            (escalationStatus === 'overdue'
              ? Math.abs(escalationDueIn) + ' day(s) overdue.'
              : 'due in ' + escalationDueIn + ' day(s).'),
          dueDate: metrics.nextEscalationUpdateDue,
          jumpTo: '#health-updates',
          owner: owner,
          audience: 'internal',
          rank: 92
        });
      }
    }

    if ((metrics?.workshopCountThisQuarter || 0) < 1) {
      addAction(actions, {
        id: 'workshop-quarterly-motion',
        title: 'Close quarterly workshop gap',
        status: metrics?.workshopStatus === 'watch' ? 'due_soon' : 'overdue',
        reason:
          metrics?.workshopStatus === 'watch'
            ? 'No workshop delivered this quarter yet; one is scheduled before quarter end.'
            : 'No workshop delivered this quarter and none scheduled. AMER expectation is at least one workshop per quarter.',
        dueDate: metrics?.nextWorkshopDate || metrics?.quarter_end || toISODate(addDays(now, 14), timezone),
        jumpTo: '#workshop-tracker',
        owner: owner,
        audience: 'both',
        rank: 80
      });
    }

    if (metrics?.ebrPrepChecklist && metrics.ebrPrepChecklist.length) {
      var prepItem = metrics.ebrPrepChecklist.find(function (item) {
        return item.status !== 'good';
      });
      if (prepItem) {
        addAction(actions, {
          id: 'ebr-prep-window',
          title: 'Advance EBR prep roadmap',
          status: prepItem.status === 'risk' ? 'overdue' : prepItem.due_in_days <= 14 ? 'due_soon' : 'upcoming',
          reason: prepItem.label + ' Window due ' + (prepItem.due_in_days < 0 ? 'now/past due.' : 'in ' + prepItem.due_in_days + ' day(s).'),
          dueDate: prepItem.due_date,
          jumpTo: '#ebr-roadmap',
          owner: owner,
          audience: 'both',
          rank: 65
        });
      }
    } else if (!metrics?.lastEbrDate) {
      addAction(actions, {
        id: 'ebr-baseline-missing',
        title: 'Set annual EBR roadmap',
        status: 'due_soon',
        reason: 'last_ebr_date is missing. Log the last EBR and target date to track annual expectation.',
        dueDate: toISODate(addDays(now, 14), timezone),
        jumpTo: '#ebr-roadmap',
        owner: owner,
        audience: 'both',
        rank: 60
      });
    }

    var validationsComplete = metrics?.successPlanValidationsComplete === true;
    var successUpdated = metrics?.successPlanUpdatedThisQuarter === true;
    if (!successUpdated || !validationsComplete) {
      addAction(actions, {
        id: 'success-plan-quarterly-update',
        title: 'Update and validate success plan',
        status: metrics?.quartersSinceSuccessPlanUpdate > 2 ? 'overdue' : 'due_soon',
        reason:
          metrics?.quartersSinceSuccessPlanUpdate > 2
            ? 'Success plan is more than two quarters old and must be refreshed with validation.'
            : !successUpdated
            ? 'Success plan is not updated this quarter.'
            : 'Success plan is updated, but customer and manager validations are incomplete.',
        dueDate: metrics?.successPlanDueBy || metrics?.successPlanNextReview || metrics?.quarter_end,
        jumpTo: '#success-plan',
        owner: owner,
        audience: 'both',
        rank: 88
      });
    }

    if (metrics?.isRenewalPriority) {
      var missingReadiness = (metrics?.renewalReadinessItems || []).filter(function (item) {
        return item.value !== true;
      });
      if (missingReadiness.length) {
        addAction(actions, {
          id: 'renewal-readiness-gaps',
          title: 'Close renewal readiness gaps',
          status: metrics?.isRenewalCritical ? 'overdue' : 'due_soon',
          reason:
            'Renewal in ' +
            (metrics?.daysToRenewal ?? 'unknown') +
            ' day(s) with ' +
            missingReadiness.length +
            ' readiness item(s) pending: ' +
            missingReadiness
              .slice(0, 2)
              .map(function (item) {
                return item.label;
              })
              .join(', ') +
            '.',
          dueDate: metrics?.renewalDate,
          jumpTo: '#expand-renew',
          owner: owner,
          audience: 'both',
          rank: 90
        });
      }
    }

    if (!actions.length) {
      addAction(actions, {
        id: 'maintain-operating-rhythm',
        title: 'Maintain operating rhythm',
        status: 'upcoming',
        reason: 'No overdue AMER operating motions detected. Continue cadence, workshop, and success plan execution.',
        dueDate: toISODate(addDays(now, 14), timezone),
        jumpTo: '#today-console',
        owner: owner,
        audience: 'both',
        rank: 10
      });
    }

    return actions.sort(function (left, right) {
      return (right.priority || 0) - (left.priority || 0);
    });
  }

  window.NextActions = {
    buildNextActions: buildNextActions
  };
})();
