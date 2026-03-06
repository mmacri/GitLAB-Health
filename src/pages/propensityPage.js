import { pageHeader } from '../components/pageHeader.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip } from '../components/statusChip.js';

const safePercent = (value, total) => {
  const numerator = Number(value || 0);
  const denominator = Math.max(1, Number(total || 0));
  return Math.round((numerator / denominator) * 100);
};

const severityRank = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return 3;
  if (normalized === 'medium') return 2;
  return 1;
};

const severityTone = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return 'risk';
  if (normalized === 'medium') return 'warn';
  return 'neutral';
};

const normalizeSeverity = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'high') return 'High';
  if (normalized === 'medium') return 'Medium';
  return 'Low';
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const buildSignalWatchlist = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => {
    (row.riskSignals || []).forEach((signal) => {
      const code = normalizeCode(signal.code || 'UNSPECIFIED_SIGNAL');
      const existing = map.get(code) || {
        code,
        count: 0,
        severity: 'Low',
        detail: ''
      };
      existing.count += 1;
      if (severityRank(signal.severity) > severityRank(existing.severity)) {
        existing.severity = normalizeSeverity(signal.severity);
      }
      if (!existing.detail && signal.detail) {
        existing.detail = String(signal.detail);
      }
      map.set(code, existing);
    });
  });

  return [...map.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return severityRank(right.severity) - severityRank(left.severity);
  });
};

const triggerGuide = [
  {
    code: 'RENEWAL_SOON',
    metric: 'PtC',
    trigger: 'Renewal window <= 90 days',
    why: 'Decision pressure increases quickly if value proof and executive alignment are incomplete.',
    csePlay: 'Launch renewal evidence brief: outcomes, blockers, owners, due dates.',
    managerPlay: 'Require weekly renewal risk checkpoint until pressure normalizes.',
    response: 'Start within 48 hours'
  },
  {
    code: 'LOW_ENGAGEMENT',
    metric: 'PtC',
    trigger: 'Last meaningful touch > 60 days',
    why: 'No-touch accounts lose momentum and hide blockers until late in cycle.',
    csePlay: 'Re-establish cadence with a structured office-hours or workshop sequence.',
    managerPlay: 'Reassign capacity if no customer response after two attempts.',
    response: 'Start within 3 business days'
  },
  {
    code: 'NO_TIME_TO_VALUE',
    metric: 'PtC',
    trigger: 'First pipeline run milestone not complete',
    why: 'No realized value event means low confidence in platform decision.',
    csePlay: 'Run a rapid first-value sprint focused on one production workflow.',
    managerPlay: 'Escalate enablement support and remove technical blockers.',
    response: 'Start this week'
  },
  {
    code: 'LOW_CICD_ADOPTION',
    metric: 'PtC and PtE',
    trigger: 'CI/CD adoption < 40%',
    why: 'Limited CI/CD usage weakens retention and blocks expansion narrative.',
    csePlay: 'Drive template standardization and runner governance plan.',
    managerPlay: 'Prioritize CI enablement program slots for these accounts.',
    response: '7-14 day plan'
  },
  {
    code: 'LOW_SECURITY_ADOPTION',
    metric: 'PtC and PtE',
    trigger: 'Security adoption < 30%',
    why: 'Security gaps add renewal risk and delay Secure use-case expansion.',
    csePlay: 'Adopt secure baseline pipeline with one target team first.',
    managerPlay: 'Track Secure uplift in weekly portfolio review.',
    response: '7-14 day plan'
  },
  {
    code: 'STAGE_GAP_SECURE',
    metric: 'PtC and PtE',
    trigger: 'Secure stage not started while CI/CD >= 60%',
    why: 'A mature CI estate without Secure creates avoidable platform-value gap.',
    csePlay: 'Position Secure as the next maturity step with measurable outcomes.',
    managerPlay: 'Validate executive sponsor for Secure rollout.',
    response: 'Start this month'
  },
  {
    code: 'HIGH_PTE_LOW_PTC',
    metric: 'PtE',
    trigger: 'PtE High and PtC Low',
    why: 'Best expansion timing: momentum is high and risk headwind is low.',
    csePlay: 'Convert success proof into an expansion proposal and timeline.',
    managerPlay: 'Coach QBR narrative and prioritize commercial alignment.',
    response: 'Start now'
  },
  {
    code: 'HIGH_PTE_HIGH_PTC',
    metric: 'PtE and PtC',
    trigger: 'PtE High and PtC High',
    why: 'Expansion potential exists, but retention risk can stall execution.',
    csePlay: 'Run dual-track plan: stabilize risk first, then expand.',
    managerPlay: 'Require weekly burndown of top 3 risk drivers.',
    response: 'Immediate triage'
  }
];

