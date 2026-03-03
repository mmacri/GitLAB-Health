const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const resourceCard = (resource) => `
  <article class="card compact-card resource-card">
    <div class="metric-head">
      <h3>${escapeHtml(resource.title)}</h3>
      <span class="status-pill" data-status="${resource.customer_safe ? 'good' : 'watch'}">${
        resource.customer_safe ? 'Customer-safe' : 'Internal context'
      }</span>
    </div>
    <p class="muted">${escapeHtml(resource.summary || '')}</p>
    <p class="hint-text">${escapeHtml(resource.tooltip || '')}</p>
    <a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">Open handbook resource</a>
  </article>
`;

export const renderResourcesPage = (ctx) => {
  const { resources, categories, customerSafe, navigate } = ctx;
  const byCategory = new Map((categories || []).map((category) => [category.id, []]));

  (resources || []).forEach((resource) => {
    (resource.categories || []).forEach((categoryId) => {
      if (!byCategory.has(categoryId)) byCategory.set(categoryId, []);
      byCategory.get(categoryId).push(resource);
    });
  });

  const visibleResources = customerSafe ? (resources || []).filter((item) => item.customer_safe) : resources || [];

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Resources</p>
        <h1>Handbook-aligned Enablement Library</h1>
        <p class="hero-lede">
          Reference pooled CSE model guidance, customer health scoring intent, and platform adoption scoring motions.
        </p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-portfolio>Back to portfolio</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-head">
        <h2>Resource registry</h2>
        <span class="status-pill" data-status="watch">${visibleResources.length} visible</span>
      </div>
      <p class="muted">Customer-safe mode hides internal-only playbook guidance and triage notes.</p>
      <input class="resource-filter" type="search" data-resource-filter placeholder="Filter resources by keyword..." />
      <div class="resource-grid" data-resource-grid>
        ${visibleResources.map(resourceCard).join('')}
      </div>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>By category</h2>
      </div>
      <div class="resource-category-grid">
        ${(categories || [])
          .map((category) => {
            const items = (byCategory.get(category.id) || []).filter((item) => (customerSafe ? item.customer_safe : true));
            return `
              <article class="card compact-card">
                <h3>${escapeHtml(category.label)}</h3>
                <p class="muted">${items.length} resources</p>
                <ul class="simple-list">
                  ${items
                    .map(
                      (item) =>
                        `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                          item.title
                        )}</a></li>`
                    )
                    .join('') || '<li>No items for this audience mode.</li>'}
                </ul>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>
  `;

  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));

  const search = wrapper.querySelector('[data-resource-filter]');
  const grid = wrapper.querySelector('[data-resource-grid]');
  search?.addEventListener('input', () => {
    const query = String(search.value || '')
      .trim()
      .toLowerCase();

    const filtered = visibleResources.filter((resource) => {
      const haystack = `${resource.title} ${resource.summary} ${resource.tooltip}`.toLowerCase();
      return haystack.includes(query);
    });

    grid.innerHTML = filtered.length ? filtered.map(resourceCard).join('') : '<p class="empty-text">No resources found.</p>';
  });

  return wrapper;
};

export const resourcesCommandEntries = () => [
  {
    id: 'resource-open',
    label: 'Open resources library',
    meta: 'Resources',
    action: { route: 'resources' }
  }
];
