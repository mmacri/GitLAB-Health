import { CUSTOMER_SAFE_FIELDS, CUSTOMER_SAFE_LABELS } from '../config/customerSafeFields.js';

const hiddenLabels = CUSTOMER_SAFE_FIELDS.hidden.map((field) => CUSTOMER_SAFE_LABELS[field] || field);

const hiddenSummary = () => {
  if (!hiddenLabels.length) return 'No internal fields are hidden.';
  if (hiddenLabels.length <= 3) return `${hiddenLabels.join(', ')} are hidden.`;
  return `${hiddenLabels.slice(0, 3).join(', ')}, and ${hiddenLabels.length - 3} other internal fields are hidden.`;
};

export const createCustomerSafeBanner = ({ onDisable } = {}) => {
  const section = document.createElement('section');
  section.className = 'customer-safe-banner';
  section.setAttribute('role', 'status');
  section.setAttribute('aria-live', 'polite');
  section.innerHTML = `
    <div class="customer-safe-banner__row">
      <div class="customer-safe-banner__icon" aria-hidden="true">SH</div>
      <div class="customer-safe-banner__content">
        <strong>Customer-Safe Mode Active</strong>
        <p>${hiddenSummary()}</p>
      </div>
    </div>
    <details class="customer-safe-banner__details">
      <summary>View hidden fields</summary>
      <ul>
        ${hiddenLabels.map((label) => `<li>${label}</li>`).join('')}
      </ul>
    </details>
    <div class="customer-safe-banner__actions">
      <button class="ghost-btn" type="button" data-disable-safe>Disable</button>
    </div>
  `;
  section.querySelector('[data-disable-safe]')?.addEventListener('click', () => {
    onDisable?.();
  });
  return section;
};
