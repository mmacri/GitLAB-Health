import { statusChip } from '../components/statusChip.js';

const lifecycleSvg = () => `
  <svg class="lifecycle-svg" viewBox="0 0 980 210" role="img" aria-label="Lifecycle flow from kickoff to renew">
    <defs>
      <linearGradient id="cheatFlowLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0284c7"></stop>
        <stop offset="100%" stop-color="#6e49cb"></stop>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="980" height="210" rx="14" fill="#f8fafc" stroke="#e5e7eb"></rect>
    <line x1="90" y1="110" x2="890" y2="110" stroke="url(#cheatFlowLine)" stroke-width="8" stroke-linecap="round"></line>
    <g>
      <circle cx="110" cy="110" r="24" fill="#e0f2fe" stroke="#0284c7"></circle>
      <text x="110" y="115" text-anchor="middle" font-size="12" fill="#0f172a">1</text>
      <text x="110" y="154" text-anchor="middle" font-size="13" fill="#111827">Kickoff</text>
    </g>
    <g>
      <circle cx="300" cy="110" r="24" fill="#dcfce7" stroke="#16a34a"></circle>
      <text x="300" y="115" text-anchor="middle" font-size="12" fill="#0f172a">2</text>
      <text x="300" y="154" text-anchor="middle" font-size="13" fill="#111827">Onboard</text>
    </g>
    <g>
      <circle cx="490" cy="110" r="24" fill="#dbeafe" stroke="#2563eb"></circle>
      <text x="490" y="115" text-anchor="middle" font-size="12" fill="#0f172a">3</text>
      <text x="490" y="154" text-anchor="middle" font-size="13" fill="#111827">First Value</text>
    </g>
    <g>
      <circle cx="680" cy="110" r="24" fill="#ede9fe" stroke="#6e49cb"></circle>
      <text x="680" y="115" text-anchor="middle" font-size="12" fill="#0f172a">4</text>
      <text x="680" y="154" text-anchor="middle" font-size="13" fill="#111827">Expand</text>
    </g>
    <g>
      <circle cx="870" cy="110" r="24" fill="#ffedd5" stroke="#d97706"></circle>
      <text x="870" y="115" text-anchor="middle" font-size="12" fill="#0f172a">5</text>
      <text x="870" y="154" text-anchor="middle" font-size="13" fill="#111827">Renew</text>
    </g>
  </svg>
`;

export const renderCheatsheetPage = (ctx) => {
  const { cheatsheet, navigate } = ctx;
  const links = Array.isArray(cheatsheet?.handbook_links) ? cheatsheet.handbook_links : [];
  const bullets = Array.isArray(cheatsheet?.overview_points) ? cheatsheet.overview_points : [];
  const cseModel = cheatsheet?.cse_operating_model || null;
  const engagementTypes = Array.isArray(cseModel?.engagement_types) ? cseModel.engagement_types : [];
  const postSessionChecklist = Array.isArray(cseModel?.post_session_checklist) ? cseModel.post_session_checklist : [];
  const outreachTriggers = Array.isArray(cseModel?.proactive_outreach_triggers) ? cseModel.proactive_outreach_triggers : [];
  const successMetrics = Array.isArray(cseModel?.success_metrics) ? cseModel.success_metrics : [];
  const accountabilityBoundary = Array.isArray(cseModel?.accountability_boundary) ? cseModel.accountability_boundary : [];

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'cheatsheet');
  wrapper.innerHTML = `
    <header class="page-head page-intro">
      <div>
        <p class="eyebrow">Cheatsheet</p>
        <h1>${cheatsheet?.title || 'CSE Operating Cheatsheet'}</h1>
        <p class="hero-lede">${cheatsheet?.subtitle || 'A quick operating reference for pooled CSE execution.'}</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Today</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-head">
        <h2>Lifecycle Flow</h2>
        ${statusChip({ label: 'Visual Guide', tone: 'neutral' })}
      </div>
      ${lifecycleSvg()}
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Operating Notes</h2>
      </div>
      <ul class="simple-list">
        ${bullets.length ? bullets.map((point) => `<li>${point}</li>`).join('') : '<li>No operating notes configured.</li>'}
      </ul>
    </section>

    ${cseModel ? `
    <section class="card">
      <div class="metric-head">
        <h2>CSE Operating Model</h2>
        ${statusChip({ label: 'Pooled On-Demand', tone: 'neutral' })}
      </div>
      ${cseModel.description ? `<p class="muted">${cseModel.description}</p>` : ''}

      ${accountabilityBoundary.length ? `
      <h3 class="section-subhead">Accountability Boundary</h3>
      <ul class="simple-list">
        ${accountabilityBoundary.map((item) => `<li>${item}</li>`).join('')}
      </ul>` : ''}

      ${engagementTypes.length ? `
      <h3 class="section-subhead">Engagement Types</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Type</th><th>When to Use</th><th>Follow-up</th></tr>
          </thead>
          <tbody>
            ${engagementTypes.map((et) => `<tr><td><strong>${et.type}</strong></td><td>${et.when_to_use || ''}</td><td>${et.follow_up || ''}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      ${postSessionChecklist.length ? `
      <h3 class="section-subhead">Post-Session Checklist</h3>
      <ul class="simple-list">
        ${postSessionChecklist.map((item) => `<li>${item}</li>`).join('')}
      </ul>` : ''}

      ${outreachTriggers.length ? `
      <h3 class="section-subhead">Proactive Outreach Triggers</h3>
      <ul class="simple-list">
        ${outreachTriggers.map((item) => `<li>${item}</li>`).join('')}
      </ul>` : ''}

      ${successMetrics.length ? `
      <h3 class="section-subhead">Success Metrics</h3>
      <ul class="simple-list">
        ${successMetrics.map((item) => `<li>${item}</li>`).join('')}
      </ul>` : ''}
    </section>
    ` : ''}

    <section class="card">
      <div class="metric-head">
        <h2>Handbook Links</h2>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Resource</th><th>Description</th><th>Link</th></tr>
          </thead>
          <tbody>
            ${
              links.length
                ? links
                    .map(
                      (item) =>
                        `<tr><td>${item.label}</td><td>${item.description || ''}</td><td><a href="${item.link}" target="_blank" rel="noopener noreferrer">Open</a></td></tr>`
                    )
                    .join('')
                : '<tr><td colspan="3">No handbook links configured.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>
  `;

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));
  return wrapper;
};

export const cheatsheetCommandEntries = () => [
  { id: 'cheatsheet-open', label: 'Open cheatsheet', meta: 'Cheatsheet', action: { route: 'cheatsheet' } }
];
