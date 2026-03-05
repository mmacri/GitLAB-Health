const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value || 0)));

const polarPoint = (cx, cy, radius, angleDeg) => {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius
  };
};

const arcPath = (cx, cy, radius, startAngle, endAngle) => {
  const start = polarPoint(cx, cy, radius, endAngle);
  const end = polarPoint(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

export const donutChartSvg = (segments = [], options = {}) => {
  const width = Number(options.width || 240);
  const height = Number(options.height || 240);
  const radius = Number(options.radius || 84);
  const stroke = Number(options.stroke || 26);
  const cx = width / 2;
  const cy = height / 2;
  const total = segments.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  let currentAngle = 0;

  const arcs = segments
    .map((segment) => {
      const value = Number(segment.value || 0);
      const sweep = (value / total) * 360;
      const start = currentAngle;
      const end = currentAngle + sweep;
      currentAngle += sweep;
      return `<path d="${arcPath(cx, cy, radius, start, end)}" stroke="${segment.color || '#64748b'}" stroke-width="${stroke}" fill="none" stroke-linecap="round"></path>`;
    })
    .join('');

  const legend = segments
    .map(
      (segment, index) =>
        `<g transform="translate(12, ${height - 18 - (segments.length - index - 1) * 16})">
          <rect width="10" height="10" fill="${segment.color || '#64748b'}"></rect>
          <text x="16" y="9" font-size="11" fill="#334155">${segment.label || 'Segment'}: ${segment.value ?? 0}</text>
        </g>`
    )
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Donut chart">
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${stroke}"></circle>
      ${arcs}
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="22" font-weight="700" fill="#0f172a">${total}</text>
      ${legend}
    </svg>
  `;
};

export const barChartSvg = (items = [], options = {}) => {
  const width = Number(options.width || 480);
  const height = Number(options.height || 240);
  const padding = 28;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const max = Math.max(1, ...items.map((item) => Number(item.value || 0)));
  const barWidth = items.length ? plotWidth / items.length : plotWidth;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Bar chart">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cbd5e1"></line>
      ${items
        .map((item, index) => {
          const value = clamp(item.value, 0, max);
          const h = (value / max) * plotHeight;
          const x = padding + index * barWidth + barWidth * 0.16;
          const y = height - padding - h;
          const w = Math.max(18, barWidth * 0.68);
          return `
            <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${item.color || '#6e49cb'}" rx="6"></rect>
            <text x="${x + w / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#475569">${item.label || ''}</text>
            <text x="${x + w / 2}" y="${y - 6}" text-anchor="middle" font-size="10" fill="#334155">${value}</text>
          `;
        })
        .join('')}
    </svg>
  `;
};

export const lineChartSvg = (points = [], options = {}) => {
  const width = Number(options.width || 520);
  const height = Number(options.height || 240);
  const padding = 28;
  const max = Math.max(1, ...points.map((item) => Number(item.value || 0)));
  const min = Math.min(...points.map((item) => Number(item.value || 0)), 0);
  const span = Math.max(1, max - min);
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((Number(point.value || 0) - min) / span) * (height - padding * 2);
    return { x, y, label: point.label, value: Number(point.value || 0) };
  });

  const path = coords.length ? `M ${coords.map((item) => `${item.x} ${item.y}`).join(' L ')}` : '';

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Trend line chart">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cbd5e1"></line>
      ${path ? `<path d="${path}" fill="none" stroke="#0284c7" stroke-width="3"></path>` : ''}
      ${coords
        .map(
          (item) => `
            <circle cx="${item.x}" cy="${item.y}" r="4.5" fill="#0284c7"></circle>
            <text x="${item.x}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#475569">${item.label || ''}</text>
          `
        )
        .join('')}
    </svg>
  `;
};

export const funnelChartSvg = (steps = [], options = {}) => {
  const width = Number(options.width || 420);
  const height = Number(options.height || 220);
  const topPadding = 18;
  const stepHeight = Math.max(30, (height - topPadding * 2) / Math.max(1, steps.length));
  const maxValue = Math.max(1, ...steps.map((step) => Number(step.value || 0)));

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Program funnel chart">
      ${steps
        .map((step, index) => {
          const value = Number(step.value || 0);
          const ratio = value / maxValue;
          const barWidth = Math.max(36, ratio * (width - 40));
          const x = (width - barWidth) / 2;
          const y = topPadding + index * stepHeight;
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${stepHeight - 6}" rx="8" fill="${step.color || '#6e49cb'}"></rect>
            <text x="${width / 2}" y="${y + (stepHeight - 6) / 2 + 4}" text-anchor="middle" font-size="12" fill="#ffffff">${step.label}: ${value}</text>
          `;
        })
        .join('')}
    </svg>
  `;
};
