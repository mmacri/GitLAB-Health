import { metricTile } from '../components/metricTile.js';
import { pageHeader } from '../components/pageHeader.js';
import { statusChip } from '../components/statusChip.js';
import { triggerDownload } from '../lib/exports.js';
import {
  SIMULATOR_PRESETS,
  buildSimulatorExecutiveSummaryMarkdown,
  buildSimulatorIssueBodyMarkdown,
  buildSimulatorSuccessPlanMarkdown,
  buildSimulatorWorkshopPlanMarkdown,
  deriveSimulatorState,
  presetCapabilityMap,
  simulatorStageOrder
} from '../lib/simulator.js';

const DEFAULT_PRESET = 'starter_scm_only';
const AREA_ORDER = ['SCM', 'CI', 'CD', 'Security', 'Analytics', 'OperatingModel'];
const AREA_LABELS = {
  SCM: 'SCM',
  CI: 'CI',
  CD: 'CD',
  Security: 'Security',
  Analytics: 'Analytics',
  OperatingModel: 'Operating Model'
};

const LIFECYCLE_SEGMENTS = [
  { id: 'plan', label: 'Plan', area: 'OperatingModel' },
  { id: 'code', label: 'Code', area: 'SCM' },
  { id: 'build', label: 'Build', area: 'CI' },
  { id: 'test', label: 'Test', area: 'CI' },
  { id: 'release', label: 'Release', area: 'CD' },
  { id: 'deploy', label: 'Deploy', area: 'CD' },
  { id: 'operate', label: 'Operate', area: 'Analytics' },
  { id: 'monitor', label: 'Monitor', area: 'Analytics' },
  { id: 'secure', label: 'Secure', area: 'Security' }
];

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const toneForProgress = (enabled = 0, total = 0) => {
  if (!total || enabled <= 0) return 'neutral';
  if (enabled >= total) return 'good';
  return 'warn';
};

const colorForProgress = (enabled = 0, total = 0) => {
  if (!total || enabled <= 0) return '#d1d5db';
  if (enabled >= total) return '#16a34a';
  return '#d97706';
};

const areaMetrics = (capabilities = [], selected = {}) => {
  const metrics = {};
  AREA_ORDER.forEach((area) => {
    const list = (capabilities || []).filter((item) => item.area === area);
    const enabled = list.filter((item) => selected[item.id]).length;
    metrics[area] = {
      total: list.length,
      enabled
    };
  });
  return metrics;
};

const lifecycleSvg = (areaStats = {}) => {
  const boxes = LIFECYCLE_SEGMENTS.map((item, index) => {
    const x = 12 + index * 92;
    const state = areaStats[item.area] || { enabled: 0, total: 0 };
    const fill = colorForProgress(state.enabled, state.total);
    return `
      <g>
        <rect x="${x}" y="24" width="80" height="48" rx="9" fill="${fill}" opacity="0.22" stroke="${fill}"></rect>
        <text x="${x + 40}" y="52" text-anchor="middle" fill="#1f2937" font-size="12">${item.label}</text>
      </g>
    `;
  }).join('');

  const connectors = Array.from({ length: LIFECYCLE_SEGMENTS.length - 1 }, (_, index) => {
    const x1 = 92 + index * 92;
    const x2 = x1 + 12;
    return `<line x1="${x1}" y1="48" x2="${x2}" y2="48" stroke="#94a3b8" stroke-width="2"></line>`;
  }).join('');

  return `
    <svg viewBox="0 0 840 96" class="lifecycle-svg" role="img" aria-label="DevSecOps lifecycle adoption map">
      ${connectors}
      ${boxes}
    </svg>
  `;
};

const areaCapabilityGroups = (capabilities = []) =>
  AREA_ORDER.map((area) => ({
    area,
    label: AREA_LABELS[area] || area,
    capabilities: (capabilities || []).filter((item) => item.area === area)
  })).filter((entry) => entry.capabilities.length > 0);

const buildArtifactText = (kind, state, capabilities, customerSafe, scenarioName) => {
  if (kind === 'success-plan') {
    return buildSimulatorSuccessPlanMarkdown({
      state,
      customerSafe,
      customerName: scenarioName
    });
  }
  if (kind === 'executive-summary') {
    return buildSimulatorExecutiveSummaryMarkdown({
      state,
      customerSafe: true,
      customerName: scenarioName
    });
  }
  if (kind === 'workshop-plan') {
    return buildSimulatorWorkshopPlanMarkdown({
      state,
      capabilities,
      customerSafe,
      customerName: scenarioName
    });
  }
  return buildSimulatorIssueBodyMarkdown({
    state,
    customerSafe,
    customerName: scenarioName
  });
};

