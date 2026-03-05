let seed = Date.now();
const later = globalThis.setTimeout ? globalThis.setTimeout.bind(globalThis) : setTimeout;

const state = {
  toasts: []
};

const listeners = new Set();

const emit = () => {
  const snapshot = state.toasts.map((toast) => ({ ...toast }));
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // Keep toast updates resilient for all subscribers.
    }
  });
};

const remove = (id) => {
  state.toasts = state.toasts.filter((toast) => toast.id !== id);
  emit();
};

const dismiss = (id) => {
  const toast = state.toasts.find((item) => item.id === id);
  if (!toast || toast.closing) return;
  toast.closing = true;
  emit();
  later(() => remove(id), 200);
};

const show = ({ message, type = 'success', duration = 3000 } = {}) => {
  if (!message) return null;
  const id = ++seed;
  state.toasts = [...state.toasts, { id, message: String(message), type, closing: false }];
  emit();
  later(() => dismiss(id), Math.max(1200, Number(duration) || 3000));
  return id;
};

const subscribe = (listener) => {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  listener(state.toasts.map((toast) => ({ ...toast })));
  return () => listeners.delete(listener);
};

export const toastStore = {
  subscribe,
  show,
  dismiss
};
