const sortRows = (rows, key, direction) => {
  const modifier = direction === 'desc' ? -1 : 1;
  return [...rows].sort((left, right) => {
    const l = left[key];
    const r = right[key];
    if (l === r) return 0;
    if (l === null || l === undefined) return 1;
    if (r === null || r === undefined) return -1;
    if (typeof l === 'number' && typeof r === 'number') return (l - r) * modifier;
    return String(l).localeCompare(String(r)) * modifier;
  });
};

export const createDataTable = ({ columns, rows, defaultSort = null, rowRenderer }) => {
  const state = {
    sortBy: defaultSort?.key || null,
    direction: defaultSort?.direction || 'asc',
    source: Array.isArray(rows) ? rows : [],
    visible: Array.isArray(rows) ? rows : []
  };

  const wrapper = document.createElement('div');
  wrapper.className = 'data-table-shell';
  wrapper.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            ${columns
              .map((column) => {
                const sortable = column.sortable !== false;
                return `<th>${sortable ? `<button type="button" class="table-sort" data-sort="${column.key}">${column.label}</button>` : column.label}</th>`;
              })
              .join('')}
          </tr>
        </thead>
        <tbody data-body></tbody>
      </table>
    </div>
  `;

  const body = wrapper.querySelector('[data-body]');

  const renderRows = () => {
    body.innerHTML = '';
    if (!state.visible.length) {
      body.innerHTML = `<tr><td colspan="${columns.length}">No rows match current filters.</td></tr>`;
      return;
    }
    state.visible.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = rowRenderer(row);
      body.appendChild(tr);
    });
  };

  const applySort = () => {
    if (!state.sortBy) {
      state.visible = [...state.source];
      renderRows();
      return;
    }
    state.visible = sortRows(state.visible, state.sortBy, state.direction);
    renderRows();
  };

  wrapper.querySelectorAll('[data-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-sort');
      if (state.sortBy === key) {
        state.direction = state.direction === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = key;
        state.direction = 'asc';
      }
      applySort();
    });
  });

  renderRows();

  return {
    element: wrapper,
    setRows(rowsInput) {
      state.source = Array.isArray(rowsInput) ? rowsInput : [];
      state.visible = [...state.source];
      applySort();
    },
    setFilter(predicate) {
      state.visible = state.source.filter(predicate || (() => true));
      applySort();
    }
  };
};
