export const skeletonCard = ({ lines = 3 } = {}) => {
  const count = Math.max(1, Number(lines || 3));
  return `
    <div class="gl-skeleton-card card">
      <div class="skeleton-card" style="height:18px;width:42%;"></div>
      ${new Array(count)
        .fill('')
        .map((_, idx) => `<div class="skeleton-card" style="height:12px;width:${idx === count - 1 ? 64 : 100}%"></div>`)
        .join('')}
    </div>
  `;
};

