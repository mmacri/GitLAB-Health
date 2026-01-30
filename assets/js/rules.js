(function () {
  'use strict';

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const addDays = (date, days) => {
    const base = date ? new Date(date.getTime()) : new Date();
    base.setDate(base.getDate() + days);
    return base;
  };

  const daysBetween = (start, end) => {
    if (!start || !end) return null;
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.round((end - start) / MS_PER_DAY);
  };

  const formatDate = (value) => {
    if (!value) return 'TBD';
    const date = parseDate(value);
    return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
  };

  const buildNextActions = (data, healthScores, digitalScore) => {
    const actions = [];
    const lastUpdated = parseDate(data.meta?.last_updated) || new Date();
    const renewalDate = parseDate(data.customer?.renewal_date);
    const renewalDays = renewalDate ? daysBetween(lastUpdated, renewalDate) : null;
    const seatUtil = data.seats?.purchased ? data.seats.active / data.seats.purchased : 0;
    const useCases = data.adoption?.use_case_scores || [];
    const greenUseCases = useCases.filter((useCase) => useCase.score >= 76).length;
    const objectives = data.success_plan?.objectives || [];
    const onTrack = objectives.filter((objective) => objective.status !== 'at_risk').length;
    const onTrackRatio = objectives.length ? onTrack / objectives.length : 1;
    const earlyWarnings = data.health?.early_warning_flags || [];
    const hasRedWarning = earlyWarnings.some((flag) => flag.severity === 'red');

    if (renewalDays !== null && renewalDays <= 180) {
      actions.push({
        id: 'renewal-prep',
        urgency: renewalDays <= 90 ? 'urgent' : 'important',
        title: 'Begin renewal readiness plan',
        rationale: `Renewal in ${renewalDays} days`,
        steps: [
          'Confirm renewal success criteria with sponsor',
          'Review success plan gaps and mitigation plan',
          'Schedule executive alignment checkpoint'
        ],
        owner: data.customer?.csm || 'CSM',
        due_date: formatDate(addDays(lastUpdated, renewalDays <= 90 ? 7 : 21)),
        link: 'https://handbook.gitlab.com/handbook/customer-success/csm/ebr/'
      });
    }

    if (seatUtil < 0.5) {
      actions.push({
        id: 'license-activation',
        urgency: 'urgent',
        title: 'Drive license activation campaign',
        rationale: 'Seat utilization below 50%',
        steps: ['Run user adoption audit', 'Launch activation campaign', 'Track activation weekly'],
        owner: data.customer?.csm || 'CSM',
        due_date: formatDate(addDays(lastUpdated, 14)),
        link: 'https://handbook.gitlab.com/handbook/customer-success/customer-health-scoring/'
      });
    } else if (seatUtil < 0.8) {
      actions.push({
        id: 'license-activation-boost',
        urgency: 'important',
        title: 'Accelerate user activation',
        rationale: `Utilization at ${(seatUtil * 100).toFixed(0)}%`,
        steps: ['Identify teams not yet onboarded', 'Schedule enablement sessions'],
        owner: data.customer?.csm || 'CSM',
        due_date: formatDate(addDays(lastUpdated, 21)),
        link: 'https://handbook.gitlab.com/handbook/customer-success/csm/onboarding/'
      });
    }

    if (greenUseCases < (data.adoption?.platform_adoption_target || 3)) {
      actions.push({
        id: 'platform-adoption',
        urgency: 'important',
        title: 'Move another use case to green',
        rationale: `${greenUseCases} of ${useCases.length} use cases green`,
        steps: ['Focus on lowest scoring use case', 'Run targeted workshop', 'Measure adoption weekly'],
        owner: data.customer?.tam || 'TAM',
        due_date: formatDate(addDays(lastUpdated, 28)),
        link: 'https://handbook.gitlab.com/handbook/customer-success/playbooks/'
      });
    }

    if (hasRedWarning || healthScores.overall <= 50) {
      actions.push({
        id: 'health-triage',
        urgency: 'urgent',
        title: 'Run health score triage',
        rationale: 'Critical warning flag or health score red',
        steps: ['Review drivers and risks', 'Assign mitigation owners', 'Escalate blockers'],
        owner: data.customer?.csm || 'CSM',
        due_date: formatDate(addDays(lastUpdated, 7)),
        link: 'https://handbook.gitlab.com/handbook/customer-success/csm/health-score-triage/'
      });
    }

    if (onTrackRatio < 0.6) {
      actions.push({
        id: 'success-plan-unblock',
        urgency: 'urgent',
        title: 'Unblock at-risk success plan objectives',
        rationale: `${onTrack} of ${objectives.length} objectives on track`,
        steps: ['Review blockers with owners', 'Update success plan milestones', 'Escalate critical dependencies'],
        owner: data.customer?.csm || 'CSM',
        due_date: formatDate(addDays(lastUpdated, 10)),
        link: 'https://handbook.gitlab.com/handbook/customer-success/csm/success-plans/'
      });
    }

    if (digitalScore < 70) {
      actions.push({
        id: 'digital-engagement',
        urgency: 'important',
        title: 'Increase digital touchpoints',
        rationale: `Digital health ${digitalScore}`,
        steps: ['Boost enablement comms', 'Promote self-service resources'],
        owner: 'Customer marketing',
        due_date: formatDate(addDays(lastUpdated, 14)),
        link: 'https://handbook.gitlab.com/handbook/customer-success/csm/cadence-calls/'
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: 'no-urgent-actions',
        urgency: 'opportunity',
        title: '✅ No urgent actions. Continue current plan.',
        rationale: 'Health, adoption, and outcomes are on track',
        steps: ['Keep cadence calendar updated', 'Share progress in next EBR'],
        owner: data.customer?.csm || 'CSM',
        due_date: formatDate(addDays(lastUpdated, 30))
      });
    }

    return actions;
  };

  window.Rules = { buildNextActions };
})();
