import { pageHeader } from '../components/pageHeader.js';
import { statusChip } from '../components/statusChip.js';
import { ensurePtCalibration } from '../config/ptCalibration.js';

const weightFields = ['adoption', 'engagement', 'risk'];
const sourceBackedVariableChip = statusChip({ label: 'Source-backed variable', tone: 'good' });
const localCoefficientChip = statusChip({ label: 'Local heuristic coefficient', tone: 'warn' });

const provenanceCell = () => `
  <div class="chip-row">
    ${sourceBackedVariableChip}
    ${localCoefficientChip}
  </div>
`;

export const renderSettingsPage = (ctx) => {
  const {
    workspace,
    navigate,
    onLoadSamplePortfolio,
    onImportWorkspace,
    onExportWorkspace,
    onResetWorkspace,
    onUpdateScoringWeights,
    onResetPtCalibration,
    onAddRiskTemplate,
    onAddProgramTemplate,
    onCreateSnapshot,
    theme = 'light',
    onSetTheme,
    density,
    onSetDensity,
    defaultMode = 'today',
    defaultPersona = 'cse',
    onSetDefaultMode,
    onSetDefaultPersona,
    notify
  } = ctx;

  const settings = workspace?.settings || {};
  const scoringWeights = settings.scoringWeights || {};
  const ptCalibration = ensurePtCalibration(settings.ptCalibration);
  const riskTemplates = settings.riskPlaybookTemplates || [];
  const programTemplates = settings.programTemplates || [];
  const pteWeightRows = [
    {
      metric: 'Adoption depth weight',
      value: ptCalibration.pte.weights.adoption,
      why: 'Promotes expansion only when measured use-case and stage adoption are already strong.'
    },
    {
      metric: 'Engagement quality weight',
      value: ptCalibration.pte.weights.engagement,
      why: 'Captures whether sponsor/cadence quality is sufficient for a credible expansion motion.'
    },
    {
      metric: 'Risk stability weight (100-risk)',
      value: ptCalibration.pte.weights.riskStability,
      why: 'Penalizes expansion confidence when retention pressure is already elevated.'
    },
    {
      metric: 'CI/CD adoption depth weight',
      value: ptCalibration.pte.weights.cicd,
      why: 'Aligns to GitLab value realization where CI/CD adoption is a core realization path.'
    },
    {
      metric: 'Security adoption depth weight',
      value: ptCalibration.pte.weights.security,
      why: 'Recognizes secure usage as expansion evidence in enterprise platform narratives.'
    },
    {
      metric: 'DevSecOps stage progression weight',
      value: ptCalibration.pte.weights.stageCoverage,
      why: 'Adds breadth signal for platform journey progression beyond a single use case.'
    }
  ];

  const ptcWeightRows = [
    {
      metric: 'Risk burden weight',
      value: ptCalibration.ptc.weights.risk,
      why: 'Keeps churn pressure primarily tied to explicit active risk signals.'
    },
    {
      metric: 'Adoption gap weight (100-adoption)',
      value: ptCalibration.ptc.weights.adoptionGap,
      why: 'Models retention pressure from unrealized platform value and incomplete usage depth.'
    },
    {
      metric: 'Engagement gap weight (100-engagement)',
      value: ptCalibration.ptc.weights.engagementGap,
      why: 'Accounts for governance drift when execution cadence is weak or stale.'
    },
    {
      metric: 'Renewal pressure weight',
      value: ptCalibration.ptc.weights.renewalPressure,
      why: 'Increases urgency as contractual decision windows approach.'
    }
  ];

  const thresholdRows = [
    {
      metric: 'Band high threshold',
      value: `>= ${ptCalibration.banding.high}`,
      why: 'Classifies accounts that require high-confidence expansion or high-pressure retention response.'
    },
    {
      metric: 'Band medium threshold',
      value: `>= ${ptCalibration.banding.medium}`,
      why: 'Separates moderate posture from low posture for workload sequencing.'
    },
    {
      metric: 'Renewal pressure (unknown renewal date)',
      value: ptCalibration.renewalPressure.unknownScore,
      why: 'Assigns non-zero uncertainty pressure when renewal timing data is incomplete.'
    }
  ];

  const renewalBucketRows = ptCalibration.renewalPressure.buckets.map((bucket, idx) => {
    const previous = idx > 0 ? ptCalibration.renewalPressure.buckets[idx - 1].maxDays : null;
    const maxDays = Number(bucket.maxDays);
    let label = '';
    if (!Number.isFinite(maxDays)) label = `>${previous ?? 180} days`;
    else if (previous === null) label = `<=${maxDays} days`;
    else label = `${previous + 1}-${maxDays} days`;
    return {
      metric: `Renewal window ${label}`,
      value: Number(bucket.score),
      why: 'Maps renewal proximity into a normalized pressure score used in PtC.'
    };
  });

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
        <label class="ghost-btn u-pointer">
          Import JSON
          <input type="file" accept="application/json" data-import-workspace hidden />
        </label>
        <button class="ghost-btn" type="button" data-create-snapshot>Create monthly snapshot</button>
        <button class="ghost-btn" type="button" data-reset-workspace>Reset local state</button>
      </div>
      <p class="muted">Updated at: ${workspace?.updatedAt || 'n/a'}</p>
      <fieldset class="settings-group u-mt-3">
        <legend class="settings-group__label">Row Density</legend>
        <div class="density-control" role="group" aria-label="Row density">
          <button class="density-btn ${density === 'compact' ? 'active' : ''}" type="button" data-density-option="compact" aria-pressed="${density === 'compact'}">
            <span class="density-btn__preview" data-size="compact"></span>
            Compact
          </button>
          <button class="density-btn ${density === 'default' ? 'active' : ''}" type="button" data-density-option="default" aria-pressed="${density === 'default'}">
            <span class="density-btn__preview" data-size="default"></span>
            Default
          </button>
          <button class="density-btn ${density === 'comfortable' ? 'active' : ''}" type="button" data-density-option="comfortable" aria-pressed="${density === 'comfortable'}">
            <span class="density-btn__preview" data-size="comfortable"></span>
            Comfortable
          </button>
        </div>
      </fieldset>

      <fieldset class="settings-group u-mt-3">
        <legend class="settings-group__label">Theme</legend>
        <div class="density-control" role="group" aria-label="Theme">
          <button class="density-btn ${theme === 'light' ? 'active' : ''}" type="button" data-theme-option="light" aria-pressed="${theme === 'light'}">
            <span class="density-btn__preview" data-size="default"></span>
            Light
          </button>
          <button class="density-btn ${theme === 'dark' ? 'active' : ''}" type="button" data-theme-option="dark" aria-pressed="${theme === 'dark'}">
            <span class="density-btn__preview" data-size="compact"></span>
            Dark
          </button>
        </div>
      </fieldset>

      <div class="form-grid u-mt-3">
        <label>
          Default Mode on Launch
          <select data-default-mode>
            <option value="today" ${defaultMode === 'today' ? 'selected' : ''}>Today</option>
            <option value="review" ${defaultMode === 'review' ? 'selected' : ''}>Review</option>
            <option value="deep" ${defaultMode === 'deep' ? 'selected' : ''}>Deep Dive</option>
          </select>
        </label>
        <label>
          Default Persona on Launch
          <select data-default-persona>
            <option value="cse" ${defaultPersona === 'cse' ? 'selected' : ''}>CSE On-Demand</option>
            <option value="manager" ${defaultPersona === 'manager' ? 'selected' : ''}>CSE Manager</option>
          </select>
        </label>
      </div>
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
          <h2>PtE / PtC Calibration Profile</h2>
          ${statusChip({ label: `${ptCalibration.profileId} · ${ptCalibration.profileVersion}`, tone: 'neutral' })}
        </div>
        <p class="muted">${ptCalibration.provenance}</p>
        <p class="muted">
          Each row shows provenance. Variables align to handbook concepts; coefficient values and thresholds are local and should be calibrated with observed outcomes.
        </p>

        <p class="kicker">PtE coefficients</p>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Term</th>
                <th>Value</th>
                <th>Provenance</th>
                <th>Why this term exists</th>
              </tr>
            </thead>
            <tbody>
              ${pteWeightRows
                .map(
                  (row) => `
                <tr>
                  <td>${row.metric}</td>
                  <td>${row.value}</td>
                  <td>${provenanceCell()}</td>
                  <td>${row.why}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <p class="kicker">PtC coefficients</p>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Term</th>
                <th>Value</th>
                <th>Provenance</th>
                <th>Why this term exists</th>
              </tr>
            </thead>
            <tbody>
              ${ptcWeightRows
                .map(
                  (row) => `
                <tr>
                  <td>${row.metric}</td>
                  <td>${row.value}</td>
                  <td>${provenanceCell()}</td>
                  <td>${row.why}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <p class="kicker">Banding and renewal pressure thresholds</p>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Threshold</th>
                <th>Value</th>
                <th>Provenance</th>
                <th>Why this term exists</th>
              </tr>
            </thead>
            <tbody>
              ${[...thresholdRows, ...renewalBucketRows]
                .map(
                  (row) => `
                <tr>
                  <td>${row.metric}</td>
                  <td>${row.value}</td>
                  <td>${provenanceCell()}</td>
                  <td>${row.why}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <div class="page-actions">
          <button class="ghost-btn" type="button" data-reset-pt-calibration>Restore default calibration profile</button>
        </div>
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
  wrapper.querySelectorAll('[data-density-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-density-option');
      onSetDensity?.(value);
    });
  });

  wrapper.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-theme-option');
      onSetTheme?.(value);
      notify?.(`Theme set to ${value}.`);
    });
  });

  wrapper.querySelector('[data-default-mode]')?.addEventListener('change', (event) => {
    const value = String(event.target.value || 'today').trim().toLowerCase();
    onSetDefaultMode?.(value);
    notify?.(`Default mode set to ${value === 'deep' ? 'Deep Dive' : value}.`);
  });

  wrapper.querySelector('[data-default-persona]')?.addEventListener('change', (event) => {
    const value = String(event.target.value || 'cse').trim().toLowerCase();
    onSetDefaultPersona?.(value);
    notify?.(`Default persona set to ${value === 'manager' ? 'CSE Manager' : 'CSE On-Demand'}.`);
  });

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

  wrapper.querySelector('[data-reset-pt-calibration]')?.addEventListener('click', () => {
    onResetPtCalibration?.();
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
