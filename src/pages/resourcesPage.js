import { renderActionDrawer } from '../components/actionDrawer.js';
import { statusChip } from '../components/statusChip.js';

const normalizeAudience = (resource) => {
  if (resource.audience) return String(resource.audience);
  return resource.customer_safe ? 'Customer Safe' : 'Internal';
};

const normalizeCategory = (resource) => {
  if (resource.category) return String(resource.category);
  if (Array.isArray(resource.categories) && resource.categories.length) {
    return String(resource.categories[0]).replace(/-/g, ' ');
  }
  return 'Enablement';
};

const normalizeType = (resource) => String(resource.type || 'Handbook');

const normalizeResource = (resource) => ({
  ...resource,
  category: normalizeCategory(resource),
  audience: normalizeAudience(resource),
  type: normalizeType(resource),
  customer_safe: normalizeAudience(resource).toLowerCase() !== 'internal'
});

const guidanceMap = () => `
  <section class="card">
    <div class="metric-head">
      <h2>CSE Guidance Map</h2>
      ${statusChip({ label: 'Motion-aligned', tone: 'neutral' })}
    </div>
    <div class="matrix-grid">
      <article class="matrix-cell matrix-info">
        <h3>Onboarding</h3>
        <p>Use quick-start guides and first value milestones.</p>
      </article>
      <article class="matrix-cell matrix-good">
        <h3>Adoption</h3>
        <p>Use SCM/CI/CD/Secure playbooks and workshops.</p>
      </article>
      <article class="matrix-cell matrix-warn">
        <h3>Risk</h3>
        <p>Use health scoring and response plan artifacts.</p>
      </article>
      <article class="matrix-cell matrix-risk">
        <h3>Renewal</h3>
        <p>Use success plans, EBR narratives, and proof packs.</p>
      </article>
    </div>
  </section>
`;

const toMarkdownList = (items) =>
  items
    .map((item) => `- [${item.title}](${item.url}) — ${item.category} | ${item.type} | ${item.audience}`)
    .join('\n');

