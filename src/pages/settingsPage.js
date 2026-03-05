import { pageHeader } from '../components/pageHeader.js';
import { statusChip } from '../components/statusChip.js';

const weightFields = ['adoption', 'engagement', 'risk'];

export const renderSettingsPage = (ctx) => {
  const {
    workspace,
    navigate,
    onLoadSamplePortfolio,
    onImportWorkspace,
    onExportWorkspace,
    onResetWorkspace,
    onUpdateScoringWeights,
    onAddRiskTemplate,
    onAddProgramTemplate,
    onCreateSnapshot,
    notify
  } = ctx;

  const settings = workspace?.settings || {};
  const scoringWeights = settings.scoringWeights || {};
  const riskTemplates = settings.riskPlaybookTemplates || [];
  const programTemplates = settings.programTemplates || [];

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'settings');
  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Settings',
      title: 'Workspace Settings',
      subtitle:
        'Manage workspace persistence, import/export, sample portfolio loading, templates, and scoring weights.',
      actionsHtml: `<button class="ghost-btn" type="button" data-go-reports>Open reports</button>`
    })}

    <section class="card">
      <div class="metric-head">
        <h2>Workspace Controls</h2>
        ${statusChip({ label: `v${workspace?.version || '3.0.0'}`, tone: 'neutral' })}
      </div>
      <div class="page-actions">
        <button class="qa" type="button" data-load-sample>Load sample portfolio</button>
        <button class="ghost-btn" type="button" data-export-workspace>Export JSON</button>
        <label class="ghost-btn" style="cursor:pointer;">
          Import JSON
          <input type="file" accept="application/json" data-import-workspace hidden />
        </label>
        <button class="ghost-btn" type="button" data-create-snapshot>Create monthly snapshot</button>
        <button class="ghost-btn" type="button" data-reset-workspace>Reset local state</button>
      </div>
      <p class="muted">Updated at: ${workspace?.updatedAt || 'n/a'}</p>
    </section>

    <section class="grid-cards">
      <article class="card compact-card">
        <div class="metric-head">
          <h2>Scoring Weights</h2>
          ${statusChip({ label: 'Explainable scoring', tone: 'neutral' })}
        </div>
        <form class="form-grid" data-score-weights>
          ${weightFields
            .map(
              (field) => `
            <label>
              ${field}
              <input name="${field}" type="number" min="0" max="100" value="${Number(scoringWeights[field] || 0)}" />
            </label>
          `
            )
            .join('')}
          <div class="form-span page-actions">
            <button class="ghost-btn" type="submit">Update weights</button>
          </div>
        </form>
      </article>

      <article class="card compact-card">
        <div class="metric-head">
          <h2>Risk Playbook Templates</h2>
          ${statusChip({ label: `${riskTemplates.length} templates`, tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          ${
            riskTemplates.length
              ? riskTemplates
                  .map((template) => `<li><strong>${template.name}</strong> - ${template.action} (${template.owner}, ${template.daysToDue}d)</li>`)
                  .join('')
              : '<li>No risk templates configured.</li>'
          }
        </ul>
        <form class="form-grid" data-add-risk-template>
          <label><span>Name</span><input name="name" required /></label>
          <label><span>Owner</span><input name="owner" value="CSE" /></label>
          <label><span>Days to due</span><input name="daysToDue" type="number" min="1" value="14" /></label>
          <label class="form-span"><span>Action</span><input name="action" required /></label>
          <div class="form-span page-actions">
            <button class="ghost-btn" type="submit">Add template</button>
          </div>
        </form>
      </article>

      <article class="card compact-card">
        <div class="metric-head">
          <h2>Program Templates</h2>
          ${statusChip({ label: `${programTemplates.length} templates`, tone: 'neutral' })}
        </div>
        <ul class="simple-list">
          ${
            programTemplates.length
              ? programTemplates.map((template) => `<li><strong>${template.name}</strong> - ${template.type}</li>`).join('')
              : '<li>No program templates configured.</li>'
          }
        </ul>
        <form class="form-grid" data-add-program-template>
          <label><span>Name</span><input name="name" required /></label>
          <label><span>Type</span><input name="type" value="Lab" required /></label>
          <div class="form-span page-actions">
            <button class="ghost-btn" type="submit">Add template</button>
          </div>
        </form>
      </article>
    </section>
  `;

  wrapper.querySelector('[data-go-reports]')?.addEventListener('click', () => navigate('reports'));
  wrapper.querySelector('[data-load-sample]')?.addEventListener('click', () => onLoadSamplePortfolio?.());
  wrapper.querySelector('[data-export-workspace]')?.addEventListener('click', () => onExportWorkspace?.());
  wrapper.querySelector('[data-create-snapshot]')?.addEventListener('click', () => onCreateSnapshot?.());
  wrapper.querySelector('[data-reset-workspace]')?.addEventListener('click', () => onResetWorkspace?.());

  wrapper.querySelector('[data-import-workspace]')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      onImportWorkspace?.(parsed);
      event.target.value = '';
    } catch (error) {
      notify?.(`Import failed: ${error.message}`);
    }
  });

  wrapper.querySelector('[data-score-weights]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onUpdateScoringWeights?.({
      adoption: Number(form.get('adoption') || 0),
      engagement: Number(form.get('engagement') || 0),
      risk: Number(form.get('risk') || 0)
    });
  });

  wrapper.querySelector('[data-add-risk-template]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddRiskTemplate?.({
      name: String(form.get('name') || '').trim(),
      owner: String(form.get('owner') || 'CSE').trim(),
      daysToDue: Number(form.get('daysToDue') || 14),
      action: String(form.get('action') || '').trim()
    });
  });

  wrapper.querySelector('[data-add-program-template]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddProgramTemplate?.({
      name: String(form.get('name') || '').trim(),
      type: String(form.get('type') || 'Lab').trim()
    });
  });

  return wrapper;
};
