export const tabs = ({ id = 'tabs', items = [], active = '' } = {}) => `
  <div class="mode-tabs" role="tablist" aria-label="${id}">
    ${items
      .map(
        (item) => `
      <button
        type="button"
        role="tab"
        class="mode-tab ${item.id === active ? 'active' : ''}"
        aria-selected="${item.id === active ? 'true' : 'false'}"
        data-tab-id="${item.id}"
      >
        ${item.icon ? `<span class="mode-tab__icon" aria-hidden="true">${item.icon}</span>` : ''}
        <span>${item.label}</span>
        ${Number.isFinite(Number(item.count)) ? `<span class="mode-tab__count">${Number(item.count)}</span>` : ''}
      </button>
    `
      )
      .join('')}
  </div>
`;

