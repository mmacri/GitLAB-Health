import { renderActionDrawer } from '../components/actionDrawer.js';
import { statusChip } from '../components/statusChip.js';

export const renderExportsPage = (ctx) => {
  const { account, customerSafe, mode, navigate, onExportPortfolio, onExportAccountCsv, onExportAccountPdf, onCopyShare } = ctx;

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.innerHTML = `
    <header class="page-head page-intro">
      <div>
        <p class="eyebrow">Exports</p>
        <h1>Export Center</h1>
        <p class="hero-lede">Exports respect current audience mode. Customer-safe mode redacts internal-only fields.</p>
      </div>
      <div class="page-actions">
        ${statusChip({ label: customerSafe ? 'Customer-safe mode' : 'Internal mode', tone: customerSafe ? 'good' : 'warn' })}
        <button class="ghost-btn" type="button" data-go-home>Back to Portfolio</button>
      </div>
    </header>

    <section class="dashboard-grid">
      <div class="main-col">
        <section class="card">
          <div class="metric-head"><h2>Portfolio Exports</h2></div>
          <div class="page-actions">
            <button class="qa" type="button" data-export-portfolio>Export Portfolio CSV</button>
          </div>
        </section>

        <section class="card">
          <div class="metric-head"><h2>Account Exports</h2></div>
          <p class="muted">Current account: ${account?.name || 'None selected'}</p>
          <div class="page-actions">
            <button class="ghost-btn" type="button" data-export-account-csv ${account ? '' : 'disabled'}>Export Account CSV</button>
            <button class="ghost-btn" type="button" data-export-account-pdf ${account ? '' : 'disabled'}>Export Account Summary PDF</button>
          </div>
        </section>

        <section class="card">
          <div class="metric-head"><h2>Share Snapshot</h2></div>
          <p class="muted">Generates a mode-aware share URL using current route and audience context.</p>
          <div class="page-actions">
            <button class="qa" type="button" data-copy-share>Copy share snapshot URL</button>
          </div>
        </section>
      </div>

      <div></div>
      <div data-drawer-host></div>
    </section>
  `;

  const drawer = renderActionDrawer({
    title: 'Export Action Drawer',
    mode,
    nextActions: [
      'Export portfolio before weekly triage review',
      'Export account summary before EBR',
      'Share customer-safe snapshot with stakeholders'
    ],
    dueSoon: ['Weekly triage package', 'Renewal readiness packet'],
    riskSignals: ['Internal field leak risk if mode is wrong', 'Snapshot shared without customer-safe toggle'],
    onGenerateAgenda: () => navigate('intake'),
    onGenerateEmail: () => navigate('intake'),
    onGenerateIssue: () => navigate('intake'),
    onExportPortfolio,
    onExportAccount: () => account && onExportAccountCsv(account, { customerSafe }),
    onExportSummary: () => account && onExportAccountPdf(account, { customerSafe })
  });
  wrapper.querySelector('[data-drawer-host]').appendChild(drawer);

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));
  wrapper.querySelector('[data-export-portfolio]')?.addEventListener('click', onExportPortfolio);
  wrapper.querySelector('[data-copy-share]')?.addEventListener('click', onCopyShare);
  wrapper.querySelector('[data-export-account-csv]')?.addEventListener('click', () => account && onExportAccountCsv(account, { customerSafe }));
  wrapper.querySelector('[data-export-account-pdf]')?.addEventListener('click', () => account && onExportAccountPdf(account, { customerSafe }));

  return wrapper;
};

export const exportsCommandEntries = () => [{ id: 'exports-open', label: 'Open export center', meta: 'Exports', action: { route: 'exports' } }];
