import { renderActionDrawer } from '../components/actionDrawer.js';
import { statusChip } from '../components/statusChip.js';

export const renderExportsPage = (ctx) => {
  const {
    workspace,
    account,
    selectedCustomerId,
    customerSafe,
    mode,
    navigate,
    onSelectCustomer,
    onExportPortfolio,
    onExportProgramsCsv,
    onExportVocCsv,
    onExportManagerSummary,
    onExportAccountCsv,
    onExportAccountPdf,
    onCopyShare
  } = ctx;

  const customers = Array.isArray(workspace?.customers) ? workspace.customers : [];
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) || customers[0] || null;
  const currentLabel = selectedCustomer?.name || account?.name || 'None selected';
  const hasExportTarget = Boolean(selectedCustomer || account);

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
            <button class="ghost-btn" type="button" data-export-programs>Export Programs CSV</button>
            <button class="ghost-btn" type="button" data-export-voc>Export VOC CSV</button>
            <button class="ghost-btn" type="button" data-export-manager>Export Manager Summary PDF</button>
          </div>
        </section>

        <section class="card">
          <div class="metric-head"><h2>Account Exports</h2></div>
          ${
            customers.length
              ? `
            <div class="form-grid">
              <label>
                Customer
                <select data-export-customer>
                  ${customers
                    .map(
                      (customer) =>
                        `<option value="${customer.id}" ${customer.id === (selectedCustomer?.id || '') ? 'selected' : ''}>${customer.name}</option>`
                    )
                    .join('')}
                </select>
              </label>
            </div>
          `
              : ''
          }
          <p class="muted">Current account: ${currentLabel}</p>
          <div class="page-actions">
            <button class="ghost-btn" type="button" data-export-account-csv ${hasExportTarget ? '' : 'disabled'}>Export Account CSV</button>
            <button class="ghost-btn" type="button" data-export-account-pdf ${hasExportTarget ? '' : 'disabled'}>Export Account Summary PDF</button>
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
    onExportAccount: () =>
      selectedCustomer
        ? onExportAccountCsv(selectedCustomer.id, { customerSafe })
        : account && onExportAccountCsv(account, { customerSafe }),
    onExportSummary: () =>
      selectedCustomer
        ? onExportAccountPdf(selectedCustomer.id, { customerSafe })
        : account && onExportAccountPdf(account, { customerSafe })
  });
  wrapper.querySelector('[data-drawer-host]').appendChild(drawer);

  wrapper.querySelector('[data-export-customer]')?.addEventListener('change', (event) => {
    const nextCustomerId = event.target.value;
    if (!nextCustomerId) return;
    onSelectCustomer?.(nextCustomerId);
  });
  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));
  wrapper.querySelector('[data-export-portfolio]')?.addEventListener('click', onExportPortfolio);
  wrapper.querySelector('[data-export-programs]')?.addEventListener('click', () => onExportProgramsCsv?.());
  wrapper.querySelector('[data-export-voc]')?.addEventListener('click', () => onExportVocCsv?.());
  wrapper.querySelector('[data-export-manager]')?.addEventListener('click', () => onExportManagerSummary?.());
  wrapper.querySelector('[data-copy-share]')?.addEventListener('click', onCopyShare);
  wrapper.querySelector('[data-export-account-csv]')?.addEventListener('click', () => {
    if (selectedCustomer) {
      onExportAccountCsv(selectedCustomer.id, { customerSafe });
      return;
    }
    if (account) onExportAccountCsv(account, { customerSafe });
  });
  wrapper.querySelector('[data-export-account-pdf]')?.addEventListener('click', () => {
    if (selectedCustomer) {
      onExportAccountPdf(selectedCustomer.id, { customerSafe });
      return;
    }
    if (account) onExportAccountPdf(account, { customerSafe });
  });

  return wrapper;
};

export const exportsCommandEntries = () => [{ id: 'exports-open', label: 'Open export center', meta: 'Exports', action: { route: 'exports' } }];
