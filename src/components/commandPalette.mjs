const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const createCommandPalette = ({ onSelect }) => {
  const root = document.querySelector('[data-command-palette]');
  if (!root) return { open: () => {}, close: () => {}, setEntries: () => {} };

  const input = root.querySelector('[data-command-input]');
  const list = root.querySelector('[data-command-results]');
  const closeButtons = root.querySelectorAll('[data-command-close]');
  let entries = [];
  let filtered = [];
  let activeIndex = 0;

  const render = () => {
    if (!list) return;
    list.innerHTML = '';
    if (!filtered.length) {
      const item = document.createElement('li');
      item.className = 'command-empty';
      item.textContent = 'No matching commands.';
      list.appendChild(item);
      return;
    }

    filtered.forEach((entry, index) => {
      const item = document.createElement('li');
      item.className = `command-item${index === activeIndex ? ' is-active' : ''}`;
      item.innerHTML = `<strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(entry.meta || '')}</span>`;
      item.addEventListener('click', () => {
        onSelect(entry);
        close();
      });
      list.appendChild(item);
    });
  };

  const applyFilter = () => {
    const query = input?.value?.trim().toLowerCase() || '';
    filtered = entries.filter((entry) => {
      const haystack = `${entry.label} ${entry.meta || ''}`.toLowerCase();
      return haystack.includes(query);
    });
    activeIndex = 0;
    render();
  };

  const open = () => {
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    input?.focus();
    input?.select();
    applyFilter();
  };

  const close = () => {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
  };

  input?.addEventListener('input', applyFilter);
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!filtered.length) return;
      activeIndex = (activeIndex + 1) % filtered.length;
      render();
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!filtered.length) return;
      activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
      render();
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = filtered[activeIndex];
      if (!selected) return;
      onSelect(selected);
      close();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });

  closeButtons.forEach((button) => button.addEventListener('click', close));
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open();
    }
  });

  return {
    open,
    close,
    setEntries(nextEntries) {
      entries = Array.isArray(nextEntries) ? nextEntries : [];
      applyFilter();
    }
  };
};