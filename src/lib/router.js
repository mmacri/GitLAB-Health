const KNOWN_TOP_LEVEL = new Set([
  'today',
  'portfolio',
  'simulator',
  'toolkit',
  'success-plans',
  'account',
  'journey',
  'programs',
  'playbooks',
  'resources',
  'cheatsheet',
  'exports',
  'intake'
]);

const trimSlash = (value) => value.replace(/\/+$/, '');

export const detectBasePath = (pathname) => {
  const parts = String(pathname || '/')
    .split('/')
    .filter(Boolean);

  if (!parts.length) return '';
  if (KNOWN_TOP_LEVEL.has(parts[0])) return '';
  if (parts.length > 1 && KNOWN_TOP_LEVEL.has(parts[1])) return `/${parts[0]}`;

  // For GitLab project pages (for example /GitLAB-Health/)
  return `/${parts[0]}`;
};

const stripBase = (pathname, basePath) => {
  if (!basePath) return pathname || '/';
  if (pathname === basePath) return '/';
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || '/';
  }
  return pathname || '/';
};

export const parseRoute = (pathname, basePath = '') => {
  const localPath = stripBase(pathname || '/', trimSlash(basePath));
  const normalized = localPath === '' ? '/' : localPath;

  if (normalized === '/') {
    return { name: 'home', params: {}, path: normalized };
  }
  if (normalized === '/today') {
    return { name: 'home', params: {}, path: normalized };
  }
  if (normalized === '/portfolio') {
    return { name: 'portfolio', params: {}, path: normalized };
  }
  if (normalized === '/simulator') {
    return { name: 'simulator', params: {}, path: normalized };
  }
  if (normalized === '/toolkit') {
    return { name: 'toolkit', params: {}, path: normalized };
  }
  if (normalized === '/success-plans') {
    return { name: 'toolkit', params: {}, path: normalized };
  }
  if (normalized === '/journey') {
    return { name: 'journey', params: { id: '' }, path: normalized };
  }
  if (normalized === '/programs') {
    return { name: 'programs', params: {}, path: normalized };
  }
  if (normalized === '/playbooks') {
    return { name: 'playbooks', params: {}, path: normalized };
  }
  if (normalized === '/resources') {
    return { name: 'resources', params: {}, path: normalized };
  }
  if (normalized === '/cheatsheet') {
    return { name: 'cheatsheet', params: {}, path: normalized };
  }
  if (normalized === '/exports') {
    return { name: 'exports', params: {}, path: normalized };
  }
  if (normalized === '/intake') {
    return { name: 'intake', params: {}, path: normalized };
  }
  if (normalized === '/account') {
    return { name: 'account', params: { id: '' }, path: normalized };
  }

  const accountMatch = normalized.match(/^\/account\/([^/]+)$/);
  if (accountMatch) {
    return {
      name: 'account',
      params: { id: decodeURIComponent(accountMatch[1]) },
      path: normalized
    };
  }

  const journeyMatch = normalized.match(/^\/journey\/([^/]+)$/);
  if (journeyMatch) {
    return {
      name: 'journey',
      params: { id: decodeURIComponent(journeyMatch[1]) },
      path: normalized
    };
  }

  return { name: 'home', params: {}, path: '/' };
};

export const routePath = (routeName, params = {}) => {
  if (routeName === 'home') return '/today';
  if (routeName === 'portfolio') return '/portfolio';
  if (routeName === 'simulator') return '/simulator';
  if (routeName === 'toolkit') return '/toolkit';
  if (routeName === 'success-plans') return '/success-plans';
  if (routeName === 'account') {
    return params.id ? `/account/${encodeURIComponent(params.id || '')}` : '/account';
  }
  if (routeName === 'journey') {
    return params.id ? `/journey/${encodeURIComponent(params.id || '')}` : '/journey';
  }
  if (routeName === 'programs') return '/programs';
  if (routeName === 'playbooks') return '/playbooks';
  if (routeName === 'resources') return '/resources';
  if (routeName === 'cheatsheet') return '/cheatsheet';
  if (routeName === 'exports') return '/exports';
  if (routeName === 'intake') return '/intake';
  return '/';
};

export const buildHref = (routeName, params = {}, basePath = '') => {
  const base = trimSlash(basePath || '');
  const path = routePath(routeName, params);
  return `${base}${path}` || '/';
};

export const createRouter = (basePath = '') => {
  const listeners = new Set();

  const emit = () => {
    const route = parseRoute(window.location.pathname, basePath);
    listeners.forEach((listener) => listener(route));
  };

  const navigate = (routeName, params = {}, options = {}) => {
    const href = buildHref(routeName, params, basePath);
    if (options.replace) {
      window.history.replaceState({}, '', href);
    } else {
      window.history.pushState({}, '', href);
    }
    emit();
  };

  window.addEventListener('popstate', emit);

  return {
    getCurrentRoute: () => parseRoute(window.location.pathname, basePath),
    navigate,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      emit();
    }
  };
};
