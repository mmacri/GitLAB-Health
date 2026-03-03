export const metricTile = ({ label, value, meta = '', tone = 'neutral', tooltip = '' }) => {
  const safeLabel = String(label || '').trim();
  const safeValue = value === null || value === undefined || value === '' ? '—' : String(value);
  const safeMeta = String(meta || '').trim();
  const tip = tooltip ? `<span class="metric-tip" title="${String(tooltip).replace(/"/g, '&quot;')}">i</span>` : '';
  return `
    <article class="metric-tile metric-tile--${tone}">
      <header>
        <span class="metric-label">${safeLabel}</span>
        ${tip}
      </header>
      <p class="metric-value">${safeValue}</p>
      ${safeMeta ? `<p class="metric-meta">${safeMeta}</p>` : ''}
    </article>
  `;
};
