export const pageHeader = ({
  eyebrow = '',
  title = '',
  subtitle = '',
  meta = '',
  actionsHtml = ''
}) => `
  <header class="page-head page-intro">
    <div>
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
      <h1>${title}</h1>
      ${subtitle ? `<p class="hero-lede">${subtitle}</p>` : ''}
      ${meta ? `<p class="muted page-meta">${meta}</p>` : ''}
    </div>
    ${actionsHtml ? `<div class="page-actions">${actionsHtml}</div>` : '<div></div>'}
  </header>
`;
