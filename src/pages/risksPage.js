import { pageHeader } from '../components/pageHeader.js';
import { statusChip } from '../components/statusChip.js';

const SIGNAL_LABELS = {
  LOW_ENGAGEMENT: 'Low Engagement',
  RENEWAL_SOON: 'Renewal Soon',
  LOW_SECURITY_ADOPTION: 'Low Security',
  LOW_CICD_ADOPTION: 'Low CI/CD',
  NO_TIME_TO_VALUE: 'No Time to Value'
};

const normalize = (value) => String(value || '').trim().toUpperCase();

const signalChips = (signals = []) => {
  if (!signals.length) return `<span class="status-chip status-chip--neutral">None</span>`;
  return signals
    .slice(0, 3)
    .map((signal) => {
      const label = SIGNAL_LABELS[normalize(signal.code)] || signal.code;
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
  const { workspace, portfolioRows, navigate } = ctx;
  const rows = (portfolioRows || []).map((row) => ({
    id: row.customer.id,
    name: row.customer.name,
    health: row.health,
    signals: row.riskSignals || [],
    nextAction: row.riskSignals?.[0]?.code
      ? `Address "${SIGNAL_LABELS[normalize(row.riskSignals[0].code)] || row.riskSignals[0].code}" — assign mitigation owner and due date`
      : 'Maintain engagement and monitor adoption movement',
    cseAction: cseAction(row.riskSignals || [])
  }));

  const playbookTemplates = workspace?.settings?.riskPlaybookTemplates || [];

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
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Health</th>
              <th>Active Risk Signals</th>
              <th>CSM Action</th>
              <th>CSE Action</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows.length
                ? rows
                    .map((row) => `
                      <tr>
                        <td><a href="#" data-open-customer="${row.id}">${row.name}</a></td>
                        <td>${statusChip({ label: row.health, tone: String(row.health).toLowerCase() === 'red' ? 'risk' : String(row.health).toLowerCase() === 'yellow' ? 'warn' : 'good' })}</td>
                        <td>${signalChips(row.signals)}</td>
                        <td>${row.nextAction}</td>
                        <td>${row.cseAction}</td>
                      </tr>
                    `)
                    .join('')
                : '<tr><td colspan="5">No customers available.</td></tr>'
            }
          </tbody>
        </table>
      </div>
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
  `;

  wrapper.querySelector('[data-go-manager]')?.addEventListener('click', () => navigate('manager'));
  wrapper.querySelector('[data-go-settings]')?.addEventListener('click', () => navigate('settings'));

  wrapper.addEventListener('click', (event) => {
    const link = event.target.closest('[data-open-customer]');
    if (!link) return;
    event.preventDefault();
    navigate('customer', { id: link.getAttribute('data-open-customer') });
  });

  return wrapper;
};