const quadrantGuide = [
  {
    title: 'Expand + Retain (PtE High, PtC Low)',
    key: 'expandAndRetain',
    tone: 'good',
    cse: 'Convert proof points to an expansion proposal with named sponsor and target close date.',
    manager: 'Prioritize account for executive review and revenue planning.',
    exit: 'Expansion plan accepted and tracked with dated milestones.'
  },
  {
    title: 'Grow with Risk (PtE High, PtC Medium/High)',
    key: 'growWithRisk',
    tone: 'warn',
    cse: 'Stabilize top risk signals while preserving expansion hypothesis and timeline.',
    manager: 'Enforce weekly risk burndown plus deal-protection checkpoint.',
    exit: 'PtC drops to Low or top risks closed with owners and dates.'
  },
  {
    title: 'Stabilize then Expand (PtE Low/Medium, PtC High)',
    key: 'stabilizeThenExpand',
    tone: 'risk',
    cse: 'Run retention recovery plan focused on time-to-value and engagement cadence.',
    manager: 'Allocate additional coverage and remove org blockers fast.',
    exit: 'Health moves off Red and PtE reaches Medium or better.'
  },
  {
    title: 'Monitor (PtE Low/Medium, PtC Low/Medium)',
    key: 'monitor',
    tone: 'neutral',
    cse: 'Maintain cadence and improve one weak use case each cycle.',
    manager: 'Track trend deltas and rebalance load across CSE pool.',
    exit: 'Either PtE rises to High or PtC rises and requires escalation.'
  }
];

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

  const signalWatchlist = buildSignalWatchlist(rows);
  const signalCountByCode = new Map(signalWatchlist.map((item) => [item.code, item.count]));
  const triggerRows = triggerGuide.map((item) => ({
    ...item,
    activeCount:
      item.code === 'HIGH_PTE_LOW_PTC'
        ? quadrants.expandAndRetain
        : item.code === 'HIGH_PTE_HIGH_PTC'
          ? quadrants.growWithRisk
          : Number(signalCountByCode.get(item.code) || 0)
  }));

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'propensity');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Guide',
      title: 'PtE / PtC Operator Guide',
      subtitle:
        'How to interpret propensity triggers, why they matter, and which plays to run for CSE and CSE Manager operations.',
      meta:
        'PtE = Propensity to Expand proxy. PtC = Propensity to Churn/Contract proxy. These are deterministic local metrics used for execution planning.',
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
      <div class="callout">
        Use PtE/PtC as a prioritization system, not a replacement for account judgment. Run one PtC mitigation play and one PtE acceleration play per priority account each cycle.
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>How to Use PtE and PtC</h2>
        ${statusChip({ label: 'Weekly operating loop', tone: 'neutral' })}
      </div>
      <div class="flow-steps">
        <article class="flow-step">
          <strong>1) Classify</strong>
          <p>Sort accounts by quadrant first, then by PtC severity. High PtC always drives first response queue.</p>
        </article>
        <article class="flow-step">
          <strong>2) Diagnose</strong>
          <p>Read top trigger drivers: renewal pressure, engagement gaps, adoption gaps, and active risk signals.</p>
        </article>
        <article class="flow-step">
          <strong>3) Execute</strong>
          <p>Assign one owner, one dated play, and one expected outcome per trigger cluster.</p>
        </article>
        <article class="flow-step">
          <strong>4) Verify</strong>
          <p>Re-check PtE/PtC movement weekly. If no change in two cycles, escalate or change play type.</p>
        </article>
      </div>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>What PtE Means</h2>
          ${statusChip({ label: 'Expansion readiness', tone: 'good' })}
        </div>
        <p class="muted">PtE increases when adoption depth, engagement quality, and near-term value narrative are strong.</p>
        <ul class="simple-list">
          <li><strong>High:</strong> run expansion motion now with concrete outcome evidence.</li>
          <li><strong>Medium:</strong> strengthen one weak use case before expansion ask.</li>
          <li><strong>Low:</strong> focus on platform adoption and cadence stability first.</li>
        </ul>
      </article>
      <article class="card">
        <div class="metric-head">
          <h2>What PtC Means</h2>
          ${statusChip({ label: 'Retention pressure', tone: 'risk' })}
        </div>
        <p class="muted">PtC increases when risk signals, adoption gaps, stale engagement, and renewal pressure accumulate.</p>
        <ul class="simple-list">
          <li><strong>High:</strong> immediate retention plan with weekly burndown checkpoints.</li>
          <li><strong>Medium:</strong> targeted risk reduction and engagement cadence reset.</li>
          <li><strong>Low:</strong> maintain health and prevent drift with proactive check-ins.</li>
        </ul>
      </article>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Trigger Catalog: What, Why, and How to Respond</h2>
        ${statusChip({ label: 'Execution reference', tone: 'warn' })}
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Trigger</th>
              <th>Metric impact</th>
              <th>Why it matters</th>
              <th>CSE play</th>
              <th>Manager play</th>
              <th>Response target</th>
              <th>Active now</th>
            </tr>
          </thead>
          <tbody>
            ${triggerRows
              .map(
                (item) => `
                  <tr>
                    <td><strong>${item.code}</strong><br><span class="muted">${item.trigger}</span></td>
                    <td>${item.metric}</td>
                    <td>${item.why}</td>
                    <td>${item.csePlay}</td>
                    <td>${item.managerPlay}</td>
                    <td>${item.response}</td>
                    <td>${statusChip({ label: `${item.activeCount}`, tone: item.activeCount > 0 ? 'warn' : 'neutral' })}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>Live Trigger Watchlist</h2>
          ${statusChip({ label: `${signalWatchlist.length} active types`, tone: signalWatchlist.length ? 'warn' : 'good' })}
        </div>
        ${
          signalWatchlist.length
            ? `
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Signal</th>
                      <th>Accounts</th>
                      <th>Severity</th>
                      <th>Why (sample detail)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${signalWatchlist
                      .slice(0, 8)
                      .map(
                        (signal) => `
                          <tr>
                            <td><strong>${signal.code}</strong></td>
                            <td>${signal.count}</td>
                            <td>${statusChip({ label: signal.severity, tone: severityTone(signal.severity) })}</td>
                            <td>${signal.detail || 'Review account risk timeline for this signal.'}</td>
                          </tr>
                        `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
            : '<p class="empty-text">No active risk signals detected in this snapshot.</p>'
        }
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Plays by Time Horizon</h2>
          ${statusChip({ label: 'Response cadence', tone: 'neutral' })}
        </div>
        <div class="timeline">
          <div class="timeline-item">
            <strong>0-48 hours</strong>
            <span>Triage all PtC High accounts. Assign owner, due date, and first mitigation action.</span>
            <span class="muted">Owner: CSE</span>
          </div>
          <div class="timeline-item">
            <strong>Week 1</strong>
            <span>Complete one risk burndown play and confirm next customer touch is scheduled.</span>
            <span class="muted">Owner: CSE + CSM</span>
          </div>
          <div class="timeline-item">
            <strong>Week 2</strong>
            <span>For PtE High accounts, package value narrative and expansion path with sponsors.</span>
            <span class="muted">Owner: CSE</span>
          </div>
          <div class="timeline-item">
            <strong>Monthly review</strong>
            <span>Manager checks trend: PtC High down, PtE High up, and no unowned triggers.</span>
            <span class="muted">Owner: Manager</span>
          </div>
        </div>
      </article>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>CSE Checklist</h2>
          ${statusChip({ label: 'Execution quality', tone: 'good' })}
        </div>
        <ul class="simple-list">
          <li>Always pair one PtC mitigation with one PtE acceleration step.</li>
          <li>Use trigger code in notes so trend analysis stays consistent.</li>
          <li>Attach measurable evidence (adoption %, milestone, or engagement date) to each play.</li>
          <li>If score movement is flat for two cycles, change play type, not just follow-up frequency.</li>
        </ul>
      </article>
      <article class="card">
        <div class="metric-head">
          <h2>CSE Manager Checklist</h2>
          ${statusChip({ label: 'Portfolio governance', tone: 'warn' })}
        </div>
        <ul class="simple-list">
          <li>Review PtC High queue first; enforce owner/date coverage on every red account.</li>
          <li>Protect capacity for accounts in Grow with Risk and Stabilize then Expand quadrants.</li>
          <li>Coach narrative quality: triggers -> play -> measurable outcome -> next decision.</li>
          <li>Use monthly trendline to rebalance load and escalate systemic blockers.</li>
        </ul>
      </article>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Quadrant Plays and Exit Criteria</h2>
        ${statusChip({ label: 'Decision framework', tone: 'neutral' })}
      </div>
      <div class="grid-cards">
        ${quadrantGuide
          .map(
            (item) => `
              <article class="card compact-card">
                <div class="metric-head">
                  <h3>${item.title}</h3>
                  ${statusChip({ label: `${quadrants[item.key] || 0} accounts`, tone: item.tone })}
                </div>
                <ul class="simple-list">
                  <li><strong>CSE:</strong> ${item.cse}</li>
                  <li><strong>Manager:</strong> ${item.manager}</li>
                  <li><strong>Exit when:</strong> ${item.exit}</li>
                </ul>
              </article>
            `
          )
          .join('')}
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Bands and Portfolio Distribution</h2>
        ${statusChip({ label: `${total} customers`, tone: 'neutral' })}
      </div>
      <div class="grid-cards">
        <article class="card compact-card">
          <h3>Band thresholds</h3>
          <ul class="simple-list">
            <li><strong>High:</strong> 70-100</li>
            <li><strong>Medium:</strong> 45-69</li>
            <li><strong>Low:</strong> 0-44</li>
          </ul>
        </article>
        <article class="card compact-card">
          <h3>PtE distribution</h3>
          <ul class="simple-list">
            <li>High: <strong>${pteHigh}</strong></li>
            <li>Medium: <strong>${pteMedium}</strong></li>
            <li>Low: <strong>${pteLow}</strong></li>
          </ul>
        </article>
        <article class="card compact-card">
          <h3>PtC distribution</h3>
          <ul class="simple-list">
            <li>High: <strong>${ptcHigh}</strong></li>
            <li>Medium: <strong>${ptcMedium}</strong></li>
            <li>Low: <strong>${ptcLow}</strong></li>
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
  { id: 'propensity-open', label: 'Open PtE / PtC Guide', meta: 'Reference', action: { route: 'propensity' } }
];
