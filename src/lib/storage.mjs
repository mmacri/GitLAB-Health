const memory = new Map();

const hasLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const storage = {
  get(key, fallback = null) {
    try {
      if (hasLocalStorage()) {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      }
      return memory.has(key) ? memory.get(key) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      if (hasLocalStorage()) {
        window.localStorage.setItem(key, JSON.stringify(value));
        return;
      }
      memory.set(key, value);
    } catch {
      // Ignore storage write failures to keep the app usable.
    }
  },
  remove(key) {
    try {
      if (hasLocalStorage()) {
        window.localStorage.removeItem(key);
        return;
      }
      memory.delete(key);
    } catch {
      // Ignore storage remove failures.
    }
  }
};

export const STORAGE_KEYS = {
  safeMode: 'glh-safe-mode',
  viewMode: 'glh-view-mode',
  requests: 'glh-requests',
  programs: 'glh-program-attendance',
  intakeDraft: 'glh-intake-draft',
  accountOverrides: 'glh-account-overrides',
  playbookChecklist: 'glh-playbook-checklist',
  selectedAccountId: 'glh-selected-account-id'
};
