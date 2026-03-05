const xIcon = () =>
  `<svg class="filter-chip__x" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

export const createActiveFilterChips = ({ filters = [], onRemove = () => {}, onClear = () => {} } = {}) => {
  if (!Array.isArray(filters) || !filters.length) return null;

  const wrapper = document.createElement('section');
  wrapper.className = 'filter-chips';
  wrapper.setAttribute('aria-label', 'Active filters');
  wrapper.innerHTML = `
    <span class="filter-chips__label">Filtered by:</span>
    <div class="filter-chips__list"></div>
    <button class="filter-chips__clear" type="button">Clear all</button>
  `;

  const list = wrapper.querySelector('.filter-chips__list');
  filters.forEach((filter) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter-chip';
    chip.dataset.filterId = String(filter.id || '');
    chip.setAttribute('aria-label', `Remove filter: ${filter.label}`);
    chip.innerHTML = `${filter.label}${xIcon()}`;
    list?.appendChild(chip);
  });

  wrapper.addEventListener('click', (event) => {
    const clear = event.target.closest('.filter-chips__clear');
    if (clear) {
      onClear();
      return;
    }
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    onRemove(chip.dataset.filterId || '');
  });

  return wrapper;
};
