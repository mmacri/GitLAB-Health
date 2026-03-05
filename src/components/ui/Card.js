const toClassName = (value = '') => String(value || '').trim();

export const card = ({
  title = '',
  subtitle = '',
  badge = '',
  actions = '',
  body = '',
  footer = '',
  className = ''
} = {}) => `
  <section class="gl-card card ${toClassName(className)}">
    ${
      title || badge || actions
        ? `<header class="dashboard-panel__head">
             <div>
               ${title ? `<h2>${title}</h2>` : ''}
               ${subtitle ? `<p class="u-muted">${subtitle}</p>` : ''}
             </div>
             <div class="page-actions">
               ${badge || ''}
               ${actions || ''}
             </div>
           </header>`
        : ''
    }
    ${body || ''}
    ${footer ? `<footer>${footer}</footer>` : ''}
  </section>
`;

export const dashboardPanel = ({
  title = '',
  subtitle = '',
  badge = '',
  filters = '',
  body = '',
  footer = '',
  className = ''
} = {}) => `
  <section class="gl-dashboard-panel dashboard-panel ${toClassName(className)}">
    <header class="gl-dashboard-panel__head dashboard-panel__head">
      <div>
        ${title ? `<h2>${title}</h2>` : ''}
        ${subtitle ? `<p class="u-muted">${subtitle}</p>` : ''}
      </div>
      ${badge || ''}
    </header>
    ${filters ? `<div class="gl-dashboard-panel__filters dashboard-panel__filters">${filters}</div>` : ''}
    ${body || ''}
    ${footer ? `<footer>${footer}</footer>` : ''}
  </section>
`;

export const createCardElement = (props) => {
  const node = document.createElement('div');
  node.innerHTML = card(props);
  return node.firstElementChild;
};

