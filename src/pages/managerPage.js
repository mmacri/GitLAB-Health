import { metricTile } from '../components/metricTile.js';
import { pageHeader } from '../components/pageHeader.js';
import { sectionCard } from '../components/sectionCard.js';
import { statusChip } from '../components/statusChip.js';
import { barChartSvg, donutChartSvg, funnelChartSvg, lineChartSvg } from '../lib/charts.js';
import { formatDate } from '../lib/date.js';

const fallbackManager = (portfolio) => ({
  portfolio: {
    rows: portfolio?.signals || [],
    healthDistribution: {
      green: (portfolio?.signals || []).filter((signal) => String(signal.account?.health?.overall || '').toLowerCase() === 'green').length,
      yellow: (portfolio?.signals || []).filter((signal) => String(signal.account?.health?.overall || '').toLowerCase() === 'yellow').length,
      red: (portfolio?.signals || []).filter((signal) => String(signal.account?.health?.overall || '').toLowerCase() === 'red').length
    },
    adoptionCoverage: {
      avgAdoption: (portfolio?.signals || []).length
        ? Math.round(
            (portfolio?.signals || []).reduce((sum, signal) => sum + Number(signal.account?.adoption?.platform_adoption_score || 0), 0) /
              (portfolio?.signals || []).length
          )
        : 0,
      avgCicd: 0,
      avgSecurity: 0
    },
    engagementCoverage: { in30: 0, in60: 0, in90: 0, over90: 0 },
    atRisk: []
  },
  workload: [],
  programs: [],
  programFunnel: { invited: 0, attended: 0, completed: 0 },
  snapshots: [],
  topActions: []
});

