import { card } from './ui/Card.js';

export const sectionCard = ({
  title = '',
  subtitle = '',
  chipHtml = '',
  bodyHtml = '',
  actionsHtml = '',
  compact = false
}) =>
  card({
    title,
    subtitle,
    badge: chipHtml,
    body: bodyHtml,
    actions: actionsHtml,
    className: compact ? 'compact-card' : ''
  });
