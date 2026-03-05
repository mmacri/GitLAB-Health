import { barChartSvg } from '../../lib/charts.js';
import { formatDate } from '../../lib/date.js';
import { CAPACITY_THRESHOLDS, MANAGER_CONFIG } from '../../config/managerConfig.js';
import { DRI_INITIATIVES } from '../../data/driInitiatives.js';
import { statusChip } from '../statusChip.js';

const toneFromCapacity = (count) => {
  const value = Number(count || 0);
  if (value <= CAPACITY_THRESHOLDS.green.max) return { label: 'Available', tone: 'good' };
  if (value <= CAPACITY_THRESHOLDS.yellow.max) return { label: 'At Capacity', tone: 'warn' };
  if (value >= CAPACITY_THRESHOLDS.red.min) return { label: 'Overloaded', tone: 'risk' };
  return { label: 'Available', tone: 'good' };
};

const capacityChip = (count) => {
  const state = toneFromCapacity(count);
  return statusChip({ label: state.label, tone: state.tone });
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const getPeriodWindowDays = (period) => {
  if (period === 'week') return 7;
  if (period === 'quarter') return 90;
  return 30;
};

const normalizeEngagementBucket = (entry = {}) => {
  const raw = String(entry.engagementType || entry.type || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (raw.includes('WEBINAR')) return 'WEBINAR';
  if (raw.includes('OFFICE') || raw.includes('HOURS')) return 'OFFICE_HOURS';
  if (raw.includes('LAB')) return 'HANDS_ON_LAB';
  if (raw.includes('ON_DEMAND') || raw.includes('ASYNC') || raw.includes('REQUEST')) return 'ON_DEMAND';
  if (raw === 'HANDS_ON_LAB' || raw === 'OFFICE_HOURS' || raw === 'WEBINAR' || raw === 'ON_DEMAND') return raw;
  return 'ON_DEMAND';
};

const aggregateEngagements = (workspace, period = 'week', now = new Date()) => {
  const cutoff = now.getTime() - getPeriodWindowDays(period) * 24 * 60 * 60 * 1000;
  const buckets = {
    WEBINAR: 0,
    OFFICE_HOURS: 0,
    HANDS_ON_LAB: 0,
    ON_DEMAND: 0
  };

  Object.values(workspace?.engagements || {}).forEach((entries) => {
    (entries || []).forEach((entry) => {
      const ts = new Date(entry.ts || 0).getTime();
      if (!Number.isFinite(ts) || ts < cutoff) return;
      const type = normalizeEngagementBucket(entry);
      if (buckets[type] !== undefined) buckets[type] += 1;
    });
  });

  return buckets;
};

const buildTeamCoverageRows = (workspace) => {
  const members = workspace?.team?.cseMembers || [];
  return members.map((member) => {
    const accountIds = Array.isArray(member.accounts) ? member.accounts : [];
    const engagementCount = accountIds.reduce((sum, accountId) => {
      const entries = workspace?.engagements?.[accountId] || [];
      const open = entries.filter((entry) => ['scheduled', 'in_progress', 'requested'].includes(normalize(entry.engagementStatus)));
      return sum + open.length;
    }, 0);
    return {
      name: member.name,
      engagementsToday: engagementCount,
      accountsInQueue: accountIds.length
    };
  });
};

const managerAttentionRows = (workspace, portfolioRows = [], customerSafe = false) =>
  (portfolioRows || [])
    .filter((row) => {
      const health = normalize(row.health);
      const renewalSoon = Number(row.renewalDays ?? 999) <= MANAGER_CONFIG.renewalWindowDays;
      const escalation = !customerSafe && Boolean(row.customer?.escalationFlag);
      return health === 'red' || escalation || (renewalSoon && health !== 'green');
    })
    .slice(0, 10)
    .map((row) => {
      const issueType = row.customer?.escalationFlag
        ? 'Escalation'
        : normalize(row.health) === 'red'
          ? 'Red Health'
          : 'Renewal Window';
      const assigned = (workspace?.team?.cseMembers || []).find((member) =>
        Array.isArray(member.accounts) && member.accounts.includes(row.customer.id)
      );
      return {
        customerId: row.customer.id,
        account: row.customer.name,
        issueType,
        renewalDays: row.renewalDays,
        assignedCse: assigned?.name || 'Unassigned'
      };
    });

const driRows = () => DRI_INITIATIVES;

export const createManagerOverviewPanel = ({
  workspace,
      portfolioRows,
      maskField,
      customerSafe,
      onOpenCustomer,
      initialPeriod = 'week'
}) => {
  let period = initialPeriod;
  const section = document.createElement('section');
  section.className = 'manager-overview-panel card';
  section.setAttribute('aria-label', 'Manager overview panel');

  const render = () => {
    const teamRows = buildTeamCoverageRows(workspace);
    const engagement = aggregateEngagements(workspace, period, new Date());
    const dri = driRows();
    const attention = managerAttentionRows(workspace, portfolioRows, customerSafe);

    section.innerHTML = `
      <header class="metric-head">
        <h2>Manager Overview Panel</h2>
        ${statusChip({ label: 'Manager', tone: 'neutral' })}
      </header>

      <div class="manager-overview-grid">
        <article class="card compact-card">
          <h3>Team Coverage Map</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>CSE Name</th><th>Active Engagements Today</th><th>Accounts in Queue</th><th>Capacity Status</th></tr>
              </thead>
              <tbody>
                ${
                  teamRows.length
                    ? teamRows
                        .map(
                          (row) => `
                      <tr>
                        <td>${row.name}</td>
                        <td>${row.engagementsToday}</td>
                        <td>${row.accountsInQueue}</td>
                        <td>${capacityChip(row.engagementsToday)}</td>
                      </tr>
                    `
                        )
                        .join('')
                    : '<tr><td colspan="4">No CSE team members configured.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </article>

        <article class="card compact-card">
          <div class="metric-head">
            <h3>Engagement Volume by Type</h3>
            <label>
              <span class="kicker">Period</span>
              <select data-manager-period>
                <option value="week" ${period === 'week' ? 'selected' : ''}>This Week</option>
                <option value="month" ${period === 'month' ? 'selected' : ''}>This Month</option>
                <option value="quarter" ${period === 'quarter' ? 'selected' : ''}>This Quarter</option>
              </select>
            </label>
          </div>
          <div class="chart-wrap">
            ${barChartSvg([
              { label: 'Webinars', value: engagement.WEBINAR, color: '#8b5cf6' },
              { label: 'Office Hours', value: engagement.OFFICE_HOURS, color: '#06b6d4' },
              { label: 'Hands-On Labs', value: engagement.HANDS_ON_LAB, color: '#f97316' },
              { label: 'On-Demand', value: engagement.ON_DEMAND, color: '#10b981' }
            ])}
          </div>
        </article>

        <article class="card compact-card">
          <h3>DRI Ownership Tracker</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Initiative</th><th>DRI</th><th>Status</th><th>Due</th></tr>
              </thead>
              <tbody>
                ${
                  dri
                    .map(
                      (row) => `
                    <tr>
                      <td>${row.initiative}</td>
                      <td>${row.dri}</td>
                      <td>${statusChip({
                        label: row.status,
                        tone: normalize(row.status) === 'on track' ? 'good' : normalize(row.status) === 'blocked' ? 'risk' : 'warn'
                      })}</td>
                      <td>${formatDate(row.due)}</td>
                    </tr>
                  `
                    )
                    .join('')
                }
              </tbody>
            </table>
          </div>
        </article>

        <article class="card compact-card">
          <h3>Accounts Needing Manager Attention</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Account</th><th>Issue Type</th><th>Days Until Renewal</th><th>Assigned CSE</th></tr>
              </thead>
              <tbody>
                ${
                  attention.length
                    ? attention
                        .map(
                          (row) => `
                      <tr>
                        <td><a href="#" data-manager-open="${row.customerId}">${
                          maskField?.('accountName', row.account) || row.account
                        }</a></td>
                        <td>${row.issueType}</td>
                        <td>${Number.isFinite(Number(row.renewalDays)) ? row.renewalDays : 'n/a'}</td>
                        <td>${row.assignedCse}</td>
                      </tr>
                    `
                        )
                        .join('')
                    : '<tr><td colspan="4">No manager-attention accounts in current window.</td></tr>'
                }
              </tbody>
            </table>
          </div>
        </article>
      </div>
    `;

    section.querySelector('[data-manager-period]')?.addEventListener('change', (event) => {
      period = event.target.value;
      render();
    });

    section.querySelectorAll('[data-manager-open]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        onOpenCustomer?.(link.getAttribute('data-manager-open'));
      });
    });
  };

  render();
  return section;
};
