import { renderActionDrawer } from '../components/actionDrawer.js';
import { statusChip } from '../components/statusChip.js';
import { redactPlaybooksForCustomer } from '../lib/redaction.js';

const categoryTone = {
  'Onboarding Playbooks': 'info',
  'Adoption Playbooks': 'good',
  'Risk Mitigation Playbooks': 'warn',
  'Executive Engagement Playbooks': 'neutral',
  'Expansion Playbooks': 'good',
  'Renewal Playbooks': 'warn',
  'Technical Enablement Playbooks': 'info'
};

const stageLabel = (stage) => String(stage || '').trim() || 'unspecified';

const toMarkdown = (playbook, references = []) => {
  const lines = [
    `# ${playbook.title}`,
    '',
    `- Category: ${playbook.category}`,
    `- Stage/Topic: ${playbook.stage} / ${playbook.topic}`,
    `- When to run: ${playbook.when_to_run}`,
    `- Objective: ${playbook.objective}`,
    `- Recommended program: ${playbook.recommended_program || 'None'}`,
    '',
    '## Trigger Signals',
    ...(playbook.trigger_signals || []).map((item) => `- ${item}`),
    '',
    '## Preparation Steps',
    ...(playbook.preparation_steps || []).map((item) => `- [ ] ${item}`),
    '',
    '## Execution Agenda',
    ...(playbook.execution_agenda || []).map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Artifacts Generated',
    ...(playbook.artifacts_generated || []).map((item) => `- ${item.name}: ${item.description}`),
    '',
    '## Checklist',
    ...(playbook.checklist || []).map((item) => `- [ ] ${item.label}`),
    '',
    '## Templates',
    `- Agenda: ${playbook.templates?.agenda || ''}`,
    `- Follow-up: ${playbook.templates?.followup || ''}`,
    `- Issue: ${playbook.templates?.issue || ''}`
  ];

  if (references.length) {
    lines.push('', '## Reference Resources', ...references.map((item) => `- [${item.title}](${item.url})`));
  }

  return lines.join('\n');
};

const toIssueTemplate = (playbook) => {
  const lines = [
    `# ${playbook.title} - Collaboration Issue`,
    '',
    `- Stage: ${playbook.stage}`,
    `- Topic: ${playbook.topic}`,
    `- Trigger: ${playbook.when_to_run}`,
    '',
    '## Objective',
    playbook.objective,
    '',
    '## Trigger Signals',
    ...(playbook.trigger_signals || []).map((item) => `- ${item}`),
    '',
    '## Execution Tasks',
    ...(playbook.execution_agenda || []).map((item) => `- [ ] ${item}`),
    '',
    '## Evidence To Capture',
    ...(playbook.artifacts_generated || []).map((item) => `- ${item.name}`),
    '',
    '## Owners and Dates',
    '- [ ] Owner assigned',
    '- [ ] Due date confirmed',
    '- [ ] Next checkpoint scheduled'
  ];
  return lines.join('\n');
};