export const renderManagerPage = (ctx) => {
  const { portfolio, manager, navigate } = ctx;
  const dashboard = manager || fallbackManager(portfolio);
  const health = dashboard.portfolio.healthDistribution || { green: 0, yellow: 0, red: 0 };
  const adoption = dashboard.portfolio.adoptionCoverage || { avgAdoption: 0, avgCicd: 0, avgSecurity: 0 };
  const engagement = dashboard.portfolio.engagementCoverage || { in30: 0, in60: 0, in90: 0, over90: 0 };
  const rows = dashboard.portfolio.rows || [];
  const atRisk = dashboard.portfolio.atRisk || [];
  const workload = dashboard.workload || [];
  const snapshots = dashboard.snapshots || [];
  const programFunnel = dashboard.programFunnel || { invited: 0, attended: 0, completed: 0 };
  const pteSummary = dashboard.pteSummary || { high: 0, medium: 0, low: 0 };
  const ptcSummary = dashboard.ptcSummary || { high: 0, medium: 0, low: 0 };
  const propensityQuadrants = dashboard.propensityQuadrants || {
    expandAndRetain: 0,
    growWithRisk: 0,
    stabilizeThenExpand: 0,
    monitor: 0
  };

  const USE_CASE_KEYS = ['SCM', 'CI', 'CD', 'Secure'];
  const useCaseHealth = USE_CASE_KEYS.reduce((acc, key) => {
    acc[key] = { green: 0, yellow: 0, red: 0 };
    rows.forEach((signal) => {
      const score = Number(signal.account?.adoption?.use_case_scores?.[key] ?? -1);
      if (score >= 75) acc[key].green += 1;
      else if (score >= 50) acc[key].yellow += 1;
      else if (score >= 0) acc[key].red += 1;
    });
    return acc;
  }, {});

  const renewalWindow = rows.filter((signal) => Number(signal.renewalDays ?? 999) <= 90);
  const renewalWithoutRecentCse = renewalWindow.filter((signal) => Number(signal.touchStaleDays ?? 999) > 30);

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'manager');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Manager',
      title: 'CSE Manager Dashboard',
      subtitle:
        'Team-level operating view for coverage, portfolio risk, adoption improvement, and program performance.',
      actionsHtml: `
        <button class="ghost-btn" type="button" data-go-risks>Risk Heatmap</button>
        <button class="ghost-btn" type="button" data-go-programs>Programs</button>
        <button class="ghost-btn" type="button" data-go-portfolio>Portfolio</button>
        <button class="ghost-btn" type="button" data-go-reports>Reports</button>
      `
    })}

    ${sectionCard({
      bodyHtml: `
      <div class="kpi-grid kpi-3">
        ${metricTile({ label: 'Total customers', value: rows.length, tone: 'neutral' })}
        ${metricTile({ label: 'Average adoption', value: adoption.avgAdoption || 0, tone: (adoption.avgAdoption || 0) >= 70 ? 'good' : 'warn' })}
        ${metricTile({ label: 'At-risk customers', value: atRisk.length, tone: atRisk.length ? 'risk' : 'good' })}
        ${metricTile({ label: 'Engagement in 30d', value: engagement.in30 || 0, tone: (engagement.in30 || 0) > 0 ? 'good' : 'warn' })}
        ${metricTile({ label: 'High PtE', value: pteSummary.high, tone: pteSummary.high ? 'good' : 'neutral' })}
        ${metricTile({ label: 'High PtC', value: ptcSummary.high, tone: ptcSummary.high ? 'risk' : 'good' })}
      </div>
      `
    })}

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>Use Case Health by Adoption Level</h2>
          ${statusChip({ label: `${rows.length} accounts`, tone: 'neutral' })}
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Use Case</th><th>Green (≥75)</th><th>Yellow (50–74)</th><th>Red (&lt;50)</th></tr></thead>
            <tbody>
              ${USE_CASE_KEYS.map((key) => `
                <tr>
                  <td>${key}</td>
                  <td>${statusChip({ label: String(useCaseHealth[key].green), tone: useCaseHealth[key].green ? 'good' : 'neutral' })}</td>
                  <td>${statusChip({ label: String(useCaseHealth[key].yellow), tone: useCaseHealth[key].yellow ? 'warn' : 'neutral' })}</td>
                  <td>${statusChip({ label: String(useCaseHealth[key].red), tone: useCaseHealth[key].red ? 'risk' : 'neutral' })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Renewal Window — CSE Coverage Gap</h2>
          ${statusChip({ label: `${renewalWithoutRecentCse.length} accounts`, tone: renewalWithoutRecentCse.length ? 'risk' : 'good' })}
        </div>
        <p class="muted">Accounts renewing within 90 days with no CSE engagement in the last 30 days.</p>
        <ul class="simple-list">
          ${renewalWithoutRecentCse.length
            ? renewalWithoutRecentCse.slice(0, 8).map((signal) =>
                `<li><a href="#" data-open-customer="${signal.customer?.id || signal.account?.id}">${signal.customer?.name || signal.account?.name}</a> — ${signal.renewalDays ?? 'n/a'}d to renewal, last touch ${signal.touchStaleDays ?? 'n/a'}d ago</li>`
              ).join('')
            : '<li>No renewal-window accounts with CSE coverage gaps.</li>'}
        </ul>
      </article>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>Portfolio Health Distribution</h2>
          ${statusChip({ label: `${rows.length} customers`, tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${donutChartSvg([
            { label: 'Green', value: health.green || 0, color: '#16A34A' },
            { label: 'Yellow', value: health.yellow || 0, color: '#D97706' },
            { label: 'Red', value: health.red || 0, color: '#DC2626' }
          ])}
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Use Case Adoption Distribution</h2>
          ${statusChip({ label: 'Averages', tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${barChartSvg([
            { label: 'Overall', value: adoption.avgAdoption || 0, color: '#6E49CB' },
            { label: 'CI/CD', value: adoption.avgCicd || 0, color: '#0284C7' },
            { label: 'Security', value: adoption.avgSecurity || 0, color: '#16A34A' }
          ])}
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Renewal Risk Map</h2>
          ${statusChip({ label: `${atRisk.length} accounts`, tone: atRisk.length ? 'warn' : 'good' })}
        </div>
        <ul class="simple-list">
          ${
            atRisk.length
              ? atRisk
                  .slice(0, 8)
                  .map(
                    (item) =>
                      `<li><a href="#" data-open-customer="${item.customer.id}">${item.customer.name}</a> - ${item.riskSignals?.[0]?.detail || 'Review risk signals'}</li>`
                  )
                  .join('')
              : '<li>No renewal risk accounts identified.</li>'
          }
        </ul>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Program Funnel Metrics</h2>
          ${statusChip({ label: `${(dashboard.programs || []).length} programs`, tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${funnelChartSvg([
            { label: 'Invited', value: Number(programFunnel.invited || 0), color: '#6E49CB' },
            { label: 'Attended', value: Number(programFunnel.attended || 0), color: '#0284C7' },
            { label: 'Completed', value: Number(programFunnel.completed || 0), color: '#16A34A' }
          ])}
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>PtE / PtC Distribution</h2>
          ${statusChip({ label: 'Propensity bands', tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${barChartSvg([
            { label: 'PtE High', value: Number(pteSummary.high || 0), color: '#16A34A' },
            { label: 'PtE Medium', value: Number(pteSummary.medium || 0), color: '#D97706' },
            { label: 'PtC High', value: Number(ptcSummary.high || 0), color: '#DC2626' },
            { label: 'PtC Medium', value: Number(ptcSummary.medium || 0), color: '#0284C7' }
          ])}
        </div>
      </article>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>Adoption Improvement Trend</h2>
          ${statusChip({ label: `${snapshots.length} snapshots`, tone: 'neutral' })}
        </div>
        <div class="chart-wrap">
          ${
            snapshots.length
              ? lineChartSvg(snapshots.map((item) => ({ label: item.month, value: item.adoptionAvg })))
              : '<p class="muted">No snapshots yet. Capture snapshots from Settings.</p>'
          }
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Team Workload</h2>
          ${statusChip({ label: `${workload.length} CSE members`, tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          ${
            workload.length
              ? workload
                  .map(
                    (member) =>
                      `<li><strong>${member.name}</strong> - ${member.customerCount} customers, ${member.atRiskCount} at-risk coverage</li>`
                  )
                  .join('')
              : '<li>No team roster configured.</li>'
          }
        </ul>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Manager Actions</h2>
          ${statusChip({ label: `${(dashboard.topActions || []).length} actions`, tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          ${
            (dashboard.topActions || []).length
              ? (dashboard.topActions || [])
                  .slice(0, 8)
                  .map(
                    (action) =>
                      `<li><a href="#" data-open-customer="${action.customerId}">${action.customerName}</a> - ${action.action} (due ${formatDate(
                        action.due
                      )})</li>`
                  )
                  .join('')
              : '<li>No manager actions currently generated.</li>'
          }
        </ul>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>PtE x PtC Segment Grid</h2>
          ${statusChip({ label: `${rows.length} customers`, tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          <li><strong>Expand + Retain:</strong> ${propensityQuadrants.expandAndRetain}</li>
          <li><strong>Grow with Risk:</strong> ${propensityQuadrants.growWithRisk}</li>
          <li><strong>Stabilize then Expand:</strong> ${propensityQuadrants.stabilizeThenExpand}</li>
          <li><strong>Monitor:</strong> ${propensityQuadrants.monitor}</li>
        </ul>
      </article>
    </section>
  `;

  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));
  wrapper.querySelector('[data-go-reports]')?.addEventListener('click', () => navigate('reports'));
  wrapper.querySelector('[data-go-risks]')?.addEventListener('click', () => navigate('risks'));
  wrapper.querySelector('[data-go-programs]')?.addEventListener('click', () => navigate('programs'));
  wrapper.addEventListener('click', (event) => {
    const link = event.target.closest('[data-open-customer]');
    if (!link) return;
    event.preventDefault();
    navigate('customer', { id: link.getAttribute('data-open-customer') });
  });

  return wrapper;
};

export const managerCommandEntries = () => [
  { id: 'manager-open', label: 'Open Manager Dashboard', meta: 'Manager', action: { route: 'manager' } }
];
