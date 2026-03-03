import { renderActionDrawer } from '../components/actionDrawer.mjs';
import { statusChip } from '../components/statusChip.mjs';

const resourceCard = (resource) => `
  <article class="card compact-card">
    <div class="metric-head">
      <h3>${resource.title}</h3>
      ${statusChip({ label: resource.customer_safe ? 'Customer-safe' : 'Internal', tone: resource.customer_safe ? 'good' : 'warn' })}
    </div>
    <p class="muted">${resource.summary}</p>
    <p class="muted">${resource.tooltip || ''}</p>
    <a href="${resource.url}" target="_blank" rel="noopener noreferrer">Open resource</a>
  </article>
`;

export const renderResourcesPage = (ctx) => {
  const { resources, categories, customerSafe, mode, navigate } = ctx;
  const visible = customerSafe ? (resources || []).filter((item) => item.customer_safe) : resources || [];

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Resources</p>
        <h1>Curated Handbook Resources</h1>
        <p class="hero-lede">Customer health scoring, platform adoption scoring, and pooled CSE model references.</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Portfolio</button>
      </div>
    </header>

    <section class="dashboard-grid">
      <div class="main-col">
        <section class="card">
          <div class="metric-head">
            <h2>Library</h2>
            ${statusChip({ label: `${visible.length} visible`, tone: 'neutral' })}
          </div>
          <input class="resource-filter" type="search" data-filter placeholder="Filter resources..." />
          <div class="main-col" data-library>
            ${visible.map(resourceCard).join('')}
          </div>
        </section>

        <section class="card">
          <div class="metric-head"><h2>Categories</h2></div>
          <div class="kpi-grid kpi-3">
            ${(categories || [])
              .map((category) => {
                const count = visible.filter((item) => (item.categories || []).includes(category.id)).length;
                return `<article class="compact-card card"><h3>${category.label}</h3><p class="muted">${count} resources</p></article>`;
              })
              .join('')}
          </div>
        </section>
      </div>

      <div></div>
      <div data-drawer-host></div>
    </section>
  `;

  const drawer = renderActionDrawer({
    title: 'Resources Action Drawer',
    mode,
    nextActions: [
      'Open health scoring rubric before risk review',
      'Open platform value score before adoption planning',
      'Open success plan template before EBR prep'
    ],
    dueSoon: ['Prepare references for next customer touchpoint', 'Align links to upcoming workshop agenda'],
    riskSignals: ['Internal-only link in customer-safe mode', 'No resource attached to playbook motion'],
    onGenerateAgenda: () => navigate('intake'),
    onGenerateEmail: () => navigate('intake'),
    onGenerateIssue: () => navigate('intake'),
    onExportPortfolio: () => navigate('exports'),
    onExportAccount: () => navigate('exports'),
    onExportSummary: () => navigate('exports')
  });
  wrapper.querySelector('[data-drawer-host]').appendChild(drawer);

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));

  const search = wrapper.querySelector('[data-filter]');
  const library = wrapper.querySelector('[data-library]');
  search?.addEventListener('input', () => {
    const query = String(search.value || '').trim().toLowerCase();
    const filtered = visible.filter((item) => `${item.title} ${item.summary} ${item.tooltip}`.toLowerCase().includes(query));
    library.innerHTML = filtered.length ? filtered.map(resourceCard).join('') : '<p class="empty-text">No resources found.</p>';
  });

  return wrapper;
};

export const resourcesCommandEntries = () => [{ id: 'resources-open', label: 'Open resources', meta: 'Resources', action: { route: 'resources' } }];
