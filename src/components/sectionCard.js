export const sectionCard = ({
  title = '',
  subtitle = '',
  chipHtml = '',
  bodyHtml = '',
  actionsHtml = '',
  compact = false
}) => `
  <article class="card${compact ? ' compact-card' : ''}">
    ${
      title
        ? `<div class="metric-head">
             <h2>${title}</h2>
             ${chipHtml || ''}
           </div>`
        : ''
    }
    ${subtitle ? `<p class="muted">${subtitle}</p>` : ''}
    ${bodyHtml || ''}
    ${actionsHtml ? `<div class="page-actions">${actionsHtml}</div>` : ''}
  </article>
`;
