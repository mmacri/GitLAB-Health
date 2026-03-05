import { pageHeader } from '../components/pageHeader.js';
import { sectionCard } from '../components/sectionCard.js';
import { statusChip } from '../components/statusChip.js';
import { formatDate } from '../lib/date.js';

const reportCard = ({ id, title, summary, metrics = [], actionLabel }) => `
  <article class="card compact-card">
    <div class="metric-head">
      <h2>${title}</h2>
      ${statusChip({ label: 'Ready', tone: 'good' })}
    </div>
    <p class="muted">${summary}</p>
    <ul class="simple-list">
      ${metrics.map((item) => `<li>${item}</li>`).join('')}
    </ul>
    <div class="page-actions">
      <button class="ghost-btn" type="button" data-export-report="${id}">${actionLabel}</button>
    </div>
  </article>
`;

export const renderReportsPage = (ctx) => {
  const { manager, onExportManagerSummary, onExportPortfolioCsv, onExportProgramsCsv, navigate } = ctx;
  const rows = manager?.portfolio?.rows || [];
  const topRisk = manager?.portfolio?.atRisk?.slice(0, 5) || [];
  const adoption = manager?.portfolio?.adoptionCoverage || {};
  const engagement = manager?.portfolio?.engagementCoverage || {};
  const programFunnel = manager?.programFunnel || {};

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'reports');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Reports',
      title: 'Prebuilt Reporting Center',
      subtitle: 'Generate portfolio, adoption, program impact, and risk reviews for leadership and customer audiences.',
      meta: `Generated from ${rows.length} customers on ${formatDate(new Date().toISOString())}`,
      actionsHtml: `<button class="ghost-btn" type="button" data-go-manager>Open manager dashboard</button>`
    })}

    <section class="grid-cards">
      ${reportCard({
        id: 'portfolio-health',
        title: 'Portfolio Health Review',
        summary: 'Current health distribution and top at-risk accounts with next best action guidance.',
        metrics: [
          `Green: ${manager?.portfolio?.healthDistribution?.green || 0}`,
          `Yellow: ${manager?.portfolio?.healthDistribution?.yellow || 0}`,
          `Red: ${manager?.portfolio?.healthDistribution?.red || 0}`,
          `Top at-risk: ${topRisk.map((item) => item.customer.name).join(', ') || 'None'}`
        ],
        actionLabel: 'Export manager summary PDF'
      })}

      ${reportCard({
        id: 'adoption-coverage',
        title: 'Adoption Coverage',
        summary: 'Use-case adoption averages and engagement coverage windows for CSE planning.',
        metrics: [
          `Average adoption score: ${adoption.avgAdoption || 0}`,
          `Average CI/CD adoption: ${adoption.avgCicd || 0}%`,
          `Average Security adoption: ${adoption.avgSecurity || 0}%`,
          `Engagement 0-30d: ${engagement.in30 || 0}`
        ],
        actionLabel: 'Export portfolio CSV'
      })}

      ${reportCard({
        id: 'program-impact',
        title: 'Programs Impact',
        summary: 'Cohort funnel outcomes and completion influence on adoption motions.',
        metrics: [
          `Invited: ${programFunnel.invited || 0}`,
          `Attended: ${programFunnel.attended || 0}`,
          `Completed: ${programFunnel.completed || 0}`,
          `Programs tracked: ${(manager?.programs || []).length}`
        ],
        actionLabel: 'Export programs CSV'
      })}

      ${sectionCard({
        title: 'Risk Review Snapshot',
        chipHtml: statusChip({ label: `${topRisk.length} accounts`, tone: topRisk.length ? 'warn' : 'good' }),
        bodyHtml: `
          <ul class="simple-list">
            ${
              topRisk.length
                ? topRisk.map((item) => `<li><a href="#" data-open-customer="${item.customer.id}">${item.customer.name}</a> - ${item.riskSignals?.[0]?.detail || 'Review risk signals'}</li>`).join('')
                : '<li>No active at-risk accounts.</li>'
            }
          </ul>
        `
      })}
    </section>
  `;

  wrapper.querySelector('[data-go-manager]')?.addEventListener('click', () => navigate('manager'));
  wrapper.querySelector('[data-export-report="portfolio-health"]')?.addEventListener('click', () => onExportManagerSummary?.());
  wrapper.querySelector('[data-export-report="adoption-coverage"]')?.addEventListener('click', () => onExportPortfolioCsv?.());
  wrapper.querySelector('[data-export-report="program-impact"]')?.addEventListener('click', () => onExportProgramsCsv?.());

  wrapper.addEventListener('click', (event) => {
    const link = event.target.closest('[data-open-customer]');
    if (!link) return;
    event.preventDefault();
    navigate('customer', { id: link.getAttribute('data-open-customer') });
  });

  return wrapper;
};
