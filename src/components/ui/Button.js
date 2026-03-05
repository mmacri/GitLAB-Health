const toClassName = (value = '') => String(value || '').trim();

export const buttonHtml = ({
  label = 'Action',
  variant = 'secondary',
  attrs = '',
  className = '',
  icon = ''
} = {}) => {
  const map = {
    primary: 'qa',
    secondary: 'ghost-btn',
    tertiary: 'ghost-btn',
    ghost: 'ghost-btn',
    danger: 'ghost-btn'
  };
  const base = map[variant] || 'ghost-btn';
  const classes = [base, toClassName(className)].filter(Boolean).join(' ');
  const iconHtml = icon ? `<span aria-hidden="true">${icon}</span>` : '';
  return `<button type="button" class="${classes}" ${attrs}>${iconHtml}<span>${label}</span></button>`;
};

