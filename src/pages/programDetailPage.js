import { pageHeader } from '../components/pageHeader.js';
import { statusChip } from '../components/statusChip.js';
import { metricTile } from '../components/metricTile.js';
import { formatDate } from '../lib/date.js';
import { funnelChartSvg } from '../lib/charts.js';

const byId = (items = []) =>
  items.reduce((acc, item) => {
    if (item?.id) acc[item.id] = item;
    return acc;
  }, {});

const adoptionImpactRows = (impact = {}) => {
  const entries = Object.entries(impact || {});
  if (!entries.length) return '<li>No adoption deltas captured yet.</li>';
  return entries.map(([key, value]) => `<li>${key}: ${value > 0 ? '+' : ''}${value}%</li>`).join('');
};

export const renderProgramDetailPage = (ctx) => {
  const { workspace, program, navigate, onAddCustomerToProgram, onUpdateProgramFunnel, onExportFollowUpList, notify } = ctx;
  const customerMap = byId(workspace?.customers || []);
  const availableCustomers = (workspace?.customers || []).filter(
    (customer) => !(program?.cohortCustomerIds || []).includes(customer.id)
  );
  const cohort = (program?.cohortCustomerIds || []).map((id) => customerMap[id]).filter(Boolean);
  const invited = Number(program?.funnel?.invited || 0);
  const attended = Number(program?.funnel?.attended || 0);
  const completed = Number(program?.funnel?.completed || 0);
  const conversion = invited ? Math.round((completed / invited) * 100) : 0;

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'program-detail');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Program',
      title: program?.name || 'Program',
      subtitle: program?.objective || 'Enablement program detail with funnel and cohort management.',
      meta: `Type: ${program?.type || 'Program'} | Start: ${formatDate(program?.startDate)} | End: ${formatDate(program?.endDate)}`,
      actionsHtml: `
        <button class="ghost-btn" type="button" data-go-programs>Back to programs</button>
        <button class="qa" type="button" data-export-followup>Export follow-up list</button>
      `
    })}

    <section class="card">
      <div class="kpi-grid kpi-4">
        ${metricTile({ label: 'Invited', value: invited, tone: 'neutral' })}
        ${metricTile({ label: 'Attended', value: attended, tone: attended > 0 ? 'good' : 'warn' })}
        ${metricTile({ label: 'Completed', value: completed, tone: completed > 0 ? 'good' : 'warn' })}
        ${metricTile({ label: 'Completion rate', value: `${conversion}%`, tone: conversion >= 60 ? 'good' : 'warn' })}
      </div>
    </section>

    <section class="grid-cards">
      <article class="card">
        <div class="metric-head">
          <h2>Program Funnel</h2>
          ${statusChip({ label: `${conversion}% complete`, tone: conversion >= 60 ? 'good' : 'warn' })}
        </div>
        <div class="chart-wrap">${funnelChartSvg([
          { label: 'Invited', value: invited, color: '#6E49CB' },
          { label: 'Attended', value: attended, color: '#0284C7' },
          { label: 'Completed', value: completed, color: '#16A34A' }
        ])}</div>
        <form class="form-grid" data-funnel-form>
          <label>
            Invited
            <input name="invited" type="number" min="0" value="${invited}" />
          </label>
          <label>
            Attended
            <input name="attended" type="number" min="0" value="${attended}" />
          </label>
          <label>
            Completed
            <input name="completed" type="number" min="0" value="${completed}" />
          </label>
          <div class="form-span page-actions">
            <button class="ghost-btn" type="submit">Update funnel</button>
          </div>
        </form>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Cohort Customers</h2>
          ${statusChip({ label: `${cohort.length} customers`, tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          ${
            cohort.length
              ? cohort.map((customer) => `<li><a href="#" data-open-customer="${customer.id}">${customer.name}</a> (${customer.stage})</li>`).join('')
              : '<li>No cohort customers yet.</li>'
          }
        </ul>
        <label>
          Add customer
          <select data-add-customer>
            <option value="">Select customer</option>
            ${availableCustomers.map((customer) => `<option value="${customer.id}">${customer.name}</option>`).join('')}
          </select>
        </label>
        <div class="page-actions u-mt-3">
          <button class="ghost-btn" type="button" data-add-customer-submit>Add to cohort</button>
        </div>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Sessions</h2>
          ${statusChip({ label: `${(program?.sessions || []).length} sessions`, tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          ${
            (program?.sessions || []).length
              ? (program.sessions || [])
                  .map(
                    (session) =>
                      `<li><strong>${formatDate(session.date)}</strong> - ${session.title} <span class="muted">${session.artifact || ''}</span></li>`
                  )
                  .join('')
              : '<li>No sessions planned.</li>'
          }
        </ul>
      </article>

      <article class="card">
        <div class="metric-head">
          <h2>Adoption Impact</h2>
          ${statusChip({ label: 'Use-case deltas', tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          ${adoptionImpactRows(program?.adoptionImpact || {})}
        </ul>
      </article>
    </section>
  `;

  wrapper.querySelector('[data-go-programs]')?.addEventListener('click', () => navigate('programs'));
  wrapper.querySelector('[data-export-followup]')?.addEventListener('click', () => onExportFollowUpList?.(program?.id));

  wrapper.querySelector('[data-funnel-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onUpdateProgramFunnel?.(program?.id, {
      invited: Number(form.get('invited') || 0),
      attended: Number(form.get('attended') || 0),
      completed: Number(form.get('completed') || 0)
    });
  });

  wrapper.querySelector('[data-add-customer-submit]')?.addEventListener('click', () => {
    const customerId = String(wrapper.querySelector('[data-add-customer]')?.value || '').trim();
    if (!customerId) {
      notify?.('Select a customer to add.');
      return;
    }
    onAddCustomerToProgram?.(program?.id, customerId);
  });

  wrapper.addEventListener('click', (event) => {
    const customerLink = event.target.closest('[data-open-customer]');
    if (!customerLink) return;
    event.preventDefault();
    navigate('customer', { id: customerLink.getAttribute('data-open-customer') });
  });

  return wrapper;
};
