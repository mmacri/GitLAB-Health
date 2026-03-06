import { pageHeader } from '../components/pageHeader.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip } from '../components/statusChip.js';

const safePercent = (value, total) => {
  const numerator = Number(value || 0);
  const denominator = Math.max(1, Number(total || 0));
  return Math.round((numerator / denominator) * 100);
};

export const renderPropensityPage = (ctx) => {
  const { manager, workspacePortfolio, navigate } = ctx;
  const rows = workspacePortfolio?.rows || manager?.portfolio?.rows || [];
  const total = rows.length;
  const pteHigh = rows.filter((row) => String(row.pteBand || '') === 'High').length;
  const pteMedium = rows.filter((row) => String(row.pteBand || '') === 'Medium').length;
  const pteLow = rows.filter((row) => String(row.pteBand || '') === 'Low').length;
  const ptcHigh = rows.filter((row) => String(row.ptcBand || '') === 'High').length;
  const ptcMedium = rows.filter((row) => String(row.ptcBand || '') === 'Medium').length;
  const ptcLow = rows.filter((row) => String(row.ptcBand || '') === 'Low').length;
  const quadrants = manager?.propensityQuadrants || {
    expandAndRetain: rows.filter((row) => row.pteBand === 'High' && row.ptcBand === 'Low').length,
    growWithRisk: rows.filter((row) => row.pteBand === 'High' && row.ptcBand !== 'Low').length,
    stabilizeThenExpand: rows.filter((row) => row.pteBand !== 'High' && row.ptcBand === 'High').length,
    monitor: rows.filter((row) => row.pteBand !== 'High' && row.ptcBand !== 'High').length
  };

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'propensity');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Reference',
      title: 'PtE / PtC Operating Reference',
      subtitle:
        'Deterministic proxy metrics that emulate GitLab handbook propensity intent for pooled CSE execution.',
      meta:
        'PtE = Propensity to Expand proxy. PtC = Propensity to Churn/Contract proxy. These are explainable local models, not internal GitLab predictive outputs.',
      actionsHtml: `
        <button class="ghost-btn" type="button" data-go-home>Back to Today</button>
        <button class="ghost-btn" type="button" data-go-portfolio>Open Portfolio</button>
        <button class="ghost-btn" type="button" data-go-manager>Open Manager</button>
      `
    })}

    <section class="card">
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Portfolio rows', value: total, tone: 'neutral' })}
        ${metricTile({ label: 'PtE High', value: `${pteHigh} (${safePercent(pteHigh, total)}%)`, tone: pteHigh ? 'good' : 'neutral' })}
        ${metricTile({ label: 'PtC High', value: `${ptcHigh} (${safePercent(ptcHigh, total)}%)`, tone: ptcHigh ? 'risk' : 'good' })}
        ${metricTile({ label: 'Expand + Retain', value: quadrants.expandAndRetain, tone: quadrants.expandAndRetain ? 'good' : 'neutral' })}
      </div>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>What PtE Means</h2>
          ${statusChip({ label: 'Expansion readiness', tone: 'good' })}
        </div>
        <p class="muted">PtE estimates where adoption depth, engagement quality, and renewal timing create credible expansion motion.</p>
        <ul class="simple-list">
          <li>High: prioritize expansion plan + executive value narrative now.</li>
          <li>Medium: continue enablement and convert proof points to outcomes.</li>
          <li>Low: focus on adoption fundamentals before expansion asks.</li>
        </ul>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>What PtC Means</h2>
          ${statusChip({ label: 'Retention risk pressure', tone: 'risk' })}
        </div>
        <p class="muted">PtC estimates churn/contract pressure from active risks, engagement decay, and renewal urgency.</p>
        <ul class="simple-list">
          <li>High: immediate recovery motion and executive risk mitigation plan.</li>
          <li>Medium: targeted risk burndown and cadence reinforcement.</li>
          <li>Low: maintain stability and keep proactive engagement rhythm.</li>
        </ul>
      </article>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Trigger Map Used in This Console</h2>
        ${statusChip({ label: 'Deterministic', tone: 'neutral' })}
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Primary contributors</th>
              <th>Escalation triggers</th>
              <th>Suggested play</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>PtE</strong></td>
              <td>Adoption depth, engagement quality, CI/CD + Security coverage, stage progression, open expansion opportunities.</td>
              <td>Low engagement momentum, high active risk burden, distant renewal window.</td>
              <td>Run use-case uplift plan, map outcome evidence to expansion hypothesis, align executive narrative.</td>
            </tr>
            <tr>
              <td><strong>PtC</strong></td>
              <td>Risk signals, adoption gap, engagement gap, renewal pressure.</td>
              <td>RENEWAL_SOON, LOW_ENGAGEMENT, no-touch &gt; 90d, low security adoption.</td>
              <td>Activate retention playbook, assign owner + due dates, close top risk drivers within next cadence cycle.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>PtE / PtC Bands</h2>
          ${statusChip({ label: 'Thresholds', tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          <li><strong>High:</strong> 70-100</li>
          <li><strong>Medium:</strong> 45-69</li>
          <li><strong>Low:</strong> 0-44</li>
        </ul>
        <p class="muted">Bands apply to both PtE and PtC for consistent operating semantics across CSE and Manager views.</p>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Current Band Distribution</h2>
          ${statusChip({ label: `${total} customers`, tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          <li>PtE High / Medium / Low: <strong>${pteHigh} / ${pteMedium} / ${pteLow}</strong></li>
          <li>PtC High / Medium / Low: <strong>${ptcHigh} / ${ptcMedium} / ${ptcLow}</strong></li>
        </ul>
      </article>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Quadrant Plays (CSE + CSE Manager)</h2>
        ${statusChip({ label: 'Action framework', tone: 'warn' })}
      </div>
      <div class="grid-cards">
        <article class="card compact-card">
          <h3>Expand + Retain (PtE High, PtC Low)</h3>
          <p class="muted">Count: ${quadrants.expandAndRetain}</p>
          <ul class="simple-list">
            <li>CSE: convert proof to expansion proposal.</li>
            <li>Manager: prioritize growth motions and executive reviews.</li>
          </ul>
        </article>
        <article class="card compact-card">
          <h3>Grow with Risk (PtE High, PtC Medium/High)</h3>
          <p class="muted">Count: ${quadrants.growWithRisk}</p>
          <ul class="simple-list">
            <li>CSE: sequence retention stabilization before expansion ask.</li>
            <li>Manager: enforce weekly risk burndown checkpoint.</li>
          </ul>
        </article>
        <article class="card compact-card">
          <h3>Stabilize then Expand (PtE Low/Medium, PtC High)</h3>
          <p class="muted">Count: ${quadrants.stabilizeThenExpand}</p>
          <ul class="simple-list">
            <li>CSE: execute recovery playbook + close top signals.</li>
            <li>Manager: allocate capacity and escalation coverage.</li>
          </ul>
        </article>
        <article class="card compact-card">
          <h3>Monitor (PtE Low/Medium, PtC Low/Medium)</h3>
          <p class="muted">Count: ${quadrants.monitor}</p>
          <ul class="simple-list">
            <li>CSE: maintain cadence and lift one weak use case.</li>
            <li>Manager: track trend deltas and rebalance portfolio load.</li>
          </ul>
        </article>
      </div>
    </section>
  `;

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));
  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));
  wrapper.querySelector('[data-go-manager]')?.addEventListener('click', () => navigate('manager'));

  return wrapper;
};

export const propensityCommandEntries = () => [
  { id: 'propensity-open', label: 'Open PtE / PtC Reference', meta: 'Reference', action: { route: 'propensity' } }
];

