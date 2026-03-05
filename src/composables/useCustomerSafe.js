import {
  CUSTOMER_SAFE_ANONYMIZED_VALUES,
  CUSTOMER_SAFE_FIELDS
} from '../config/customerSafeFields.js';

let safeMode = false;
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener(Boolean(safeMode));
    } catch {
      // Ignore subscriber errors to keep toggle resilient.
    }
  });
};

export const setCustomerSafeMode = (nextValue) => {
  safeMode = Boolean(nextValue);
  notify();
  return safeMode;
};

export const getCustomerSafeMode = () => Boolean(safeMode);

export const subscribeCustomerSafeMode = (listener) => {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useCustomerSafe = () => {
  const maskField = (fieldName, value) => {
    const key = String(fieldName || '').trim();
    if (!key) return value;
    if (!safeMode) return value;

    if (CUSTOMER_SAFE_FIELDS.hidden.includes(key)) return null;
    if (CUSTOMER_SAFE_FIELDS.anonymized.includes(key)) {
      return CUSTOMER_SAFE_ANONYMIZED_VALUES[key] || 'Redacted';
    }
    return value;
  };

  return {
    get isCustomerSafe() {
      return Boolean(safeMode);
    },
    setCustomerSafeMode,
    subscribeCustomerSafeMode,
    maskField,
    get hiddenFieldCount() {
      return safeMode ? CUSTOMER_SAFE_FIELDS.hidden.length : 0;
    }
  };
};
