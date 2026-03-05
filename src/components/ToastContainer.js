import { toastStore } from '../stores/toastStore.js';

const typeIcon = (type) => {
  const normalized = String(type || 'success').toLowerCase();
  if (normalized === 'error') return '×';
  if (normalized === 'warning') return '!';
  if (normalized === 'info') return 'i';
  return '✓';
};

export const mountToastContainer = () => {
  const root = document.createElement('div');
  root.className = 'toast-container';
  root.setAttribute('aria-live', 'polite');
  root.setAttribute('aria-atomic', 'false');
  document.body.appendChild(root);

  const render = (toasts) => {
    root.innerHTML = '';
    (toasts || []).forEach((toast) => {
      const item = document.createElement('article');
      item.className = `toast toast--${toast.type}${toast.closing ? ' toast--closing' : ''}`;
      item.setAttribute('role', 'status');
      item.innerHTML = `
        <span class="toast__icon" aria-hidden="true">${typeIcon(toast.type)}</span>
        <span class="toast__message">${toast.message}</span>
        <button class="toast__close" type="button" aria-label="Dismiss">×</button>
      `;
      item.querySelector('.toast__close')?.addEventListener('click', () => toastStore.dismiss(toast.id));
      root.appendChild(item);
    });
  };

  const unsubscribe = toastStore.subscribe(render);
  return () => {
    unsubscribe();
    root.remove();
  };
};
