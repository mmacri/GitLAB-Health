import { CUSTOMER_SAFE_FIELDS, CUSTOMER_SAFE_LABELS } from '../config/customerSafeFields.js';
import { ENGAGEMENT_TYPES } from '../config/engagementTypes.js';
import { downloadTextFile, serializeCsv } from '../utils/exportHelpers.js';

const formatDateStamp = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const trapFocus = (container) => {
  const focusable = () =>
    [...container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
      (item) => !item.disabled
    );
  const onKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const nodes = focusable();
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', onKeyDown);
  return () => container.removeEventListener('keydown', onKeyDown);
};

const normalize = (value) => String(value || '').trim().toUpperCase();

export const createEngagementExportModal = ({
  workspace,
  customerSafe,
  maskField,
  onClose,
  notify
}) => {
  const fieldOptions = [
    ['accountName', 'Account Name'],
    ['engagementType', 'Engagement Type'],
    ['engagementStatus', 'Engagement Status'],
    ['engagementDate', 'Engagement Date'],
    ['requestedBy', 'Requested By'],
    ['arr', 'ARR'],
    ['renewalRisk', 'Renewal Risk'],
    ['internalNotes', 'Internal Notes']
  ].filter(([key]) => !(customerSafe && CUSTOMER_SAFE_FIELDS.hidden.includes(key)));

  const wrapper = document.createElement('div');
  wrapper.className = 'app-modal is-open';
  wrapper.setAttribute('aria-hidden', 'false');
  wrapper.innerHTML = `
    <div class="app-modal__backdrop" data-close></div>
    <div class="app-modal__panel" role="dialog" aria-modal="true" aria-label="Export engagement data">
      <header class="app-modal__header">
        <h2>Export Engagement Data</h2>
        <button class="ghost-btn" type="button" data-close>Close</button>
      </header>
      <div class="app-modal__body">
        <form class="form-grid" data-export-form>
          <fieldset class="form-span">
            <legend>Engagement Types</legend>
            <div class="filter-group">
              ${Object.entries(ENGAGEMENT_TYPES)
                .map(
                  ([key, meta]) => `
                    <label class="safe-toggle">
                      <input type="checkbox" name="types" value="${key}" checked />
                      <span>${meta.label}</span>
                    </label>
                  `
                )
                .join('')}
            </div>
          </fieldset>

          <fieldset class="form-span">
            <legend>Fields</legend>
            <div class="filter-group">
              ${fieldOptions
                .map(
                  ([key, label]) => `
                    <label class="safe-toggle">
                      <input type="checkbox" name="fields" value="${key}" checked />
                      <span>${label}</span>
                    </label>
                  `
                )
                .join('')}
            </div>
          </fieldset>

          <label class="form-span">
            <span>Format</span>
            <select name="format">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>
          <div class="form-span page-actions">
            <button class="qa" type="submit">Export</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const close = () => {
    cleanup?.();
    wrapper.remove();
    onClose?.();
  };

  wrapper.querySelectorAll('[data-close]').forEach((item) => item.addEventListener('click', close));
  wrapper.addEventListener('click', (event) => {
    if (event.target === wrapper) close();
  });

  const rows = (workspace?.customers || []).map((customer) => ({
    accountName: customer.name,
    engagementType: normalize(customer.engagementType),
    engagementStatus: normalize(customer.engagementStatus),
    engagementDate: customer.engagementDate || '',
    requestedBy: normalize(customer.requestedBy),
    arr: customer.arr,
    renewalRisk: customer.renewalRisk,
    internalNotes: customer.internalNotes || customer.notes || ''
  }));

  wrapper.querySelector('[data-export-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedTypes = new Set(form.getAll('types').map((value) => normalize(value)));
    const selectedFields = form
      .getAll('fields')
      .map((field) => String(field))
      .filter((field) => !(customerSafe && CUSTOMER_SAFE_FIELDS.hidden.includes(field)));
    const format = String(form.get('format') || 'csv').toLowerCase();

    const filteredRows = rows
      .filter((row) => selectedTypes.size === 0 || selectedTypes.has(normalize(row.engagementType)))
      .map((row) => {
        const output = {};
        selectedFields.forEach((field) => {
          const value = maskField?.(field, row[field]);
          if (value !== null && value !== undefined) output[field] = value;
        });
        return output;
      });

    if (!filteredRows.length) {
      notify?.('No rows matched selected export filters.');
      return;
    }

    const suffix = selectedTypes.size === 1 ? [...selectedTypes][0].toLowerCase() : 'all';
    const stamp = formatDateStamp(new Date());
    if (format === 'json') {
      const filename = `cse-export-${suffix}-${stamp}.json`;
      downloadTextFile(filename, JSON.stringify(filteredRows, null, 2), 'application/json;charset=utf-8');
      notify?.(`Exported ${filename}`);
      close();
      return;
    }

    const csv = serializeCsv(
      filteredRows,
      selectedFields.map((field) => ({
        label: CUSTOMER_SAFE_LABELS[field] || field,
        value: (row) => row[field]
      }))
    );
    const filename = `cse-export-${suffix}-${stamp}.csv`;
    downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
    notify?.(`Exported ${filename}`);
    close();
  });

  const cleanup = trapFocus(wrapper.querySelector('.app-modal__panel'));
  setTimeout(() => wrapper.querySelector('input,button,select,textarea')?.focus(), 0);
  return wrapper;
};