export const renderResourcesPage = (ctx) => {
  const { resources, categories, customerSafe, mode, navigate, copyText, notify } = ctx;
  const normalized = (resources || []).map(normalizeResource);
  const visible = customerSafe ? normalized.filter((item) => item.customer_safe) : normalized;
  const categoryLookup = new Map((categories || []).map((category) => [category.id, category.label]));
  const categoryOptions = [
    'all',
    ...new Set(
      visible.map((item) => {
        if (categoryLookup.has(item.category)) return categoryLookup.get(item.category);
        return item.category
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (part) => part.toUpperCase());
      })
    )
  ];
  const audienceOptions = ['all', ...new Set(visible.map((item) => item.audience))];
  const typeOptions = ['all', ...new Set(visible.map((item) => item.type))];

  const selection = new Set();

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.innerHTML = `
    <header class="page-head page-intro">
      <div>
        <p class="eyebrow">Resources</p>
        <h1>Handbook + Docs Resource Registry</h1>
        <p class="hero-lede">Curated by motion: Onboarding, Adoption, Risk, Renewal, and Enablement.</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Today</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-head">
        <h2>Resource Registry</h2>
        ${statusChip({ label: `${visible.length} resources`, tone: 'neutral' })}
      </div>
      <div class="filter-row">
        <label>
          Category
          <select data-category-filter>
            ${categoryOptions.map((value) => `<option value="${value}">${value === 'all' ? 'All categories' : value}</option>`).join('')}
          </select>
        </label>
        <label>
          Audience
          <select data-audience-filter>
            ${audienceOptions.map((value) => `<option value="${value}">${value === 'all' ? 'All audiences' : value}</option>`).join('')}
          </select>
        </label>
        <label>
          Type
          <select data-type-filter>
            ${typeOptions.map((value) => `<option value="${value}">${value === 'all' ? 'All types' : value}</option>`).join('')}
          </select>
        </label>
        <label class="form-span">
          Search
          <input class="resource-filter" type="search" data-filter placeholder="Search title, summary, category, URL..." />
        </label>
      </div>
      <div class="resource-tools">
        <button class="qa" type="button" data-copy-selected>Copy selected links</button>
        <button class="ghost-btn" type="button" data-copy-filtered>Copy filtered links</button>
        <button class="ghost-btn" type="button" data-select-all>Select all filtered</button>
        <button class="ghost-btn" type="button" data-clear-selection>Clear selection</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Title</th>
              <th>Category</th>
              <th>Audience</th>
              <th>Type</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody data-resource-rows></tbody>
        </table>
      </div>
    </section>

    ${guidanceMap()}

    <section class="card">
      <div class="metric-head"><h2>Use In Motion</h2></div>
      <ul class="simple-list">
        <li>Onboard: share first-value and getting-started links during kickoff.</li>
        <li>Adopt: pair workshops with docs links and a customer-safe agenda.</li>
        <li>Risk: include health scoring + mitigation playbook links in updates.</li>
        <li>Renew: attach success plan and EBR assets to the renewal narrative.</li>
      </ul>
    </section>

    <section class="dashboard-grid">
      <div></div>
      <div></div>
      <div data-drawer-host></div>
    </section>
  `;

  const drawer = renderActionDrawer({
    title: 'Resources Action Drawer',
    mode,
    nextActions: [
      'Filter by motion and audience before sharing links.',
      'Copy customer-safe link bundle for meeting prep.',
      'Use renewal assets for executive narrative updates.'
    ],
    dueSoon: ['Update link bundle before next customer touchpoint', 'Attach resources to upcoming workshop agenda'],
    riskSignals: ['Internal-only links selected in customer-safe mode', 'No resource bundle attached to follow-up'],
    onGenerateAgenda: () => navigate('intake'),
    onGenerateEmail: () => navigate('intake'),
    onGenerateIssue: () => navigate('intake'),
    onExportPortfolio: () => navigate('exports'),
    onExportAccount: () => navigate('exports'),
    onExportSummary: () => navigate('exports')
  });
  wrapper.querySelector('[data-drawer-host]')?.appendChild(drawer);

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));

  const search = wrapper.querySelector('[data-filter]');
  const categoryFilter = wrapper.querySelector('[data-category-filter]');
  const audienceFilter = wrapper.querySelector('[data-audience-filter]');
  const typeFilter = wrapper.querySelector('[data-type-filter]');
  const rowsHost = wrapper.querySelector('[data-resource-rows]');

  const getFiltered = () => {
    const query = String(search?.value || '').trim().toLowerCase();
    const category = categoryFilter?.value || 'all';
    const audience = audienceFilter?.value || 'all';
    const type = typeFilter?.value || 'all';

    return visible.filter((item) => {
      const text = `${item.title} ${item.summary || ''} ${item.category} ${item.audience} ${item.type} ${item.url}`.toLowerCase();
      const categoryMatch = category === 'all' || item.category === category;
      const audienceMatch = audience === 'all' || item.audience === audience;
      const typeMatch = type === 'all' || item.type === type;
      const queryMatch = text.includes(query);
      return categoryMatch && audienceMatch && typeMatch && queryMatch;
    });
  };

  const renderRows = () => {
    const filtered = getFiltered();
    rowsHost.innerHTML = filtered.length
      ? filtered
          .map(
            (item) => `
              <tr>
                <td><input class="resource-check" type="checkbox" data-resource-select="${item.id}" ${selection.has(item.id) ? 'checked' : ''} /></td>
                <td>
                  <strong>${item.title}</strong>
                  <p class="muted">${item.summary || ''}</p>
                </td>
                <td>${item.category}</td>
                <td>${statusChip({ label: item.audience, tone: item.customer_safe ? 'good' : 'warn' })}</td>
                <td>${item.type}</td>
                <td><a href="${item.url}" target="_blank" rel="noopener noreferrer">Open link</a></td>
              </tr>
            `
          )
          .join('')
      : '<tr><td colspan="6">No resources match the current filters.</td></tr>';
  };

  const copyBundle = async (items, emptyMessage) => {
    if (!items.length) {
      notify(emptyMessage);
      return;
    }
    await copyText(toMarkdownList(items));
    notify(`${items.length} resource links copied.`);
  };

  wrapper.querySelector('[data-copy-selected]')?.addEventListener('click', async () => {
    const selectedItems = visible.filter((item) => selection.has(item.id));
    await copyBundle(selectedItems, 'No selected links to copy.');
  });

  wrapper.querySelector('[data-copy-filtered]')?.addEventListener('click', async () => {
    await copyBundle(getFiltered(), 'No filtered links to copy.');
  });

  wrapper.querySelector('[data-select-all]')?.addEventListener('click', () => {
    getFiltered().forEach((item) => selection.add(item.id));
    renderRows();
  });

  wrapper.querySelector('[data-clear-selection]')?.addEventListener('click', () => {
    selection.clear();
    renderRows();
  });

  [search, categoryFilter, audienceFilter, typeFilter].forEach((element) => {
    element?.addEventListener('input', renderRows);
    element?.addEventListener('change', renderRows);
  });

  rowsHost.addEventListener('change', (event) => {
    const input = event.target.closest('[data-resource-select]');
    if (!input) return;
    const id = input.getAttribute('data-resource-select');
    if (!id) return;
    if (input.checked) {
      selection.add(id);
    } else {
      selection.delete(id);
    }
  });

  renderRows();
  return wrapper;
};

export const resourcesCommandEntries = () => [{ id: 'resources-open', label: 'Open resources', meta: 'Resources', action: { route: 'resources' } }];