const downloadText = (filename, text) => {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const rememberPlaybook = (name) => {
  if (!name) return;
  try {
    window.localStorage.setItem(
      'lastPlaybook',
      JSON.stringify({
        name,
        accessedAt: new Date().toISOString()
      })
    );
  } catch {
    // Ignore storage failures and continue playbook flow.
  }
};

const workflowDiagram = () => `
  <section class="card">
    <div class="metric-head">
      <h2>CSE Playbook Workflow</h2>
      ${statusChip({ label: 'Align -> Enable -> Expand', tone: 'neutral' })}
    </div>
    <svg viewBox="0 0 980 150" class="lifecycle-svg" role="img" aria-label="CSE workflow">
      <defs>
        <linearGradient id="playbook-flow" x1="0%" x2="100%">
          <stop offset="0%" stop-color="#0284c7"></stop>
          <stop offset="50%" stop-color="#6e49cb"></stop>
          <stop offset="100%" stop-color="#16a34a"></stop>
        </linearGradient>
      </defs>
      <rect x="30" y="30" width="130" height="72" rx="14" fill="#ffffff" stroke="#cbd5e1"></rect>
      <text x="95" y="74" text-anchor="middle" fill="#334155" font-size="14">Align</text>
      <rect x="205" y="30" width="130" height="72" rx="14" fill="#ffffff" stroke="#cbd5e1"></rect>
      <text x="270" y="74" text-anchor="middle" fill="#334155" font-size="14">Onboard</text>
      <rect x="380" y="30" width="130" height="72" rx="14" fill="#ffffff" stroke="#cbd5e1"></rect>
      <text x="445" y="74" text-anchor="middle" fill="#334155" font-size="14">Enable</text>
      <rect x="555" y="30" width="130" height="72" rx="14" fill="#ffffff" stroke="#cbd5e1"></rect>
      <text x="620" y="74" text-anchor="middle" fill="#334155" font-size="14">Expand</text>
      <rect x="730" y="30" width="130" height="72" rx="14" fill="#ffffff" stroke="#cbd5e1"></rect>
      <text x="795" y="74" text-anchor="middle" fill="#334155" font-size="14">Renew</text>
      <path d="M160 66 L205 66 M335 66 L380 66 M510 66 L555 66 M685 66 L730 66" stroke="url(#playbook-flow)" stroke-width="5" stroke-linecap="round"></path>
    </svg>
    <p class="muted">Playbooks are execution assets: run by trigger, deliver artifact, and track outcome evidence.</p>
  </section>
`;

const playbookCard = (playbook, checklistState, references = []) => {
  const checkedCount = (playbook.checklist || []).filter((item) => Boolean(checklistState?.[playbook.id]?.[item.key])).length;
  return `
    <article class="card compact-card playbook-card" data-playbook-card="${playbook.id}">
      <div class="metric-head">
        <h3>${playbook.title}</h3>
        <div class="chip-row">
          ${statusChip({ label: playbook.category, tone: categoryTone[playbook.category] || 'neutral' })}
          ${statusChip({ label: `${stageLabel(playbook.stage)} / ${playbook.topic}`, tone: 'neutral' })}
        </div>
      </div>

      <p class="muted"><strong>When to run:</strong> ${playbook.when_to_run}</p>
      <p class="muted"><strong>Objective:</strong> ${playbook.objective}</p>
      <p class="muted"><strong>Recommended program:</strong> ${playbook.recommended_program}</p>

      <div class="playbook-grid">
        <section>
          <h4>Trigger signals</h4>
          <ul class="simple-list">
            ${(playbook.trigger_signals || []).map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </section>
        <section>
          <h4>Preparation</h4>
          <ul class="simple-list">
            ${(playbook.preparation_steps || []).map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </section>
      </div>

      <section>
        <h4>Execution agenda</h4>
        <ol class="simple-list numbered-list">
          ${(playbook.execution_agenda || []).map((item) => `<li>${item}</li>`).join('')}
        </ol>
      </section>

      <section>
        <h4>Artifacts generated</h4>
        <ul class="simple-list">
          ${(playbook.artifacts_generated || [])
            .map(
              (artifact, index) =>
                `<li><strong>${artifact.name}:</strong> ${artifact.description} <button class="ghost-btn" type="button" data-copy-artifact="${playbook.id}::${index}">Copy template</button></li>`
            )
            .join('')}
        </ul>
      </section>

      <section>
        <h4>Checklist</h4>
        <p class="muted">${checkedCount}/${(playbook.checklist || []).length} complete</p>
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
      </section>

      <section>
        <h4>Reference resources</h4>
        <ul class="simple-list">
          ${references.length ? references.map((item) => `<li><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></li>`).join('') : '<li>No references available for this audience mode.</li>'}
        </ul>
      </section>

      <div class="page-actions">
        <button class="qa" type="button" data-copy-playbook="${playbook.id}">Copy playbook</button>
        <button class="ghost-btn" type="button" data-copy-issue="${playbook.id}">Copy GitLab issue template</button>
        <button class="ghost-btn" type="button" data-download-playbook="${playbook.id}">Download markdown</button>
        <button class="ghost-btn" type="button" data-open-program="${playbook.id}">Open programs</button>
      </div>
    </article>
  `;
};

const resolveReferences = (playbook, resourceById, customerSafe) => {
  const selected = [];
  const seen = new Set();

  (playbook.resource_ids || []).forEach((resourceId) => {
    const resource = resourceById.get(resourceId);
    if (!resource) return;
    if (customerSafe && !resource.customer_safe) return;
    const key = String(resource.url || '').trim().toLowerCase().replace(/\/+$/, '');
    if (seen.has(key)) return;
    seen.add(key);
    selected.push({ title: resource.title, url: resource.url });
  });

  if (!customerSafe) {
    (playbook.references || []).forEach((url) => {
      const key = String(url || '').trim().toLowerCase().replace(/\/+$/, '');
      if (!key || seen.has(key)) return;
      seen.add(key);
      selected.push({ title: url, url });
    });
  }

  return selected;
};

export const renderPlaybooksPage = (ctx) => {
  const { playbooks, resources, customerSafe, checklistState, mode, navigate, onChecklistChange, notify, copyText } = ctx;
  const visiblePlaybooks = customerSafe ? redactPlaybooksForCustomer(playbooks) : playbooks || [];
  const resourceById = new Map((resources || []).map((resource) => [resource.id, resource]));

  const categories = ['all', ...new Set(visiblePlaybooks.map((item) => item.category))];
  const stages = ['all', ...new Set(visiblePlaybooks.map((item) => item.stage))];

  const markdownById = (playbookId) => {
    const playbook = visiblePlaybooks.find((item) => item.id === playbookId);
    if (!playbook) return '';
    const references = resolveReferences(playbook, resourceById, customerSafe);
    return toMarkdown(playbook, references);
  };

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.innerHTML = `
    <header class="page-head page-intro">
      <div>
        <p class="eyebrow">Playbooks</p>
        <h1>CSE Playbook Library</h1>
        <p class="hero-lede">Operational execution motions for onboarding, adoption, risk, expansion, and renewal.</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Portfolio</button>
      </div>
    </header>

    ${workflowDiagram()}

    <section class="card">
      <div class="metric-head">
        <h2>Playbook Filters</h2>
        ${statusChip({ label: `${visiblePlaybooks.length} playbooks`, tone: 'neutral' })}
      </div>
      <div class="filter-row">
        <label>
          Category
          <select data-playbook-category>
            ${categories.map((value) => `<option value="${value}">${value === 'all' ? 'All categories' : value}</option>`).join('')}
          </select>
        </label>
        <label>
          Stage
          <select data-playbook-stage>
            ${stages.map((value) => `<option value="${value}">${value === 'all' ? 'All stages' : value}</option>`).join('')}
          </select>
        </label>
        <label class="form-span">
          Search
          <input type="search" data-playbook-search placeholder="Search title, trigger, objective..." />
        </label>
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Playbook Library</h2>
      </div>
      <div class="main-col" data-playbook-list></div>
    </section>

    <section class="dashboard-grid">
      <div></div>
      <div></div>
      <div data-drawer-host></div>
    </section>
  `;

  const drawer = renderActionDrawer({
    title: 'Playbooks Action Drawer',
    mode,
    nextActions: [
      'Select playbook by trigger signal and lifecycle stage.',
      'Copy issue template and start execution thread.',
      'Complete checklist items and log evidence artifacts.'
    ],
    dueSoon: visiblePlaybooks.slice(0, 3).map((item) => `${item.title} (${item.category})`),
    riskSignals: ['Checklist items not completed', 'No artifact attached to follow-up', 'No program motion selected'],
    onGenerateAgenda: () => navigate('intake'),
    onGenerateEmail: () => navigate('intake'),
    onGenerateIssue: () => navigate('intake'),
    onExportPortfolio: () => navigate('exports'),
    onExportAccount: () => navigate('exports'),
    onExportSummary: () => navigate('exports')
  });
  wrapper.querySelector('[data-drawer-host]').appendChild(drawer);

  const listHost = wrapper.querySelector('[data-playbook-list]');
  const categoryFilter = wrapper.querySelector('[data-playbook-category]');
  const stageFilter = wrapper.querySelector('[data-playbook-stage]');
  const searchFilter = wrapper.querySelector('[data-playbook-search]');

  const filteredPlaybooks = () => {
    const category = categoryFilter?.value || 'all';
    const stage = stageFilter?.value || 'all';
    const query = String(searchFilter?.value || '').trim().toLowerCase();

    return visiblePlaybooks.filter((playbook) => {
      const categoryMatch = category === 'all' || playbook.category === category;
      const stageMatch = stage === 'all' || playbook.stage === stage;
      const text = [
        playbook.title,
        playbook.when_to_run,
        playbook.objective,
        ...(playbook.trigger_signals || []),
        ...(playbook.execution_agenda || [])
      ]
        .join(' ')
        .toLowerCase();
      const queryMatch = !query || text.includes(query);
      return categoryMatch && stageMatch && queryMatch;
    });
  };

  const renderList = () => {
    const rows = filteredPlaybooks();
    listHost.innerHTML = rows.length
      ? rows
          .map((playbook) => playbookCard(playbook, checklistState, resolveReferences(playbook, resourceById, customerSafe)))
          .join('')
      : '<p class="empty-text">No playbooks match the current filters.</p>';
  };

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));

  [categoryFilter, stageFilter, searchFilter].forEach((element) => {
    element?.addEventListener('input', renderList);
    element?.addEventListener('change', renderList);
  });

  wrapper.addEventListener('change', (event) => {
    const input = event.target.closest('[data-playbook][data-check]');
    if (!input) return;
    onChecklistChange(input.getAttribute('data-playbook'), input.getAttribute('data-check'), Boolean(input.checked));
    notify('Checklist updated.');
    renderList();
  });

  wrapper.addEventListener('click', async (event) => {
    const copyPlaybook = event.target.closest('[data-copy-playbook]');
    if (copyPlaybook) {
      const playbookId = copyPlaybook.getAttribute('data-copy-playbook');
      const markdown = markdownById(playbookId);
      if (!markdown) return;
      const selected = visiblePlaybooks.find((item) => item.id === playbookId);
      rememberPlaybook(selected?.title || '');
      await copyText(markdown);
      notify('Playbook markdown copied.');
      return;
    }

    const copyIssue = event.target.closest('[data-copy-issue]');
    if (copyIssue) {
      const playbookId = copyIssue.getAttribute('data-copy-issue');
      const playbook = visiblePlaybooks.find((item) => item.id === playbookId);
      if (!playbook) return;
      rememberPlaybook(playbook.title);
      await copyText(toIssueTemplate(playbook));
      notify('GitLab issue template copied.');
      return;
    }

    const download = event.target.closest('[data-download-playbook]');
    if (download) {
      const playbookId = download.getAttribute('data-download-playbook');
      const playbook = visiblePlaybooks.find((item) => item.id === playbookId);
      if (!playbook) return;
      rememberPlaybook(playbook.title);
      const filename = `${playbook.id}.md`;
      downloadText(filename, markdownById(playbookId));
      notify(`Downloaded ${filename}.`);
      return;
    }

    const copyArtifact = event.target.closest('[data-copy-artifact]');
    if (copyArtifact) {
      const [playbookId, indexText] = String(copyArtifact.getAttribute('data-copy-artifact') || '').split('::');
      const playbook = visiblePlaybooks.find((item) => item.id === playbookId);
      const artifact = playbook?.artifacts_generated?.[Number(indexText)];
      if (!artifact) return;
      rememberPlaybook(playbook?.title || '');
      await copyText(artifact.template || '');
      notify(`${artifact.name} template copied.`);
      return;
    }

    const openProgram = event.target.closest('[data-open-program]');
    if (openProgram) {
      const playbookId = openProgram.getAttribute('data-open-program');
      const playbook = visiblePlaybooks.find((item) => item.id === playbookId);
      rememberPlaybook(playbook?.title || '');
      navigate('programs');
    }
  });

  renderList();
  return wrapper;
};

export const playbooksCommandEntries = (playbooks = []) => [
  { id: 'playbooks-open', label: 'Open playbooks', meta: 'Playbooks', action: { route: 'playbooks' } },
  ...(playbooks || []).map((playbook) => ({
    id: `playbook-${playbook.id}`,
    label: `Playbook: ${playbook.title}`,
    meta: `${playbook.category} / ${playbook.stage}`,
    action: { route: 'playbooks' }
  }))
];