const artifactFilename = (kind, scenarioName) => {
  const safeName = String(scenarioName || 'scenario-customer').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (kind === 'success-plan') return `simulator-success-plan-${safeName}.md`;
  if (kind === 'executive-summary') return `simulator-executive-summary-${safeName}.md`;
  if (kind === 'workshop-plan') return `simulator-workshop-plan-${safeName}.md`;
  return `simulator-issue-body-${safeName}.md`;
};

export const renderSimulatorPage = (ctx) => {
  const {
    capabilities = [],
    rules = [],
    customerSafe = false,
    onToggleSafe,
    navigate,
    copyText,
    notify
  } = ctx;

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'simulator');

  const presets = [...SIMULATOR_PRESETS, { id: 'custom', label: 'Custom' }];
  const groupedAreas = areaCapabilityGroups(capabilities);
  let selectedCapabilities = presetCapabilityMap(DEFAULT_PRESET, capabilities);
  let selectedPreset = DEFAULT_PRESET;
  let scenarioName = 'Scenario Customer';
  let activeArtifact = 'executive-summary';

  wrapper.innerHTML = `
    ${pageHeader({
      eyebrow: 'Simulator',
      title: 'Adoption Simulator',
      subtitle:
        'Toggle capability scenarios to forecast journey stage, platform adoption depth, and next-best CSE actions using deterministic handbook-aligned rules.',
      actionsHtml: `
        <button class="ghost-btn" type="button" data-go-today>Back to Today</button>
        <label class="safe-toggle">
          <input type="checkbox" data-safe-toggle ${customerSafe ? 'checked' : ''} />
          <span>Customer-safe</span>
        </label>
      `
    })}

    <section class="simulator-grid">
      <div class="simulator-col">
        <article class="card compact-card">
          <div class="metric-head">
            <h3>Controls</h3>
            ${statusChip({ label: 'Scenario', tone: 'neutral' })}
          </div>
          <div class="form-grid">
            <label class="form-span">
              Preset scenario
              <select data-simulator-preset>
                ${presets.map((item) => `<option value="${item.id}" ${item.id === selectedPreset ? 'selected' : ''}>${item.label}</option>`).join('')}
              </select>
            </label>
            <label class="form-span">
              Scenario name
              <input type="text" data-simulator-name value="${escapeHtml(scenarioName)}" />
            </label>
          </div>
          <div class="simulator-groups" data-capability-groups>
            ${groupedAreas
              .map(
                (group) => `
                  <details class="simulator-group" data-area-group="${group.area}" open>
                    <summary>${group.label}</summary>
                    <div class="simulator-cap-list">
                      ${group.capabilities
                        .map(
                          (capability) => `
                            <label class="simulator-capability">
                              <input type="checkbox" data-capability-toggle="${capability.id}" />
                              <span>${capability.label}</span>
                            </label>
                            <div class="simulator-cap-links">
                              ${(capability.doc_links || [])
                                .slice(0, 2)
                                .map((link) => `<a href="${link}" target="_blank" rel="noopener noreferrer">Doc</a>`)
                                .join('')}
                            </div>
                          `
                        )
                        .join('')}
                    </div>
                  </details>
                `
              )
              .join('')}
          </div>
        </article>
      </div>

      <div class="simulator-col">
        <article class="card compact-card" data-simulator-lifecycle></article>
        <article class="card compact-card" data-simulator-stage></article>
      </div>

      <div class="simulator-col">
        <article class="card compact-card" data-simulator-actions></article>
        <article class="card compact-card" data-simulator-forecast></article>
        <article class="card compact-card" data-simulator-artifacts></article>
        <article class="card compact-card" data-simulator-references></article>
      </div>
    </section>
  `;

  const presetSelect = wrapper.querySelector('[data-simulator-preset]');
  const nameInput = wrapper.querySelector('[data-simulator-name]');
  const lifecycleHost = wrapper.querySelector('[data-simulator-lifecycle]');
  const stageHost = wrapper.querySelector('[data-simulator-stage]');
  const actionsHost = wrapper.querySelector('[data-simulator-actions]');
  const forecastHost = wrapper.querySelector('[data-simulator-forecast]');
  const artifactsHost = wrapper.querySelector('[data-simulator-artifacts]');
  const referencesHost = wrapper.querySelector('[data-simulator-references]');

  const refreshCapabilityChecks = () => {
    wrapper.querySelectorAll('[data-capability-toggle]').forEach((input) => {
      const capabilityId = input.getAttribute('data-capability-toggle');
      input.checked = Boolean(selectedCapabilities[capabilityId]);
    });
  };

  const renderState = () => {
    const derived = deriveSimulatorState({
      capabilities,
      rules,
      selected: selectedCapabilities,
      customerSafe
    });
    const areaStats = areaMetrics(capabilities, selectedCapabilities);
    const stageOrder = simulatorStageOrder();
    const stageIndex = Math.max(0, stageOrder.indexOf(derived.journey_stage));
    const progressPercent = stageOrder.length > 1 ? Math.round((stageIndex / (stageOrder.length - 1)) * 100) : 0;

    lifecycleHost.innerHTML = `
      <div class="metric-head">
        <h3>DevSecOps Lifecycle Map</h3>
        ${statusChip({ label: `${derived.use_case_green_count}/4 core use cases green`, tone: derived.use_case_green_count >= 3 ? 'good' : 'warn' })}
      </div>
      <p class="muted">Gray = not adopted, yellow = partial, green = adopted. Storyline aligned to GitLab lifecycle model.</p>
      ${lifecycleSvg(areaStats)}
      <div class="simulator-area-chips">
        ${AREA_ORDER.map((area) => {
          const stats = areaStats[area] || { enabled: 0, total: 0 };
          const tone = toneForProgress(stats.enabled, stats.total);
          return `<span>${statusChip({ label: `${AREA_LABELS[area]} ${stats.enabled}/${stats.total}`, tone })}</span>`;
        }).join('')}
      </div>
    `;

    stageHost.innerHTML = `
      <div class="metric-head">
        <h3>Journey Stage</h3>
        ${statusChip({ label: derived.journey_stage, tone: derived.journey_stage === 'Renew' ? 'good' : 'neutral' })}
      </div>
      <div class="lifecycle-progress">
        <div class="lifecycle-track"><span style="width:${progressPercent}%"></span></div>
        <div class="lifecycle-steps">
          ${stageOrder
            .map((stage, index) => {
              const classes = ['lifecycle-step'];
              if (index < stageIndex) classes.push('is-done');
              if (index === stageIndex) classes.push('is-current');
              return `<span class="${classes.join(' ')}">${stage}</span>`;
            })
            .join('')}
        </div>
      </div>
      <p class="muted">Stage logic combines adoption depth, cadence readiness, and renewal-window signals.</p>
    `;

    actionsHost.innerHTML = `
      <div class="metric-head">
        <h3>Next Best Actions</h3>
        ${statusChip({ label: `${derived.recommended_actions.length} actions`, tone: 'neutral' })}
      </div>
      <div class="simulator-actions-list">
        ${derived.recommended_actions
          .map(
            (action) => `
              <article class="action-card">
                <h4>${action.title}</h4>
                <p class="muted">${action.description}</p>
                <p class="muted"><strong>Why:</strong> ${action.why}</p>
                <p class="muted"><strong>Playbook:</strong> ${action.playbook}</p>
                ${action.resource?.url ? `<p class="muted"><a href="${action.resource.url}" target="_blank" rel="noopener noreferrer">${action.resource.title}</a></p>` : ''}
                ${customerSafe || !action.internal_note ? '' : `<p class="muted"><strong>Internal:</strong> ${action.internal_note}</p>`}
              </article>
            `
          )
          .join('')}
      </div>
    `;

    forecastHost.innerHTML = `
      <div class="metric-head">
        <h3>Impact Forecast</h3>
        ${statusChip({ label: 'Scenario-based estimate', tone: 'neutral' })}
      </div>
      <div class="metric-grid kpi-2">
        ${metricTile({ label: 'Deployment Frequency', value: derived.impact_forecast.deployment_frequency, tone: 'good' })}
        ${metricTile({ label: 'Lead Time', value: derived.impact_forecast.lead_time, tone: 'warn' })}
        ${metricTile({ label: 'Change Failure Rate', value: derived.impact_forecast.change_failure_rate, tone: 'warn' })}
        ${metricTile({ label: 'MTTR', value: derived.impact_forecast.mttr, tone: 'good' })}
      </div>
    `;

    const artifacts = [
      { id: 'success-plan', label: 'Success Plan' },
      { id: 'executive-summary', label: 'Executive Summary' },
      { id: 'workshop-plan', label: 'Workshop Plan' },
      { id: 'issue-body', label: 'GitLab Issue Body' }
    ];
    const activeArtifactText = buildArtifactText(activeArtifact, derived, capabilities, customerSafe, scenarioName);

    artifactsHost.innerHTML = `
      <div class="metric-head">
        <h3>Artifacts</h3>
        ${statusChip({ label: customerSafe ? 'Customer-safe' : 'Internal', tone: customerSafe ? 'good' : 'warn' })}
      </div>
      <div class="simulator-artifact-actions">
        ${artifacts
          .map(
            (artifact) => `
              <div class="simulator-artifact-row">
                <strong>${artifact.label}</strong>
                <div class="page-actions">
                  <button class="ghost-btn" type="button" data-artifact-copy="${artifact.id}">Copy</button>
                  <button class="ghost-btn" type="button" data-artifact-download="${artifact.id}">Download .md</button>
                </div>
              </div>
            `
          )
          .join('')}
      </div>
      <label class="form-span">
        Preview
        <textarea class="artifact" data-artifact-preview readonly>${escapeHtml(activeArtifactText)}</textarea>
      </label>
    `;

    referencesHost.innerHTML = `
      <div class="metric-head">
        <h3>References</h3>
        ${statusChip({ label: `${derived.references.length} links`, tone: 'neutral' })}
      </div>
      <ul class="simple-list">
        ${derived.references
          .slice(0, 20)
          .map((item) => `<li><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></li>`)
          .join('')}
      </ul>
    `;

    artifactsHost.querySelectorAll('[data-artifact-copy]').forEach((button) => {
      button.addEventListener('click', async () => {
        const kind = button.getAttribute('data-artifact-copy');
        activeArtifact = kind;
        const markdown = buildArtifactText(kind, derived, capabilities, customerSafe, scenarioName);
        artifactsHost.querySelector('[data-artifact-preview]').value = markdown;
        await copyText(markdown);
        notify(`${kind.replace('-', ' ')} copied.`);
      });
    });

    artifactsHost.querySelectorAll('[data-artifact-download]').forEach((button) => {
      button.addEventListener('click', () => {
        const kind = button.getAttribute('data-artifact-download');
        activeArtifact = kind;
        const markdown = buildArtifactText(kind, derived, capabilities, customerSafe, scenarioName);
        artifactsHost.querySelector('[data-artifact-preview]').value = markdown;
        triggerDownload(artifactFilename(kind, scenarioName), markdown, 'text/markdown;charset=utf-8');
        notify(`${kind.replace('-', ' ')} downloaded.`);
      });
    });
  };

  refreshCapabilityChecks();
  renderState();

  wrapper.querySelector('[data-go-today]')?.addEventListener('click', () => navigate('home'));
  wrapper.querySelector('[data-safe-toggle]')?.addEventListener('change', (event) => onToggleSafe(Boolean(event.target.checked)));

  presetSelect?.addEventListener('change', () => {
    const presetId = presetSelect.value;
    selectedPreset = presetId;
    if (presetId !== 'custom') {
      selectedCapabilities = presetCapabilityMap(presetId, capabilities);
      refreshCapabilityChecks();
      renderState();
    }
  });

  nameInput?.addEventListener('input', () => {
    scenarioName = String(nameInput.value || '').trim() || 'Scenario Customer';
    renderState();
  });

  wrapper.querySelectorAll('[data-capability-toggle]').forEach((input) => {
    input.addEventListener('change', () => {
      const capabilityId = input.getAttribute('data-capability-toggle');
      selectedCapabilities = {
        ...selectedCapabilities,
        [capabilityId]: Boolean(input.checked)
      };
      if (selectedPreset !== 'custom') {
        selectedPreset = 'custom';
        if (presetSelect) presetSelect.value = 'custom';
      }
      renderState();
    });
  });

  return wrapper;
};

export const simulatorCommandEntries = () => [
  { id: 'simulator-open', label: 'Open Adoption Simulator', meta: 'Simulator', action: { route: 'simulator' } }
];
