import { statusChip } from './statusChip.mjs';

const renderList = (items, emptyLabel) =>
  items?.length
    ? `<ul class="drawer-list">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : `<p class="empty-text">${emptyLabel}</p>`;

export const renderActionDrawer = (ctx) => {
  const {
    title = 'Action Drawer',
    mode = 'today',
    nextActions = [],
    dueSoon = [],
    riskSignals = [],
    onGenerateAgenda,
    onGenerateEmail,
    onGenerateIssue,
    onExportPortfolio,
    onExportAccount,
    onExportSummary
  } = ctx;

  const wrapper = document.createElement('aside');
  wrapper.className = 'drawer card';
  wrapper.innerHTML = `
    <div class="metric-head">
      <h2>${title}</h2>
      ${statusChip({ label: mode, tone: 'neutral' })}
    </div>
    <section>
      <h3>Top 3 Next Actions</h3>
      ${renderList(nextActions.slice(0, 3), 'No actions queued.')}
    </section>
    <section>
      <h3>Due Soon</h3>
      ${renderList(dueSoon, 'No due-soon items.')}
    </section>
    <section>
      <h3>At-Risk Signals</h3>
      ${renderList(riskSignals, 'No active risk signals.')}
    </section>
    <section>
      <h3>Generate Artifacts</h3>
      <div class="drawer-actions">
        <button class="ghost-btn" type="button" data-drawer-action="agenda">Agenda</button>
        <button class="ghost-btn" type="button" data-drawer-action="email">Follow-up Email</button>
        <button class="ghost-btn" type="button" data-drawer-action="issue">Issue Body</button>
      </div>
    </section>
    <section>
      <h3>Export Shortcuts</h3>
      <div class="drawer-actions">
        <button class="ghost-btn" type="button" data-drawer-export="portfolio">Portfolio CSV</button>
        <button class="ghost-btn" type="button" data-drawer-export="account">Account CSV</button>
        <button class="ghost-btn" type="button" data-drawer-export="summary">Account PDF</button>
      </div>
    </section>
  `;

  wrapper.querySelector('[data-drawer-action="agenda"]')?.addEventListener('click', () => onGenerateAgenda?.());
  wrapper.querySelector('[data-drawer-action="email"]')?.addEventListener('click', () => onGenerateEmail?.());
  wrapper.querySelector('[data-drawer-action="issue"]')?.addEventListener('click', () => onGenerateIssue?.());
  wrapper.querySelector('[data-drawer-export="portfolio"]')?.addEventListener('click', () => onExportPortfolio?.());
  wrapper.querySelector('[data-drawer-export="account"]')?.addEventListener('click', () => onExportAccount?.());
  wrapper.querySelector('[data-drawer-export="summary"]')?.addEventListener('click', () => onExportSummary?.());

  return wrapper;
};
