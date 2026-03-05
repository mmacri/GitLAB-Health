import { ENGAGEMENT_TYPES, normalizeEngagementType } from '../config/engagementTypes.js';

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const ICON_GLYPHS = {
  video: 'V',
  clock: 'OH',
  terminal: 'L',
  zap: 'OD'
};

const parseQuery = (raw = '') => {
  const tokens = String(raw || '').trim().split(/\s+/).filter(Boolean);
  let type = null;
  const textTokens = [];

  tokens.forEach((token) => {
    const lower = token.toLowerCase();
    if (!lower.startsWith('type:')) {
      textTokens.push(token);
      return;
    }
    const value = lower.slice(5).trim();
    if (!value) return;
    if (value === 'webinar' || value === 'webinars') type = 'WEBINAR';
    else if (value === 'office' || value === 'officehours' || value === 'office-hours' || value === 'hours') type = 'OFFICE_HOURS';
    else if (value === 'lab' || value === 'labs' || value === 'hands-on-lab' || value === 'handsonlab') type = 'HANDS_ON_LAB';
    else if (value === 'ondemand' || value === 'on-demand' || value === 'request') type = 'ON_DEMAND';
    else type = normalizeEngagementType(value);
  });

  return {
    text: textTokens.join(' ').toLowerCase(),
    type
  };
};

const buildGroups = (filtered, activeTypeFilter) => {
  const indexed = filtered.map((entry, index) => ({ entry, index }));
  if (activeTypeFilter) {
    return [{ heading: null, items: indexed }];
  }

  const engagementGroups = Object.keys(ENGAGEMENT_TYPES).reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
  const general = [];

  indexed.forEach((item) => {
    const key = item.entry.engagementType ? normalizeEngagementType(item.entry.engagementType) : null;
    if (key && engagementGroups[key]) {
      engagementGroups[key].push(item);
      return;
    }
    general.push(item);
  });

  const groups = [];
  if (general.length) groups.push({ heading: 'General', items: general });
  Object.entries(ENGAGEMENT_TYPES).forEach(([key, meta]) => {
    const items = engagementGroups[key] || [];
    if (!items.length) return;
    groups.push({ heading: `${meta.label}s (${items.length})`, items });
  });
  return groups;
};

export const createCommandPalette = ({ onSelect }) => {
  const root = document.querySelector('[data-command-palette]');
  if (!root) return { open: () => {}, close: () => {}, setEntries: () => {} };

  const input = root.querySelector('[data-command-input]');
  const list = root.querySelector('[data-command-results]');
  const closeButtons = root.querySelectorAll('[data-command-close]');
  let entries = [];
  let filtered = [];
  let activeIndex = 0;
  let activeTypeFilter = null;

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

    const groups = buildGroups(filtered, activeTypeFilter);
    groups.forEach((group) => {
      if (group.heading) {
        const heading = document.createElement('li');
        heading.className = 'command-group-heading';
        heading.textContent = group.heading;
        list.appendChild(heading);
      }
      group.items.forEach(({ entry, index }) => {
        const item = document.createElement('li');
        item.className = `command-item${index === activeIndex ? ' is-active' : ''}`;
        const typeKey = entry.engagementType ? normalizeEngagementType(entry.engagementType) : null;
        const typeMeta = typeKey ? ENGAGEMENT_TYPES[typeKey] : null;
        const icon = entry.engagementIcon || typeMeta?.icon || '';
        const glyph = ICON_GLYPHS[icon] || '•';
        const iconStyle = typeMeta ? ` style="background:${typeMeta.color};"` : '';
        item.innerHTML = `
          <div class="command-item-row">
            <span class="command-item-icon"${iconStyle}>${escapeHtml(glyph)}</span>
            <span>
              <strong>${escapeHtml(entry.label)}</strong>
              <span>${escapeHtml(entry.meta || '')}</span>
            </span>
          </div>
        `;
        item.addEventListener('click', () => {
          onSelect(entry);
          close();
        });
        list.appendChild(item);
      });
    });
  };

  const applyFilter = () => {
    const parsed = parseQuery(input?.value || '');
    const query = parsed.text;
    activeTypeFilter = parsed.type || null;
    filtered = entries.filter((entry) => {
      if (activeTypeFilter) {
        const key = entry.engagementType ? normalizeEngagementType(entry.engagementType) : null;
        if (key !== activeTypeFilter) return false;
      }
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
