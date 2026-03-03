import { renderActionDrawer } from '../components/actionDrawer.js';
import { statusChip } from '../components/statusChip.js';
import { redactPlaybooksForCustomer } from '../lib/redaction.js';

const playbookCard = (playbook, checklistState) => `
  <article class="card compact-card">
    <div class="metric-head">
      <h3>${playbook.title}</h3>
      ${statusChip({ label: `${playbook.stage} / ${playbook.topic}`, tone: 'neutral' })}
    </div>
    <p class="muted">${playbook.next_best_action}</p>
    <p class="muted">Recommended program: ${playbook.recommended_program || 'None'}</p>
    <h4>Checklist</h4>
    <ul class="simple-list">
      ${(playbook.checklist || [])
        .map((item) => {
          const checked = Boolean(checklistState?.[playbook.id]?.[item.key]);
          return `<li>
            <label class="missing-field">
              <input type="checkbox" data-playbook="${playbook.id}" data-check="${item.key}" ${checked ? 'checked' : ''} />
              <span>${item.label}</span>
            </label>
          </li>`;
        })
        .join('')}
    </ul>
    <details>
      <summary>Templates</summary>
      <ul class="simple-list">
        <li><strong>Agenda:</strong> ${playbook.templates?.agenda || 'N/A'}</li>
        <li><strong>Follow-up:</strong> ${playbook.templates?.followup || 'N/A'}</li>
        <li><strong>Issue:</strong> ${playbook.templates?.issue || 'N/A'}</li>
      </ul>
    </details>
  </article>
`;

export const renderPlaybooksPage = (ctx) => {
  const { playbooks, customerSafe, checklistState, mode, navigate, onChecklistChange, notify } = ctx;
  const visiblePlaybooks = customerSafe ? redactPlaybooksForCustomer(playbooks) : playbooks || [];

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Playbooks</p>
        <h1>Response Plans and Templates</h1>
        <p class="hero-lede">Execute consistent response motions with checklist state persisted in local storage.</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Portfolio</button>
      </div>
    </header>

    <section class="dashboard-grid">
      <div class="main-col">
        <section class="card">
          <div class="metric-head">
            <h2>Playbooks</h2>
            ${statusChip({ label: `${visiblePlaybooks.length} available`, tone: 'neutral' })}
          </div>
          <div class="main-col">
            ${visiblePlaybooks.map((playbook) => playbookCard(playbook, checklistState)).join('') || '<p class="empty-text">No playbooks available.</p>'}
          </div>
        </section>
      </div>

      <div></div>
      <div data-drawer-host></div>
    </section>
  `;

  const drawer = renderActionDrawer({
    title: 'Playbooks Action Drawer',
    mode,
    nextActions: [
      'Complete checklist items for red/yellow accounts',
      'Attach playbook output to collaboration issue',
      'Map playbook to program enrollment'
    ],
    dueSoon: visiblePlaybooks.slice(0, 3).map((item) => `${item.title} (${item.stage})`),
    riskSignals: ['Unchecked internal escalation step', 'No follow-up evidence captured', 'No recommended program routed'],
    onGenerateAgenda: () => navigate('intake'),
    onGenerateEmail: () => navigate('intake'),
    onGenerateIssue: () => navigate('intake'),
    onExportPortfolio: () => navigate('exports'),
    onExportAccount: () => navigate('exports'),
    onExportSummary: () => navigate('exports')
  });
  wrapper.querySelector('[data-drawer-host]').appendChild(drawer);

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));

  wrapper.addEventListener('change', (event) => {
    const input = event.target.closest('[data-playbook][data-check]');
    if (!input) return;
    onChecklistChange(input.getAttribute('data-playbook'), input.getAttribute('data-check'), Boolean(input.checked));
    notify('Checklist updated.');
  });

  return wrapper;
};

export const playbooksCommandEntries = (playbooks = []) => [
  { id: 'playbooks-open', label: 'Open playbooks', meta: 'Playbooks', action: { route: 'playbooks' } },
  ...(playbooks || []).map((playbook) => ({
    id: `playbook-${playbook.id}`,
    label: `Playbook: ${playbook.title}`,
    meta: `${playbook.stage} / ${playbook.topic}`,
    action: { route: 'playbooks' }
  }))
];
