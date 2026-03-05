const DEFAULT_MODES = [
  { id: 'today', label: 'Today', icon: '📅' },
  { id: 'review', label: 'Review', icon: '🔎' },
  { id: 'deep', label: 'Deep Dive', icon: '🧭' }
];

const normalizeMode = (value) => {
  const mode = String(value || 'today').trim().toLowerCase();
  if (mode === 'review' || mode === 'deep') return mode;
  return 'today';
};

export const createModeTabs = ({ currentMode = 'today', modes = DEFAULT_MODES, counts = {}, onSelect = () => {} } = {}) => {
  const activeMode = normalizeMode(currentMode);
  const wrapper = document.createElement('nav');
  wrapper.className = 'mode-tabs';
  wrapper.setAttribute('role', 'tablist');
  wrapper.setAttribute('aria-label', 'Dashboard modes');

  const buttons = [];
  modes.forEach((mode) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mode-tab${normalizeMode(mode.id) === activeMode ? ' active' : ''}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', normalizeMode(mode.id) === activeMode ? 'true' : 'false');
    button.setAttribute('tabindex', normalizeMode(mode.id) === activeMode ? '0' : '-1');
    button.dataset.modeTab = normalizeMode(mode.id);
    button.innerHTML = `
      <span class="mode-tab__icon" aria-hidden="true">${mode.icon || '•'}</span>
      <span>${mode.label || mode.id}</span>
      ${
        Number.isFinite(Number(counts[mode.id]))
          ? `<span class="mode-tab__count">${Number(counts[mode.id])}</span>`
          : ''
      }
    `;
    wrapper.appendChild(button);
    buttons.push(button);
  });

  const selectButton = (button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const mode = normalizeMode(button.dataset.modeTab);
    onSelect(mode);
  };

  wrapper.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mode-tab]');
    if (!button) return;
    selectButton(button);
  });

  wrapper.addEventListener('keydown', (event) => {
    const currentIndex = buttons.findIndex((button) => button === document.activeElement);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = buttons[(currentIndex + 1) % buttons.length];
      next?.focus();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev = buttons[(currentIndex - 1 + buttons.length) % buttons.length];
      prev?.focus();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      buttons[0]?.focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      buttons[buttons.length - 1]?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectButton(document.activeElement);
    }
  });

  return wrapper;
};
