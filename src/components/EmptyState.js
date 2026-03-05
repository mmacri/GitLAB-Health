const defaultIcon = (variant) => {
  if (variant === 'loading') return '○';
  if (variant === 'filtered') return '⌕';
  if (variant === 'error') return '!';
  return '✓';
};

export const createEmptyState = ({
  variant = 'clear',
  title = '',
  body = '',
  icon = '',
  actions = []
} = {}) => {
  const section = document.createElement('section');
  section.className = `empty-state empty-state--${variant}`;
  section.innerHTML = `
    <div class="empty-state__icon" aria-hidden="true">${icon || defaultIcon(variant)}</div>
    <h3 class="empty-state__title">${title}</h3>
    <p class="empty-state__body">${body}</p>
    <div class="empty-state__actions"></div>
  `;

  const actionHost = section.querySelector('.empty-state__actions');
  const validActions = Array.isArray(actions) ? actions : [];
  if (!validActions.length) {
    actionHost?.remove();
    return section;
  }

  validActions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action.className || 'ghost-btn';
    button.textContent = action.label || 'Continue';
    button.addEventListener('click', () => action.onClick?.());
    actionHost?.appendChild(button);
  });

  return section;
};
