import { pageHeader } from '../components/pageHeader.js';
import { statusChip } from '../components/statusChip.js';
import { formatDate, formatDateTime } from '../lib/date.js';

const SIGNAL_LABELS = {
  LOW_ENGAGEMENT: 'Low Engagement',
  RENEWAL_SOON: 'Renewal Soon',
  LOW_SECURITY_ADOPTION: 'Low Security',
  LOW_CICD_ADOPTION: 'Low CI/CD',
  NO_TIME_TO_VALUE: 'No Time to Value'
};

const normalize = (value) => String(value || '').trim().toUpperCase();
const normalizeLower = (value) => String(value || '').trim().toLowerCase();

const signalLabel = (code) => SIGNAL_LABELS[normalize(code)] || String(code || '').replace(/_/g, ' ');

const SEVERITY_RANK = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

const topSeverity = (signals = []) => {
  if (!signals.length) return 'NONE';
  return signals.reduce((best, signal) => {
    const code = normalize(signal.severity || 'LOW');
    return (SEVERITY_RANK[code] || 0) > (SEVERITY_RANK[best] || 0) ? code : best;
  }, 'LOW');
};

const severityTone = (severity) => {
  const value = normalize(severity);
  if (value === 'CRITICAL' || value === 'HIGH') return 'risk';
  if (value === 'MEDIUM') return 'warn';
  if (value === 'LOW') return 'good';
  return 'neutral';
};

const healthTone = (health) => {
  const value = normalizeLower(health);
  if (value === 'red') return 'risk';
  if (value === 'yellow') return 'warn';
  if (value === 'green') return 'good';
  return 'neutral';
};

const signalChips = (signals = []) => {
  if (!signals.length) return `<span class="status-chip status-chip--neutral">None</span>`;
  return signals
    .slice(0, 3)
    .map((signal) => {
      const label = signalLabel(signal.code);
      return `<span class="status-chip status-chip--risk"><span class="chip-icon" aria-hidden="true">●</span><span>${label}</span></span>`;
    })
    .join(' ');
};

const CSE_ACTION_MAP = {
  LOW_ENGAGEMENT: 'Invite to next webinar or office hours session to rebuild touch cadence.',
  RENEWAL_SOON: 'Run renewal readiness playbook; confirm adoption evidence for EBR narrative.',
  LOW_SECURITY_ADOPTION: 'Schedule Secure workshop or SAST/dependency scanning lab session.',
  LOW_CICD_ADOPTION: 'Run CI/Verify lab; share CI template starter kit and track pipeline coverage.',
  NO_TIME_TO_VALUE: 'Execute time-to-value motion: first pipeline run, runner baseline, owner handoff.'
};

const cseAction = (signals = []) => {
  const topCode = normalize(signals[0]?.code || '');
  return CSE_ACTION_MAP[topCode] || 'Monitor adoption signals; consider proactive program invitation.';
};

export const renderRisksPage = (ctx) => {
  const { workspace, portfolioRows, navigate, onBulkApplyPlaybook, notify } = ctx;
  const rows = (portfolioRows || []).map((row) => ({
    id: row.customer.id,
    name: row.customer.name,
    health: row.health,
    renewalDays: Number.isFinite(Number(row.renewalDays)) ? Number(row.renewalDays) : null,
    signals: row.riskSignals || [],
    topSeverity: topSeverity(row.riskSignals || []),
    playbookCount: Array.isArray(workspace?.risk?.[row.customer.id]?.playbook) ? workspace.risk[row.customer.id].playbook.length : 0,
    nextAction: row.riskSignals?.[0]?.code
      ? `Address "${signalLabel(row.riskSignals[0].code)}" — assign mitigation owner and due date`
      : 'Maintain engagement and monitor adoption movement',
    cseAction: cseAction(row.riskSignals || [])
  }));

  const playbookTemplates = workspace?.settings?.riskPlaybookTemplates || [];
  const riskRuns = Array.isArray(workspace?.operations?.riskRuns) ? workspace.operations.riskRuns : [];
  const signalCodes = [...new Set(rows.flatMap((row) => (row.signals || []).map((signal) => normalize(signal.code)).filter(Boolean)))].sort();
  const selected = new Set();
  const filters = {
    search: '',
    signalCode: 'all',
    severity: 'all',
    renewalWindow: 'all'
  };
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'risks');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Risks',
      title: 'Risk Detection + Playbooks',
      subtitle: 'Deterministic risk signals across the portfolio with reusable mitigation playbooks.',
      actionsHtml: `<button class="ghost-btn" type="button" data-go-manager>Open manager dashboard</button>`
    })}

    <section class="card">
      <div class="metric-head">
        <h2>Risk Heatmap</h2>
        ${statusChip({ label: `${rows.filter((item) => item.signals.length > 0).length} at risk`, tone: 'warn' })}
      </div>
      <div class="filter-row">
        <label>
          Search
          <input type="search" data-filter-search placeholder="Search customer, action, or signal..." />
        </label>
        <label>
          Signal
          <select data-filter-signal>
            <option value="all">All</option>
            ${signalCodes.map((code) => `<option value="${code}">${signalLabel(code)}</option>`).join('')}
          </select>
        </label>
        <label>
          Severity
          <select data-filter-severity>
            <option value="all">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="NONE">None</option>
          </select>
        </label>
        <label>
          Renewal window
          <select data-filter-renewal>
            <option value="all">All</option>
            <option value="30">0-30 days</option>
            <option value="60">31-60 days</option>
            <option value="90">61-90 days</option>
            <option value="over90">90+ days</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" data-select-all-risks /></th>
              <th>Customer</th>
              <th>Health</th>
              <th>Top Severity</th>
              <th>Active Risk Signals</th>
              <th>Playbook Actions</th>
              <th>CSM Action</th>
              <th>CSE Action</th>
            </tr>
          </thead>
          <tbody data-risk-body></tbody>
        </table>
      </div>
      <div class="form-grid u-mt-3">
        <label>
          Template
          <select data-bulk-template>
            <option value="">Select playbook template</option>
            ${playbookTemplates.map((template) => `<option value="${template.id}">${template.name}</option>`).join('')}
          </select>
        </label>
        <label>
          Owner
          <input type="text" value="CSE" data-bulk-owner />
        </label>
        <label>
          Due date
          <input type="date" value="${defaultDueDate}" data-bulk-due />
        </label>
      </div>
      <div class="page-actions u-mt-3">
        <button class="ghost-btn" type="button" data-apply-template>Apply template to selected</button>
      </div>
      <p class="muted" data-selected-risk-status>0 selected</p>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Playbook Templates</h2>
        ${statusChip({ label: `${playbookTemplates.length} templates`, tone: 'neutral' })}
      </div>
      <ul class="simple-list">
        ${
          playbookTemplates.length
            ? playbookTemplates
                .map(
                  (template) =>
                    `<li><strong>${template.name}</strong> - ${template.action} (owner: ${template.owner}, due in ${template.daysToDue} days)</li>`
                )
                .join('')
            : '<li>No risk playbook templates configured in settings.</li>'
        }
      </ul>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-settings>Manage templates</button>
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Bulk Mitigation History</h2>
        ${statusChip({ label: `${riskRuns.length} runs`, tone: riskRuns.length ? 'good' : 'neutral' })}
      </div>
      <ul class="simple-list">
        ${
          riskRuns.length
            ? riskRuns
                .slice(0, 8)
                .map((run) => {
                  const customerPreview = (run.customerNames || []).slice(0, 3).join(', ');
                  const remaining = Math.max(0, (run.customerNames || []).length - 3);
                  const previewText = remaining ? `${customerPreview}, +${remaining} more` : customerPreview;
                  return `<li>
                    <strong>${run.templateName || 'Custom mitigation'}</strong> - ${formatDateTime(run.at)} by ${run.createdBy || 'CSE'}
                    <p class="muted">Owner: ${run.owner || 'CSE'} · Due: ${formatDate(run.due)} · Coverage: ${(run.customerIds || []).length} customers</p>
                    <p class="muted">${previewText || 'No customer names captured.'}</p>
                  </li>`;
                })
                .join('')
            : '<li>No bulk mitigation runs captured yet.</li>'
        }
      </ul>
    </section>
  `;

  wrapper.querySelector('[data-go-manager]')?.addEventListener('click', () => navigate('manager'));
  wrapper.querySelector('[data-go-settings]')?.addEventListener('click', () => navigate('settings'));

  const body = wrapper.querySelector('[data-risk-body]');
  const selectAll = wrapper.querySelector('[data-select-all-risks]');
  const selectedStatus = wrapper.querySelector('[data-selected-risk-status]');

  const filteredRows = () =>
    rows.filter((row) => {
      if (filters.signalCode !== 'all' && !(row.signals || []).some((signal) => normalize(signal.code) === filters.signalCode)) {
        return false;
      }
      if (filters.severity !== 'all' && row.topSeverity !== filters.severity) return false;
      if (filters.renewalWindow !== 'all') {
        const days = row.renewalDays;
        if (filters.renewalWindow === 'unknown') {
          if (days !== null) return false;
        } else if (days === null) {
          return false;
        } else if (filters.renewalWindow === '30' && !(days <= 30)) {
          return false;
        } else if (filters.renewalWindow === '60' && !(days > 30 && days <= 60)) {
          return false;
        } else if (filters.renewalWindow === '90' && !(days > 60 && days <= 90)) {
          return false;
        } else if (filters.renewalWindow === 'over90' && !(days > 90)) {
          return false;
        }
      }
      if (filters.search) {
        const haystack = `${row.name} ${row.nextAction} ${row.cseAction} ${(row.signals || []).map((signal) => signalLabel(signal.code)).join(' ')}`.toLowerCase();
        if (!haystack.includes(filters.search)) return false;
      }
      return true;
    });

  const renderRows = () => {
    const visible = filteredRows();
    body.innerHTML = visible.length
      ? visible
          .map(
            (row) => `
          <tr>
            <td><input type="checkbox" data-risk-select="${row.id}" ${selected.has(row.id) ? 'checked' : ''} /></td>
            <td><a href="#" data-open-customer="${row.id}">${row.name}</a></td>
            <td>${statusChip({ label: row.health, tone: healthTone(row.health) })}</td>
            <td>${statusChip({ label: row.topSeverity === 'NONE' ? 'None' : row.topSeverity, tone: severityTone(row.topSeverity) })}</td>
            <td>${signalChips(row.signals)}</td>
            <td>${statusChip({ label: String(row.playbookCount), tone: row.playbookCount ? 'good' : 'neutral' })}</td>
            <td>${row.nextAction}</td>
            <td>${row.cseAction}</td>
          </tr>
        `
          )
          .join('')
      : '<tr><td colspan="8">No customers match current filters.</td></tr>';
    syncSelection();
  };

  const syncSelection = () => {
    if (selectedStatus) selectedStatus.textContent = `${selected.size} selected`;
    if (!selectAll) return;
    const visible = filteredRows();
    if (!visible.length) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
      return;
    }
    const visibleSelected = visible.filter((row) => selected.has(row.id)).length;
    selectAll.checked = visibleSelected > 0 && visibleSelected === visible.length;
    selectAll.indeterminate = visibleSelected > 0 && visibleSelected < visible.length;
  };

  renderRows();

  selectAll?.addEventListener('change', () => {
    const visible = filteredRows();
    if (selectAll.checked) {
      visible.forEach((row) => selected.add(row.id));
    } else {
      visible.forEach((row) => selected.delete(row.id));
    }
    renderRows();
  });

  wrapper.querySelector('[data-filter-search]')?.addEventListener('input', (event) => {
    filters.search = String(event.target.value || '').trim().toLowerCase();
    renderRows();
  });
  wrapper.querySelector('[data-filter-signal]')?.addEventListener('change', (event) => {
    filters.signalCode = String(event.target.value || 'all');
    renderRows();
  });
  wrapper.querySelector('[data-filter-severity]')?.addEventListener('change', (event) => {
    filters.severity = String(event.target.value || 'all').toUpperCase();
    renderRows();
  });
  wrapper.querySelector('[data-filter-renewal]')?.addEventListener('change', (event) => {
    filters.renewalWindow = String(event.target.value || 'all');
    renderRows();
  });

  wrapper.querySelector('[data-apply-template]')?.addEventListener('click', () => {
    if (!selected.size) {
      notify?.('Select at least one customer.');
      return;
    }
    const templateId = String(wrapper.querySelector('[data-bulk-template]')?.value || '').trim();
    if (!templateId) {
      notify?.('Select a playbook template.');
      return;
    }
    const template = playbookTemplates.find((item) => item.id === templateId);
    if (!template) {
      notify?.('Template not found.');
      return;
    }
    const owner = String(wrapper.querySelector('[data-bulk-owner]')?.value || template.owner || 'CSE').trim();
    const due = String(wrapper.querySelector('[data-bulk-due]')?.value || defaultDueDate).trim();
    onBulkApplyPlaybook?.([...selected], {
      templateId: template.id,
      templateName: template.name,
      action: template.action,
      owner,
      due,
      status: 'Planned'
    });
  });

  wrapper.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-risk-select]');
    if (!checkbox) return;
    const customerId = checkbox.getAttribute('data-risk-select');
    if (!customerId) return;
    if (checkbox.checked) selected.add(customerId);
    else selected.delete(customerId);
    syncSelection();
  });

  wrapper.addEventListener('click', (event) => {
    const link = event.target.closest('[data-open-customer]');
    if (link) {
      event.preventDefault();
      navigate('customer', { id: link.getAttribute('data-open-customer') });
    }
  });

  return wrapper;
};
