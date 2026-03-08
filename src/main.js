import { createCommandPalette } from './components/commandPalette.js';
import { createModal } from './components/modal.js';
import { createCustomerSafeBanner } from './components/CustomerSafeBanner.js';
import { createEngagementExportModal } from './components/EngagementExportModal.js';
import { createModeTabs } from './components/ModeTabs.js?v=20260308-3';
import { createActiveFilterChips } from './components/ActiveFilterChips.js';
import { createEmptyState } from './components/EmptyState.js';
import { mountToastContainer } from './components/ToastContainer.js';
import { createRouter, detectBasePath, parseRoute, routePath } from './lib/router.js';
import {
  loadDashboardData,
  loadPlaybookChecklist,
  persistAccountField,
  persistPlaybookChecklist,
  persistProgram,
  persistWorkspace,
  persistRequests,
  resetLocalState
} from './lib/dataLoader.js';
import {
  buildShareSnapshotUrl,
  decodeWorkspaceSnapshot,
  exportAccountCsv,
  exportAccountSummaryPdf,
  exportManagerSummaryPdf,
  exportPortfolioCsv,
  exportProgramsCsv,
  exportVocCsv,
  toCsv,
  triggerDownload
} from './lib/exports.js';
import { formatDateTime, toIsoDate } from './lib/date.js';
import { addEngagementLogEntry } from './lib/engagementLog.js';
import { toProgramLookupKey } from './lib/programIdentity.js';
import {
  buildAccountWorkspace,
  buildManagerDashboard,
  buildPortfolioView,
  buildWorkspacePortfolio,
  createMonthlySnapshot,
  deriveExpansionSuggestions,
  deriveRiskSignals,
  scoreBreakdown
} from './lib/scoring.js';
import { storage, STORAGE_KEYS } from './lib/storage.js';
import { createDefaultWorkspace, ensureWorkspaceShape, validateWorkspace } from './lib/model.js';
import { useCustomerSafe, setCustomerSafeMode } from './composables/useCustomerSafe.js';
import { ENGAGEMENT_TYPES, normalizeEngagementType } from './config/engagementTypes.js';
import { DEFAULT_PT_CALIBRATION, ensurePtCalibration } from './config/ptCalibration.js';
import { toastStore } from './stores/toastStore.js';
import { renderAccountPage, accountCommandEntries } from './pages/accountPage.js';
import { renderExportsPage, exportsCommandEntries } from './pages/exportsPage.js';
import { renderIntakePage, intakeCommandEntries } from './pages/intakePage.js';
import { renderPlaybooksPage, playbooksCommandEntries } from './pages/playbooksPage.js';
import { renderPortfolioHomePage, renderPortfolioPage, portfolioCommandEntries } from './pages/portfolioPage.js';
import { renderProgramsPage, programsCommandEntries } from './pages/programsPage.js';
import { renderProgramDetailPage } from './pages/programDetailPage.js';
import { renderResourcesPage, resourcesCommandEntries } from './pages/resourcesPage.js';
import { renderToolkitPage, toolkitCommandEntries } from './pages/toolkitPage.js';
import { renderCheatsheetPage, cheatsheetCommandEntries } from './pages/cheatsheetPage.js';
import { renderSimulatorPage, simulatorCommandEntries } from './pages/simulatorPage.js';
import { renderManagerPage, managerCommandEntries } from './pages/managerPage.js';
import { renderCustomersPage, customersCommandEntries } from './pages/customersPage.js';
import { renderCustomerDetailPage, customerDetailCommandEntries } from './pages/customerDetailPage.js';
import { renderRisksPage } from './pages/risksPage.js';
import { renderExpansionPage } from './pages/expansionPage.js';
import { renderVocPage } from './pages/vocPage.js';
import { renderReportsPage } from './pages/reportsPage.js';
import { renderPropensityPage, propensityCommandEntries } from './pages/propensityPage.js';
import { renderSettingsPage } from './pages/settingsPage.js';

const appRoot = document.querySelector('[data-app-root]');
const routeRoot = document.querySelector('[data-route-root]');
const leftRailRoot = document.querySelector('[data-left-rail]');
const settingsRoot = document.querySelector('[data-settings]');
const sidebarOverlay = document.querySelector('[data-sidebar-overlay]');
let headerResizeObserver = null;
let pendingSnapshotWorkspace = null;
const customerSafe = useCustomerSafe();

const syncHeaderOffset = () => {
  const header = document.querySelector('.app-header');
  if (!header) return;

  const offset = Math.max(120, Math.ceil(header.getBoundingClientRect().height + 16));
  document.documentElement.style.setProperty('--header-offset', `${offset}px`);
};

const observeHeaderOffset = () => {
  syncHeaderOffset();

  const onViewportChange = () => {
    closeHeaderMenus();
    syncHeaderOffset();
  };
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', onViewportChange);

  const header = document.querySelector('.app-header');
  if (header && 'ResizeObserver' in window) {
    if (headerResizeObserver) {
      headerResizeObserver.disconnect();
    }
    headerResizeObserver = new ResizeObserver(() => syncHeaderOffset());
    headerResizeObserver.observe(header);
  }
};

const closeHeaderMenus = () => {
  const moreButton = appRoot?.querySelector('[data-open-more]');
  const moreMenu = appRoot?.querySelector('[data-more-menu]');
  const filterButtons = [...(appRoot?.querySelectorAll('[data-open-filters]') || [])];
  const filtersPanel = appRoot?.querySelector('[data-filters-panel]');

  if (moreMenu && !moreMenu.hidden) {
    moreMenu.hidden = true;
  }
  if (moreButton) {
    moreButton.setAttribute('aria-expanded', 'false');
  }
  if (filtersPanel && !filtersPanel.hasAttribute('hidden')) {
    filtersPanel.setAttribute('hidden', 'hidden');
  }
  filterButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
};

if (!appRoot || !routeRoot || !leftRailRoot) {
  throw new Error('App shell is missing required mount points.');
}

const initialDefaultMode = storage.get(STORAGE_KEYS.defaultMode, 'today') || 'today';
const initialDefaultPersona = storage.get(STORAGE_KEYS.defaultPersona, 'cse') || 'cse';
const initialTheme = storage.get(STORAGE_KEYS.theme, 'light') || 'light';

const state = {
  data: null,
  route: { name: 'home', params: {}, path: '/' },
  customerSafe: customerSafe.isCustomerSafe,
  viewMode: storage.get(STORAGE_KEYS.viewMode, initialDefaultMode) || 'today',
  persona: String(initialDefaultPersona) === 'manager' ? 'manager' : 'cse',
  theme: String(initialTheme) === 'dark' ? 'dark' : 'light',
  density: storage.get(STORAGE_KEYS.density, 'default') || 'default',
  sidebarOpen: false,
  activeQueueTab: 'all',
  filters: {
    engagementTypes: [],
    requestedBy: [],
    engagementStatus: [],
    useCaseMaturity: []
  },
  basePath: '',
  portfolioFilters: {
    segment: 'all',
    renewalWindow: 'all',
    health: 'all',
    staleOnly: false,
    staleDays: 30,
    engagementRecency: 'all',
    pteBand: 'all',
    ptcBand: 'all',
    lowestUseCase: 'all',
    hasOpenRequest: false,
    belowThreeGreen: false,
    engagementTypes: [],
    requestedBy: [],
    engagementStatus: [],
    adoptionUseCase: 'all',
    adoptionMaturity: []
  },
  checklistState: {},
  selectedAccountId: storage.get(STORAGE_KEYS.selectedAccountId, ''),
  selectedCustomerId: storage.get(STORAGE_KEYS.selectedAccountId, ''),
  actionCardCompletion: storage.get(STORAGE_KEYS.actionCards, {})
};

const VALID_MODES = new Set(['today', 'review', 'deep']);

const normalizeMode = (value) => {
  const mode = String(value || 'today').trim().toLowerCase();
  return VALID_MODES.has(mode) ? mode : 'today';
};

const parseModeFromHash = () => {
  const hash = String(window.location.hash || '').trim();
  if (!hash.includes('?')) return null;
  const query = hash.split('?')[1] || '';
  const mode = new URLSearchParams(query).get('mode');
  return VALID_MODES.has(String(mode || '')) ? String(mode) : null;
};

const syncModeHash = () => {
  const path = routePath(state.route.name, state.route.params);
  const mode = normalizeMode(state.viewMode);
  const nextHash = mode === 'today' ? `#${path}` : `#${path}?mode=${mode}`;
  if (window.location.hash === nextHash) return;
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}${nextHash}`);
};

const applyDensity = () => {
  const density = ['compact', 'comfortable', 'default'].includes(state.density) ? state.density : 'default';
  document.documentElement.setAttribute('data-density', density);
};

const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', state.theme === 'dark' ? 'dark' : 'light');
};

const syncSidebarState = () => {
  const sidebar = leftRailRoot;
  const toggle = appRoot.querySelector('[data-sidebar-toggle]');
  const isOpen = Boolean(state.sidebarOpen);
  sidebar?.classList.toggle('open', isOpen);
  sidebarOverlay?.classList.toggle('visible', isOpen);
  toggle?.classList.toggle('open', isOpen);
  toggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  toggle?.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
};

const closeSidebar = () => {
  if (!state.sidebarOpen) return;
  state.sidebarOpen = false;
  syncSidebarState();
};

const toggleSidebar = () => {
  state.sidebarOpen = !state.sidebarOpen;
  syncSidebarState();
};

const notify = (message, type = 'success') => {
  toastStore.show({ message, type });
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    return true;
  }
};

const currentAccount = () => {
  const accounts = state.data?.accounts || [];
  if (!accounts.length) return null;
  return (
    accounts.find((account) => account.id === state.selectedAccountId) ||
    accounts[0]
  );
};

const getAccountById = (accountId) => (state.data?.accounts || []).find((account) => account.id === accountId) || null;

const appendChangeLog = (accountId, category, summary, date = toIsoDate(new Date())) => {
  const account = getAccountById(accountId);
  if (!account) return;
  const existing = Array.isArray(account.change_log) ? account.change_log : [];
  const next = [{ date, category, summary }, ...existing].slice(0, 30);
  persistAccountField(accountId, 'change_log', next);
  account.change_log = next;
};

const setSelectedAccount = (accountId) => {
  state.selectedAccountId = accountId;
  storage.set(STORAGE_KEYS.selectedAccountId, accountId);
};

const currentWorkspace = () => ensureWorkspaceShape(state.data?.workspace || createDefaultWorkspace(), state.data?.sampleWorkspace || null);

const workspaceCustomerById = (customerId) =>
  (currentWorkspace().customers || []).find((customer) => customer.id === customerId) || null;

const currentCustomer = () => {
  const workspace = currentWorkspace();
  const target = state.selectedCustomerId || workspace.customers?.[0]?.id || '';
  return workspace.customers.find((customer) => customer.id === target) || workspace.customers[0] || null;
};

const setSelectedCustomer = (customerId) => {
  state.selectedCustomerId = customerId;
  storage.set(STORAGE_KEYS.selectedAccountId, customerId);
};

const ensureWorkspaceDerived = (workspace) => {
  const model = ensureWorkspaceShape(workspace, state.data?.sampleWorkspace || createDefaultWorkspace());
  (model.customers || []).forEach((customer) => {
    const customerId = customer.id;
    if (!model.risk[customerId]) model.risk[customerId] = { signals: [], playbook: [], dismissals: [], overrideHealth: null };
    if (!Array.isArray(model.risk[customerId].dismissals)) model.risk[customerId].dismissals = [];
    const manualSignals = (model.risk[customerId].signals || []).filter((signal) => signal.source !== 'derived');
    const derivedSignals = deriveRiskSignals(model, customerId, new Date()).filter((signal) => signal.source === 'derived');
    model.risk[customerId].signals = [...manualSignals, ...derivedSignals];
    model.expansion[customerId] = deriveExpansionSuggestions(model, customerId);
  });
  model.updatedAt = new Date().toISOString();
  return model;
};

const setWorkspace = (workspace) => {
  const normalized = ensureWorkspaceDerived(workspace);
  const errors = validateWorkspace(normalized);
  state.data.workspaceErrors = errors;
  state.data.workspace = persistWorkspace(normalized);
};

const updateWorkspace = (updater) => {
  const source = currentWorkspace();
  const draft = JSON.parse(JSON.stringify(source));
  updater?.(draft);
  setWorkspace(draft);
  render();
};

const setSafeMode = (value) => {
  state.customerSafe = setCustomerSafeMode(Boolean(value));
  render();
};

const maskField = (fieldName, value) => customerSafe.maskField(fieldName, value);

const setViewMode = (value, { syncHash = true } = {}) => {
  state.viewMode = normalizeMode(value);
  storage.set(STORAGE_KEYS.viewMode, state.viewMode);
  if (syncHash) syncModeHash();
  closeSidebar();
  render();
};

const setDefaultMode = (value) => {
  const normalized = normalizeMode(value);
  storage.set(STORAGE_KEYS.defaultMode, normalized);
};

const setPersona = (value, { persistDefault = false } = {}) => {
  const next = String(value || '').trim().toLowerCase() === 'manager' ? 'manager' : 'cse';
  state.persona = next;
  if (persistDefault) {
    storage.set(STORAGE_KEYS.defaultPersona, next);
  }
  if (state.route.name === 'manager' && next !== 'manager') {
    router.navigate('home');
    return;
  }
  render();
};

const setDefaultPersona = (value) => {
  const normalized = String(value || '').trim().toLowerCase() === 'manager' ? 'manager' : 'cse';
  storage.set(STORAGE_KEYS.defaultPersona, normalized);
};

const setDensity = (value) => {
  const next = String(value || 'default').trim().toLowerCase();
  state.density = ['compact', 'comfortable', 'default'].includes(next) ? next : 'default';
  storage.set(STORAGE_KEYS.density, state.density);
  applyDensity();
  render();
};

const setTheme = (value) => {
  const next = String(value || 'light').trim().toLowerCase() === 'dark' ? 'dark' : 'light';
  state.theme = next;
  storage.set(STORAGE_KEYS.theme, next);
  applyTheme();
  render();
};

const setPortfolioFilters = (patch) => {
  state.portfolioFilters = {
    ...state.portfolioFilters,
    ...patch
  };
  render();
};

const countActivePortfolioFilters = (filters = {}) => {
  let count = 0;
  if (filters.segment && filters.segment !== 'all') count += 1;
  if (filters.renewalWindow && filters.renewalWindow !== 'all') count += 1;
  if (filters.health && filters.health !== 'all') count += 1;
  if (filters.engagementRecency && filters.engagementRecency !== 'all') count += 1;
  if (filters.pteBand && filters.pteBand !== 'all') count += 1;
  if (filters.ptcBand && filters.ptcBand !== 'all') count += 1;
  if (filters.lowestUseCase && filters.lowestUseCase !== 'all') count += 1;
  if (filters.adoptionUseCase && filters.adoptionUseCase !== 'all') count += 1;
  if (Array.isArray(filters.adoptionMaturity) && filters.adoptionMaturity.length) count += 1;
  if (Array.isArray(filters.engagementTypes) && filters.engagementTypes.length) count += 1;
  if (Array.isArray(filters.requestedBy) && filters.requestedBy.length) count += 1;
  if (Array.isArray(filters.engagementStatus) && filters.engagementStatus.length) count += 1;
  if (filters.staleOnly) count += 1;
  if (filters.hasOpenRequest) count += 1;
  if (filters.belowThreeGreen) count += 1;
  return count;
};

const activeFilterChipData = (filters = {}) => {
  const chips = [];
  if (filters.segment && filters.segment !== 'all') chips.push({ id: 'segment', label: `Segment: ${filters.segment}` });
  if (filters.renewalWindow && filters.renewalWindow !== 'all') chips.push({ id: 'renewalWindow', label: `Renewal: ${filters.renewalWindow}` });
  if (filters.health && filters.health !== 'all') chips.push({ id: 'health', label: `Health: ${filters.health}` });
  if (filters.pteBand && filters.pteBand !== 'all') chips.push({ id: 'pteBand', label: `PtE: ${filters.pteBand}` });
  if (filters.ptcBand && filters.ptcBand !== 'all') chips.push({ id: 'ptcBand', label: `PtC: ${filters.ptcBand}` });
  if (filters.staleOnly) chips.push({ id: 'staleOnly', label: `Stale > ${filters.staleDays || 30}d` });
  if (filters.belowThreeGreen) chips.push({ id: 'belowThreeGreen', label: 'Adoption < 3 green' });
  if (Array.isArray(filters.engagementTypes) && filters.engagementTypes.length) {
    chips.push({ id: 'engagementTypes', label: `Type: ${filters.engagementTypes.map((item) => item.replace(/_/g, ' ')).join(', ')}` });
  }
  if (Array.isArray(filters.requestedBy) && filters.requestedBy.length) {
    chips.push({ id: 'requestedBy', label: `Requested by: ${filters.requestedBy.join(', ')}` });
  }
  if (Array.isArray(filters.engagementStatus) && filters.engagementStatus.length) {
    chips.push({ id: 'engagementStatus', label: `Status: ${filters.engagementStatus.map((item) => item.replace(/_/g, ' ')).join(', ')}` });
  }
  if (filters.hasOpenRequest) chips.push({ id: 'hasOpenRequest', label: 'Open requests only' });
  return chips;
};

const setActionCardCompletion = (accountId, actionId, complete) => {
  if (!accountId || !actionId) return;
  const current = state.actionCardCompletion && typeof state.actionCardCompletion === 'object' ? state.actionCardCompletion : {};
  const accountState = { ...(current[accountId] || {}) };
  accountState[actionId] = Boolean(complete);
  state.actionCardCompletion = {
    ...current,
    [accountId]: accountState
  };
  storage.set(STORAGE_KEYS.actionCards, state.actionCardCompletion);
  render();
};

const applyQueryOverrides = () => {
  const search = new URLSearchParams(window.location.search);
  const route = search.get('route');
  const audience = search.get('audience');
  const snapshot = search.get('ws');
  const modeFromSearch = normalizeMode(search.get('mode') || '');
  const modeFromHash = parseModeFromHash();

  if (audience === 'customer') {
    state.customerSafe = setCustomerSafeMode(true);
  }

  if (search.has('mode')) {
    state.viewMode = modeFromSearch;
    storage.set(STORAGE_KEYS.viewMode, state.viewMode);
  } else if (modeFromHash) {
    state.viewMode = modeFromHash;
    storage.set(STORAGE_KEYS.viewMode, state.viewMode);
  }

  if (snapshot) {
    const decoded = decodeWorkspaceSnapshot(snapshot);
    if (decoded && typeof decoded === 'object') {
      pendingSnapshotWorkspace = decoded;
    }
  }

  const normalizeRouteForHash = (value) => {
    const input = String(value || '').trim();
    if (!input) return '/today';
    const hashIndex = input.indexOf('#');
    const fromHash = hashIndex >= 0 ? input.slice(hashIndex + 1).split('?')[0] : '';
    const fromPath = input.split('?')[0];
    const candidate = fromHash && fromHash.startsWith('/') ? fromHash : fromPath;
    if (!candidate) return '/today';
    return candidate.startsWith('/') ? candidate : `/${candidate}`;
  };

  const base = state.basePath.replace(/\/+$/, '');
  if (route) {
    const normalized = normalizeRouteForHash(route);
    window.history.replaceState({}, '', `${base || ''}/#${normalized}`);
    return;
  }

  if (window.location.hash) return;
  const current = parseRoute(window.location.pathname, state.basePath);
  const target = current.path === '/' ? '/today' : current.path;
  window.history.replaceState({}, '', `${base || ''}/#${target}`);
};

const navItems = () => appRoot.querySelectorAll('[data-nav-route]');
const ACCOUNT_SECTION_LINKS = [
  { id: 'summary', label: 'Summary' },
  { id: 'journey', label: 'Journey' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'health', label: 'Health & Risk' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'outcomes', label: 'Outcomes' },
  { id: 'exports', label: 'Exports' }
];
const PRIMARY_NAV_ITEMS = [
  { route: 'home', label: 'Today', icon: 'T' },
  { route: 'portfolio', label: 'Portfolio', icon: 'P' },
  { route: 'customers', label: 'Customers', icon: 'C' },
  { route: 'programs', label: 'Programs', icon: 'PG' },
  { route: 'toolkit', label: 'Success Plans', icon: 'SP' },
  { route: 'risks', label: 'Risks', icon: 'R' },
  { route: 'expansion', label: 'Expansion', icon: 'EX' },
  { route: 'voc', label: 'VOC', icon: 'V' },
  { route: 'simulator', label: 'Simulator', icon: 'S' },
  { route: 'manager', label: 'Manager', icon: 'M' },
  { route: 'reports', label: 'Reports', icon: 'RP' },
  { route: 'propensity', label: 'PtE / PtC', icon: 'PX' },
  { route: 'settings', label: 'Settings', icon: 'ST' },
  { route: 'resources', label: 'Resources', icon: 'RS' }
];
const ROUTE_LABELS = {
  home: 'Today',
  portfolio: 'Portfolio',
  customers: 'Customers',
  customer: 'Customer',
  account: 'Account',
  journey: 'Journey',
  toolkit: 'Success Plans',
  simulator: 'Simulator',
  programs: 'Programs',
  program: 'Program',
  risks: 'Risks',
  expansion: 'Expansion',
  voc: 'Voice of Customer',
  reports: 'Reports',
  propensity: 'PtE / PtC',
  settings: 'Settings',
  playbooks: 'Playbooks',
  resources: 'Resources',
  cheatsheet: 'Cheatsheet',
  exports: 'Exports',
  intake: 'Intake',
  manager: 'Manager'
};

const SHELL_ICON_SVGS = {
  today:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="11" height="10" rx="2"></rect><path d="M5 2.5v2M11 2.5v2M2.5 6.5h11"></path></svg>',
  portfolio:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 13.5h11"></path><path d="M4.5 11V7.5M8 11V4.5M11.5 11V6"></path></svg>',
  customers:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5.5" r="2"></circle><path d="M2.8 12.8c.4-1.9 1.6-3 3.2-3s2.8 1.1 3.2 3"></path><circle cx="11.4" cy="6.5" r="1.4"></circle><path d="M10.2 12.6c.2-1.2.9-2 2-2 .7 0 1.3.3 1.7.9"></path></svg>',
  programs:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="4.8"></circle><circle cx="8" cy="8" r="2.4"></circle><circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none"></circle></svg>',
  manager:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 12.8c.4-1.7 1.5-2.8 3-2.8s2.6 1.1 3 2.8"></path><circle cx="5.8" cy="5.8" r="1.9"></circle><path d="M9.2 12.6c.3-1.4 1.3-2.2 2.7-2.2 1 0 1.8.4 2.3 1.2"></path><circle cx="12" cy="6.6" r="1.4"></circle></svg>',
  filters:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.2 3.5h11.6L9.6 8.4v3.1l-3.2 1V8.4z"></path></svg>',
  playbooks:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3.2h6.4a2.2 2.2 0 0 1 2.2 2.2v7.2H5.2A2.2 2.2 0 0 0 3 14.8z"></path><path d="M5.2 12.6h7.8"></path></svg>',
  current:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8h8.8"></path><path d="M8.8 5.3L11.5 8l-2.7 2.7"></path></svg>',
  link:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 9.4l2.8-2.8"></path><path d="M5.1 11a2.7 2.7 0 0 1 0-3.8L6.5 5.8a2.7 2.7 0 1 1 3.8 3.8l-1.4 1.4a2.7 2.7 0 0 1-3.8 0z"></path></svg>',
  export:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5v7"></path><path d="M5.5 7.8L8 10.5l2.5-2.7"></path><path d="M3 12.5h10"></path></svg>',
  settings:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.1"></circle><path d="M8 2.6v1.4M8 12v1.4M3.9 3.9l1 1M11.1 11.1l1 1M2.6 8h1.4M12 8h1.4M3.9 12.1l1-1M11.1 4.9l1-1"></path></svg>',
  resources:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3.4h4.8a2 2 0 0 1 2 2v7.2H5a2 2 0 0 0-2 2z"></path><path d="M9.8 5.4h2.5c.9 0 1.7.7 1.7 1.7v7.5H8.8"></path></svg>',
  propensity:
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12.5h11"></path><path d="M4.2 12.5V9.2M8 12.5V6.2M11.8 12.5V3.8"></path></svg>',
  dot:
    '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="2.1" fill="currentColor"></circle></svg>'
};

const shellIcon = (name, extraClass = '') =>
  `<span class="sidebar__item-icon${extraClass ? ` ${extraClass}` : ''}" aria-hidden="true">${SHELL_ICON_SVGS[name] || SHELL_ICON_SVGS.dot}</span>`;

const focusAccountSection = (sectionId) => {
  if (!sectionId) return;
  const tabButton = routeRoot.querySelector(`[data-tab-target="${sectionId}"]`);
  tabButton?.click();
  const panel = routeRoot.querySelector(`[data-tab-panel="${sectionId}"]`);
  panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const setActiveNav = () => {
  const activeRoute =
    state.route.name === 'customer'
      ? 'customers'
      : state.route.name === 'program'
        ? 'programs'
        : state.route.name;
  navItems().forEach((link) => {
    const route = link.getAttribute('data-nav-route');
    const active = route === activeRoute;
    link.classList.toggle('active', active);
    link.classList.toggle('is-active', active);
  });
};

const renderLeftRail = () => {
  if (!leftRailRoot) return;
  const workspace = currentWorkspace();
  const customers = workspace.customers || [];
  const loadErrors = Array.isArray(state.data?.loadErrors) ? state.data.loadErrors : [];
  const accountLoadError = loadErrors.some((item) => item.file === 'accounts.json');
  const current = currentCustomer() || currentAccount();
  const isAccountContext = ['account', 'journey', 'customer'].includes(state.route.name);
  const sectionLinks =
    state.route.name === 'customer'
      ? [
          { id: 'adoption', label: 'Adoption' },
          { id: 'success-plan', label: 'Success Plan' },
          { id: 'engagement', label: 'Engagement' },
          { id: 'risk', label: 'Risk' },
          { id: 'expansion', label: 'Expansion' },
          { id: 'voc', label: 'VOC' }
        ]
      : ACCOUNT_SECTION_LINKS;
  const filterCount = countActivePortfolioFilters(state.portfolioFilters);
  const lastPlaybook = (() => {
    try {
      const stored = window.localStorage.getItem('lastPlaybook');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();
  const recentCustomers = [...customers]
    .sort((left, right) => {
      if (left.id === state.selectedCustomerId) return -1;
      if (right.id === state.selectedCustomerId) return 1;
      return String(left.name || '').localeCompare(String(right.name || ''));
    })
    .slice(0, 8);

  leftRailRoot.innerHTML = `
    <div class="sidebar__brand">
      <div class="sidebar__brand-icon" aria-hidden="true">GL</div>
      <div class="sidebar__brand-text">
        <span class="sidebar__brand-name">GitLab CSE</span>
        <span class="sidebar__brand-sub">On-Demand Console</span>
      </div>
    </div>

    <section class="sidebar__zone sidebar__zone--nav">
      <p class="sidebar__zone-label">Work</p>
      <button class="sidebar__item ${state.route.name === 'home' ? 'active' : ''}" type="button" data-nav-route="home">
        ${shellIcon('today')}
        <span>Today</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'intake' ? 'active' : ''}" type="button" data-nav-route="intake">
        ${shellIcon('current')}
        <span>Intake</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'programs' || state.route.name === 'program' ? 'active' : ''}" type="button" data-nav-route="programs">
        ${shellIcon('programs')}
        <span>Programs</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'playbooks' ? 'active' : ''}" type="button" data-go-playbooks>
        ${shellIcon('playbooks')}
        <span>Playbooks</span>
      </button>
    </section>

    <section class="sidebar__zone sidebar__zone--portfolio">
      <p class="sidebar__zone-label">Portfolio</p>
      <button class="sidebar__item ${state.route.name === 'portfolio' ? 'active' : ''}" type="button" data-nav-route="portfolio">
        ${shellIcon('portfolio')}
        <span>Portfolio</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'customers' || state.route.name === 'customer' ? 'active' : ''}" type="button" data-nav-route="customers">
        ${shellIcon('customers')}
        <span>Customers</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'risks' ? 'active' : ''}" type="button" data-nav-route="risks">
        ${shellIcon('dot')}
        <span>Risks</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'expansion' ? 'active' : ''}" type="button" data-nav-route="expansion">
        ${shellIcon('dot')}
        <span>Expansion</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'propensity' ? 'active' : ''}" type="button" data-go-propensity>
        ${shellIcon('propensity')}
        <span>PtE / PtC</span>
      </button>
      <button class="sidebar__item" type="button" data-open-filters aria-expanded="false">
        ${shellIcon('filters')}
        <span>Filters</span>
        ${filterCount > 0 ? `<span class="sidebar__badge">${filterCount}</span>` : ''}
      </button>
    </section>

    <section class="sidebar__zone sidebar__zone--insights">
      <p class="sidebar__zone-label">Insights</p>
      <button class="sidebar__item ${state.route.name === 'manager' ? 'active' : ''}" type="button" data-nav-route="manager">
        ${shellIcon('manager')}
        <span>Manager</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'reports' ? 'active' : ''}" type="button" data-nav-route="reports">
        ${shellIcon('portfolio')}
        <span>Reports</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'voc' ? 'active' : ''}" type="button" data-nav-route="voc">
        ${shellIcon('dot')}
        <span>Voice of Customer</span>
      </button>
      <button class="sidebar__item ${state.route.name === 'cheatsheet' ? 'active' : ''}" type="button" data-nav-route="cheatsheet">
        ${shellIcon('resources')}
        <span>Cheatsheet</span>
      </button>
    </section>

    <section class="sidebar__zone sidebar__zone--tools">
      <p class="sidebar__zone-label">${isAccountContext ? 'Jump To Section' : 'Open'}</p>
      <button class="sidebar__item" type="button" data-rail-open-current ${current ? '' : 'disabled'}>
        ${shellIcon('current')}
        <span>Open Selected Customer</span>
      </button>
      <div class="sidebar__field">
        <label for="sidebar-jump">Jump to section</label>
        <select id="sidebar-jump" data-global-jump></select>
      </div>
      ${
        isAccountContext
          ? sectionLinks
              .map(
                (item) =>
                  `<button class="sidebar__item" type="button" data-rail-section="${item.id}">
                    ${shellIcon('dot')}
                    <span>${item.label}</span>
                  </button>`
              )
              .join('')
          : ''
      }
      <p class="sidebar__zone-label">Recent Customers</p>
      ${
        recentCustomers.length
          ? recentCustomers
              .map(
                (customer) =>
                  `<button class="sidebar__item ${customer.id === state.selectedCustomerId ? 'active' : ''}" type="button" data-rail-customer="${customer.id}">
                    <span class="sidebar__item-icon sidebar__item-icon--avatar" aria-hidden="true">${String(customer.name || '?').trim().charAt(0).toUpperCase()}</span>
                    <span>${state.customerSafe ? maskField('accountName', customer.name) || 'Your Organization' : customer.name}</span>
                  </button>`
              )
              .join('')
          : accountLoadError
            ? '<p class="empty-text">Customer data failed to load.</p>'
            : '<p class="empty-text">No customers loaded.</p>'
      }
    </section>

    <section class="sidebar__zone sidebar__zone--utils">
      <p class="sidebar__zone-label">Workspace</p>
      <div class="sidebar__field">
        <label for="sidebar-persona">Persona</label>
        <select id="sidebar-persona" data-global-persona>
          <option value="cse">CSE On-Demand</option>
          <option value="manager">CSE Manager</option>
        </select>
      </div>
      <div class="sidebar__field">
        <label for="sidebar-account">Account</label>
        <select id="sidebar-account" data-global-account-select></select>
      </div>
      <button class="sidebar__item" type="button" data-open-settings>
        ${shellIcon('settings')}
        <span>Settings</span>
      </button>
      <button class="sidebar__item" type="button" data-go-resources>
        ${shellIcon('resources')}
        <span>Resources</span>
      </button>
      <button class="sidebar__item" type="button" data-global-export>
        ${shellIcon('export')}
        <span>Export</span>
      </button>
      <button class="sidebar__item" type="button" data-copy-snapshot>
        ${shellIcon('link')}
        <span>Copy Snapshot Link</span>
      </button>
    </section>
  `;

  leftRailRoot.querySelector('[data-rail-open-current]')?.addEventListener('click', () => {
    const customerContext = ['customers', 'customer', 'program', 'risks', 'expansion', 'voc', 'reports', 'propensity', 'settings'].includes(
      state.route.name
    );
    if (customerContext) {
      const targetId = currentCustomer()?.id || state.data.workspace?.customers?.[0]?.id || '';
      if (!targetId) return;
      setSelectedCustomer(targetId);
      router.navigate('customer', { id: targetId });
      closeSidebar();
      return;
    }
    const targetId = currentAccount()?.id || state.data.accounts?.[0]?.id || '';
    if (!targetId) return;
    setSelectedAccount(targetId);
    router.navigate('account', { id: targetId });
    closeSidebar();
  });

  leftRailRoot.querySelectorAll('[data-rail-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionId = button.getAttribute('data-rail-section');
      focusAccountSection(sectionId);
      closeSidebar();
    });
  });

  leftRailRoot.querySelectorAll('[data-rail-customer]').forEach((button) => {
    button.addEventListener('click', () => {
      const customerId = button.getAttribute('data-rail-customer');
      setSelectedCustomer(customerId);
      router.navigate('customer', { id: customerId });
      closeSidebar();
    });
  });
};

const normalizeProgramType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('webinar')) return 'webinar';
  if (normalized.includes('office')) return 'office hours';
  if (normalized.includes('lab')) return 'hands-on lab';
  return 'webinar';
};

const workspaceProgramUseCases = (program) => {
  const keys = Object.keys(program?.adoptionImpact || {});
  if (!keys.length) return ['Platform'];
  return keys.map((key) => {
    if (key === 'CICD') return 'CI';
    if (key === 'Security') return 'Secure';
    if (key === 'ReleaseAutomation') return 'CD';
    return key;
  });
};

const findWorkspaceProgramIn = (workspace, programId) => {
  const targetId = String(programId || '').trim();
  const lookupKey = toProgramLookupKey(targetId);
  return (
    (workspace?.programs || []).find((program) => {
      const candidateId = String(program?.id || '').trim();
      if (!candidateId) return false;
      if (candidateId === targetId) return true;
      if (!lookupKey) return false;
      if (toProgramLookupKey(candidateId) === lookupKey) return true;
      const legacyId = String(program?.legacyProgramId || '').trim();
      return legacyId ? toProgramLookupKey(legacyId) === lookupKey : false;
    }) || null
  );
};

const workspaceProgramToLegacyView = (program) => ({
  program_id: program.id,
  title: program.name,
  type: normalizeProgramType(program.type),
  date: program.startDate || '',
  target_use_cases: workspaceProgramUseCases(program),
  registration_count: Number(program.funnel?.invited || 0),
  attendance_count: Number(program.funnel?.attended || 0),
  invite_blurb: program.objective || '',
  followup_steps: [`Track adoption movement for ${(program.name || 'program').trim()} attendees.`]
});

const workspaceProgramsForProgramsPage = (workspace = currentWorkspace()) =>
  (workspace?.programs || []).map(workspaceProgramToLegacyView);

const findWorkspaceProgram = (programId, workspace = currentWorkspace()) =>
  findWorkspaceProgramIn(workspace, programId);

const findLegacyProgram = (programId) => {
  const targetId = String(programId || '').trim();
  const lookupKey = toProgramLookupKey(targetId);
  return (
    (state.data.programs || []).find((program) => {
      const legacyId = String(program?.program_id || '').trim();
      if (!legacyId) return false;
      if (legacyId === targetId) return true;
      if (!lookupKey) return false;
      return toProgramLookupKey(legacyId) === lookupKey;
    }) || null
  );
};

const legacyProgramToWorkspaceDetail = (legacyProgram) => {
  if (!legacyProgram) return null;
  return {
    id: legacyProgram.program_id,
    name: legacyProgram.title,
    type: legacyProgram.type,
    startDate: String(legacyProgram.date || '').slice(0, 10),
    endDate: String(legacyProgram.date || '').slice(0, 10),
    objective: legacyProgram.invite_blurb || 'Program objective',
    cohortCustomerIds: [],
    funnel: {
      invited: Number(legacyProgram.registration_count || 0),
      attended: Number(legacyProgram.attendance_count || 0),
      completed: Math.max(0, Math.floor(Number(legacyProgram.attendance_count || 0) * 0.7))
    },
    adoptionImpact: {},
    sessions: [
      {
        date: String(legacyProgram.date || '').slice(0, 10),
        title: legacyProgram.title,
        artifact: ''
      }
    ]
  };
};

const findProgram = (programId) => {
  const workspaceProgram = findWorkspaceProgram(programId);
  if (workspaceProgram) {
    return {
      source: 'workspace',
      view: workspaceProgramToLegacyView(workspaceProgram),
      workspaceProgram
    };
  }
  const legacyProgram = findLegacyProgram(programId);
  if (!legacyProgram) return null;
  return {
    source: 'legacy',
    view: legacyProgram,
    workspaceProgram: null
  };
};

const onCopyInvite = async (programId) => {
  const match = findProgram(programId);
  if (!match) return;
  const program = match.view;
  const blurb = program.invite_blurb || [
    `Join ${program.title || 'Program session'}`,
    `When: ${formatDateTime(program.date)}`,
    `Use cases: ${(program.target_use_cases || []).join(', ') || 'Platform'}`
  ].join('\n');
  await copyText(blurb);
  notify(`Invite copied for ${program.title || 'program'}.`);
};

const updateProgram = (programId, updater) => {
  const targetId = String(programId || '').trim();
  const lookupKey = toProgramLookupKey(targetId);
  const index = (state.data.programs || []).findIndex((program) => {
    const legacyId = String(program?.program_id || '').trim();
    if (!legacyId) return false;
    if (legacyId === targetId) return true;
    if (!lookupKey) return false;
    return toProgramLookupKey(legacyId) === lookupKey;
  });
  if (index < 0) return;
  const updated = updater(state.data.programs[index]);
  state.data.programs[index] = updated;
  persistProgram(updated);
  render();
};

const onLogAttendance = (programId, amount = 1, accountId = '') => {
  const normalizedAmount = Number(amount || 0);
  const workspaceProgram = findWorkspaceProgram(programId);
  if (workspaceProgram) {
    updateWorkspace((workspace) => {
      const program = findWorkspaceProgramIn(workspace, programId);
      if (!program) return;
      const currentInvited = Math.max(0, Number(program.funnel?.invited || 0));
      const nextAttended = Math.max(0, Number(program.funnel?.attended || 0) + normalizedAmount);
      program.funnel = {
        ...(program.funnel || {}),
        invited: Math.max(currentInvited, nextAttended),
        attended: nextAttended,
        completed: Math.max(0, Number(program.funnel?.completed || 0))
      };

      if (!accountId) return;
      const cohort = new Set(program.cohortCustomerIds || []);
      cohort.add(accountId);
      program.cohortCustomerIds = [...cohort];
      if (!Array.isArray(workspace.engagements[accountId])) workspace.engagements[accountId] = [];
      workspace.engagements[accountId].unshift({
        id: createWorkspaceId('eng'),
        ts: `${toIsoDate(new Date())}T12:00:00.000Z`,
        type: 'Workshop',
        summary: `Attendance logged for ${program.name}.`,
        tags: ['program', normalizeProgramType(program.type)],
        nextSteps: ['Confirm follow-up owner and next enablement motion'],
        owner: 'CSE'
      });
    });
    if (accountId) {
      const customer = workspaceCustomerById(accountId);
      addEngagementLogEntry({
        account_id: accountId,
        account_name: customer?.name || accountId,
        date: toIsoDate(new Date()),
        type: `program attendance (${normalizeProgramType(workspaceProgram.type)})`,
        notes_customer_safe: `Attendance logged for ${workspaceProgram.name}.`,
        notes_internal: `Program attendance incremented by ${normalizedAmount}.`
      });
    }
    notify('Attendance updated.');
    return;
  }

  updateProgram(programId, (program) => ({
    ...program,
    attendance_count: Math.max(0, Number(program.attendance_count || 0) + normalizedAmount)
  }));

  if (!accountId) return;

  const account = getAccountById(accountId);
  const match = findProgram(programId);
  const program = match?.view;
  if (!account || !program) return;

  const today = toIsoDate(new Date());
  const existingAttendance = account.engagement?.program_attendance || {};
  const attendanceKey = program.type === 'webinar' ? 'webinars' : program.type === 'hands-on lab' ? 'labs' : 'office_hours';
  const updatedAttendance = {
    ...existingAttendance,
    last_90d: Math.max(0, Number(existingAttendance.last_90d || 0) + normalizedAmount),
    [attendanceKey]: Math.max(0, Number(existingAttendance[attendanceKey] || 0) + normalizedAmount)
  };
  const nextTouchDate = account.engagement?.next_touch_date || toIsoDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14));

  account.engagement = {
    ...account.engagement,
    last_touch_date: today,
    next_touch_date: nextTouchDate,
    program_attendance: updatedAttendance
  };
  persistAccountField(accountId, 'engagement.last_touch_date', today);
  persistAccountField(accountId, 'engagement.next_touch_date', nextTouchDate);
  persistAccountField(accountId, 'engagement.program_attendance', updatedAttendance);
  appendChangeLog(
    accountId,
    'Engagement',
    `Program attendance logged for ${program.title}.`
  );
  addEngagementLogEntry({
    account_id: accountId,
    account_name: account.name,
    date: today,
    type: `program attendance (${program.type})`,
    notes_customer_safe: `Attendance logged for ${program.title}.`,
    notes_internal: `Program attendance incremented by ${normalizedAmount}.`
  });
  render();
};

const onAddRegistration = (programId, amount = 1) => {
  const workspaceProgram = findWorkspaceProgram(programId);
  if (workspaceProgram) {
    const normalizedAmount = Number(amount || 0);
    updateWorkspace((workspace) => {
      const program = findWorkspaceProgramIn(workspace, programId);
      if (!program) return;
      program.funnel = {
        ...(program.funnel || {}),
        invited: Math.max(0, Number(program.funnel?.invited || 0) + normalizedAmount),
        attended: Math.max(0, Number(program.funnel?.attended || 0)),
        completed: Math.max(0, Number(program.funnel?.completed || 0))
      };
    });
    notify('Registration updated.');
    return;
  }

  updateProgram(programId, (program) => ({
    ...program,
    registration_count: Math.max(0, Number(program.registration_count || 0) + Number(amount || 0))
  }));
  notify('Registration updated.');
};

const onCreateRequest = (request) => {
  state.data.requests = [request, ...state.data.requests];
  persistRequests(state.data.requests);
  appendChangeLog(
    request.account_id,
    'Risk',
    `New engagement request created for ${request.topic} with due date ${request.due_date}.`,
    request.created_on || toIsoDate(new Date())
  );
  render();
};

const onLogEngagement = (accountId, summary = 'Engagement touchpoint logged.') => {
  const account = getAccountById(accountId);
  if (!account) return;
  const today = toIsoDate(new Date());
  const cadence = String(account.engagement?.cadence || '').toLowerCase();
  const cadenceDays = cadence === 'weekly' ? 7 : cadence === 'biweekly' ? 14 : cadence === 'monthly' ? 30 : 14;
  const nextTouch = toIsoDate(new Date(Date.now() + cadenceDays * 24 * 60 * 60 * 1000));

  account.engagement = {
    ...account.engagement,
    last_touch_date: today,
    next_touch_date: nextTouch
  };
  persistAccountField(accountId, 'engagement.last_touch_date', today);
  persistAccountField(accountId, 'engagement.next_touch_date', nextTouch);
  appendChangeLog(accountId, 'Engagement', summary, today);
  addEngagementLogEntry({
    account_id: account.id,
    account_name: account.name,
    date: today,
    type: 'cadence call',
    notes_customer_safe: summary,
    notes_internal: `Auto next touch set to ${nextTouch}.`
  });
  render();
};

const createWorkspaceId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const withWorkspaceCustomer = (customerId, callback) => {
  updateWorkspace((workspace) => {
    const customer = (workspace.customers || []).find((item) => item.id === customerId);
    if (!customer) return;
    callback(workspace, customer);
  });
};

const onCreateCustomer = () => {
  updateWorkspace((workspace) => {
    const nextNumber = (workspace.customers || []).length + 1;
    const customerId = createWorkspaceId('cust');
    const customer = {
      id: customerId,
      name: `Customer ${nextNumber}`,
      tier: 'Standard',
      renewalDate: '',
      arrBand: '$50K-$100K',
      stage: 'Align',
      primaryUseCase: 'CI/CD',
      contacts: [],
      notes: '',
      tags: []
    };
    workspace.customers.push(customer);
    workspace.adoption[customerId] = workspace.adoption[customerId] || {
      devsecopsStages: {
        Plan: 'Not Started',
        Create: 'Not Started',
        Verify: 'Not Started',
        Package: 'Not Started',
        Secure: 'Not Started',
        Release: 'Not Started',
        Configure: 'Not Started',
        Monitor: 'Not Started'
      },
      useCases: {
        SCM: { percent: 0, evidence: 'Not started' },
        CICD: { percent: 0, evidence: 'Not started' },
        Security: { percent: 0, evidence: 'Not started' },
        Compliance: { percent: 0, evidence: 'Not started' },
        ReleaseAutomation: { percent: 0, evidence: 'Not started' },
        Observability: { percent: 0, evidence: 'Not started' }
      },
      timeToValue: []
    };
    workspace.successPlans[customerId] = workspace.successPlans[customerId] || { outcomes: [], milestones: [] };
    workspace.engagements[customerId] = workspace.engagements[customerId] || [];
    workspace.risk[customerId] = workspace.risk[customerId] || { signals: [], playbook: [], dismissals: [], overrideHealth: null };
    workspace.expansion[customerId] = workspace.expansion[customerId] || [];
    setSelectedCustomer(customerId);
    notify(`Created ${customer.name}.`);
    router.navigate('customer', { id: customerId });
  });
};

const onBulkAddCustomersToProgram = (customerIds, programId) => {
  updateWorkspace((workspace) => {
    const program = findWorkspaceProgramIn(workspace, programId);
    if (!program) return;
    const existing = new Set(program.cohortCustomerIds || []);
    (customerIds || []).forEach((customerId) => existing.add(customerId));
    program.cohortCustomerIds = [...existing];
    program.funnel = {
      ...(program.funnel || {}),
      invited: Math.max(Number(program.funnel?.invited || 0), existing.size * 2)
    };
    notify(`${customerIds.length} customer(s) added to ${program.name}.`);
  });
};

const onBulkLogWorkspaceEngagement = (customerIds = []) => {
  const date = new Date().toISOString();
  updateWorkspace((workspace) => {
    customerIds.forEach((customerId) => {
      if (!Array.isArray(workspace.engagements[customerId])) workspace.engagements[customerId] = [];
      workspace.engagements[customerId].unshift({
        id: createWorkspaceId('eng'),
        ts: date,
        type: '1:many',
        summary: 'Bulk engagement touchpoint logged from customer table.',
        tags: ['bulk', 'coverage'],
        nextSteps: ['Follow up with account-specific plan update'],
        owner: 'CSE'
      });
    });
    notify(`${customerIds.length} engagement touchpoint(s) logged.`);
  });
};

const onWorkspaceUpdateStageStatus = (customerId, stage, status) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.adoption[customerId].devsecopsStages[stage] = status;
  });
};

const onWorkspaceUpdateUseCasePercent = (customerId, useCase, percent) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.adoption[customerId].useCases[useCase] = {
      ...(workspace.adoption[customerId].useCases[useCase] || {}),
      percent: Math.max(0, Math.min(100, Number(percent || 0)))
    };
  });
};

const onWorkspaceUpdateUseCaseEvidence = (customerId, useCase, evidence) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.adoption[customerId].useCases[useCase] = {
      ...(workspace.adoption[customerId].useCases[useCase] || {}),
      evidence: evidence || 'Not started'
    };
  });
};

const onWorkspaceAddTimeToValue = (customerId, milestone) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.adoption[customerId].timeToValue.unshift(milestone);
    notify('Time-to-value milestone added.');
  });
};

const onWorkspaceAddOutcome = (customerId, outcome) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.successPlans[customerId].outcomes.push({
      id: createWorkspaceId('out'),
      ...outcome
    });
    notify('Success outcome added.');
  });
};

const onWorkspaceAddMilestone = (customerId, milestone) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.successPlans[customerId].milestones.push({
      id: createWorkspaceId('ms'),
      ...milestone
    });
    notify('Success milestone added.');
  });
};

const onWorkspaceAddEngagement = (customerId, payload) => {
  withWorkspaceCustomer(customerId, (workspace, customer) => {
    if (!Array.isArray(workspace.engagements[customerId])) workspace.engagements[customerId] = [];
    workspace.engagements[customerId].unshift({
      id: createWorkspaceId('eng'),
      ts: `${payload.date || toIsoDate(new Date())}T12:00:00.000Z`,
      type: payload.type || '1:1',
      summary: payload.summary || 'Engagement logged',
      tags: payload.tags || [],
      nextSteps: payload.nextSteps || [],
      owner: payload.owner || 'CSE'
    });
    addEngagementLogEntry({
      account_id: customerId,
      account_name: customer.name,
      date: payload.date || toIsoDate(new Date()),
      type: payload.type || '1:1',
      notes_customer_safe: payload.summary || 'Engagement logged',
      notes_internal: `Tags: ${(payload.tags || []).join(', ')}`
    });
    notify('Engagement entry logged.');
  });
};

const onWorkspaceQuickLogEngagement = (customerId) => {
  withWorkspaceCustomer(customerId, (workspace, customer) => {
    const today = toIsoDate(new Date());
    if (!Array.isArray(workspace.engagements[customerId])) workspace.engagements[customerId] = [];
    workspace.engagements[customerId].unshift({
      id: createWorkspaceId('eng'),
      ts: `${today}T12:00:00.000Z`,
      type: 'Async Review',
      summary: 'Quick log from Today command center to maintain engagement coverage.',
      tags: ['today-queue', 'coverage'],
      nextSteps: ['Confirm owner and due date for next best action'],
      owner: 'CSE'
    });
    addEngagementLogEntry({
      account_id: customerId,
      account_name: customer.name,
      date: today,
      type: 'Async Review',
      notes_customer_safe: 'Engagement logged from CSE command center.',
      notes_internal: 'Quick log for engagement recency and action follow-through.'
    });
    notify(`Engagement logged for ${customer.name}.`);
  });
};

const onWorkspaceSetRiskOverride = (customerId, value) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.risk[customerId] = workspace.risk[customerId] || { signals: [], playbook: [], dismissals: [], overrideHealth: null };
    workspace.risk[customerId].overrideHealth = value || null;
    notify('Risk health override updated.');
  });
};

const onWorkspaceAddRiskSignal = (customerId, payload) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.risk[customerId] = workspace.risk[customerId] || { signals: [], playbook: [], dismissals: [], overrideHealth: null };
    const signal = {
      code: payload.code,
      severity: payload.severity,
      detectedAt: new Date().toISOString(),
      detail: payload.detail,
      source: 'manual'
    };
    workspace.risk[customerId].signals = [...(workspace.risk[customerId].signals || []), signal];
    notify('Manual risk signal added.');
  });
};

const onWorkspaceDismissRiskSignal = (customerId, code, dismissedUntil) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    const risk = workspace.risk[customerId] || { signals: [], playbook: [], dismissals: [], overrideHealth: null };
    const dismissals = Array.isArray(risk.dismissals) ? risk.dismissals : [];
    const until = dismissedUntil || toIsoDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
    const next = [
      ...dismissals.filter((item) => item.code !== code),
      {
        code,
        dismissedUntil: `${String(until).slice(0, 10)}T23:59:59.000Z`,
        dismissedAt: new Date().toISOString()
      }
    ];
    workspace.risk[customerId] = {
      ...risk,
      dismissals: next
    };
    notify(`Dismissed ${code} until ${String(until).slice(0, 10)}.`);
  });
};

const onWorkspaceAddPlaybookAction = (customerId, payload) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.risk[customerId] = workspace.risk[customerId] || { signals: [], playbook: [], dismissals: [], overrideHealth: null };
    workspace.risk[customerId].playbook = [...(workspace.risk[customerId].playbook || []), payload];
    notify('Mitigation action added.');
  });
};

const onWorkspaceTogglePlaybookStatus = (customerId, index, complete) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.risk[customerId] = workspace.risk[customerId] || { signals: [], playbook: [], dismissals: [], overrideHealth: null };
    const list = workspace.risk[customerId].playbook || [];
    if (!list[index]) return;
    list[index].status = complete ? 'Complete' : 'Planned';
    workspace.risk[customerId].playbook = list;
  });
};

const onWorkspaceBulkApplyPlaybook = (customerIds, payload) => {
  const ids = Array.from(new Set((customerIds || []).filter(Boolean)));
  if (!ids.length) return;
  const runAt = new Date().toISOString();
  updateWorkspace((workspace) => {
    const customersById = new Map((workspace.customers || []).map((customer) => [customer.id, customer]));
    ids.forEach((customerId) => {
      if (!customersById.has(customerId)) return;
      workspace.risk[customerId] = workspace.risk[customerId] || { signals: [], playbook: [], dismissals: [], overrideHealth: null };
      workspace.risk[customerId].playbook = [
        ...(workspace.risk[customerId].playbook || []),
        {
          action: payload.action,
          owner: payload.owner || 'CSE',
          due: payload.due || toIsoDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
          status: payload.status || 'Planned'
        }
      ];
    });

    const run = {
      id: createWorkspaceId('riskrun'),
      at: runAt,
      templateId: String(payload.templateId || '').trim(),
      templateName: String(payload.templateName || payload.action || 'Custom mitigation').trim(),
      action: String(payload.action || '').trim(),
      owner: String(payload.owner || 'CSE').trim(),
      due: String(payload.due || toIsoDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))).slice(0, 10),
      customerIds: ids,
      customerNames: ids.map((id) => customersById.get(id)?.name).filter(Boolean),
      createdBy: state.persona === 'manager' ? 'CSE Manager' : 'CSE On-Demand'
    };

    workspace.operations = workspace.operations || {};
    const existingRuns = Array.isArray(workspace.operations.riskRuns) ? workspace.operations.riskRuns : [];
    workspace.operations.riskRuns = [run, ...existingRuns].slice(0, 150);
  });
  notify(`Applied mitigation action to ${ids.length} customers.`);
};

const onWorkspaceAddExpansion = (customerId, payload) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    const row = {
      id: createWorkspaceId('exp'),
      ...payload
    };
    workspace.expansion[customerId] = [...(workspace.expansion[customerId] || []), row];
    notify('Expansion opportunity added.');
  });
};

const onWorkspaceSetExpansionStatus = (customerId, opportunityId, status) => {
  withWorkspaceCustomer(customerId, (workspace) => {
    workspace.expansion[customerId] = (workspace.expansion[customerId] || []).map((item) =>
      item.id === opportunityId ? { ...item, status } : item
    );
  });
};

const onWorkspaceAddVoc = (payload) => {
  updateWorkspace((workspace) => {
    workspace.voc.unshift({
      id: createWorkspaceId('voc'),
      customerId: payload.customerId,
      area: payload.area,
      request: payload.request,
      impact: payload.impact,
      createdAt: new Date().toISOString(),
      status: payload.status || 'Captured'
    });
    notify('VOC entry captured.');
  });
};

const onWorkspaceAddCustomerToProgram = (programId, customerId) => {
  updateWorkspace((workspace) => {
    const program = findWorkspaceProgramIn(workspace, programId);
    if (!program) return;
    const cohort = new Set(program.cohortCustomerIds || []);
    cohort.add(customerId);
    program.cohortCustomerIds = [...cohort];
    notify('Customer added to program cohort.');
  });
};

const onWorkspaceUpdateProgramFunnel = (programId, funnel) => {
  updateWorkspace((workspace) => {
    const targetProgram = findWorkspaceProgramIn(workspace, programId);
    if (!targetProgram?.id) return;
    workspace.programs = (workspace.programs || []).map((program) =>
      program.id === targetProgram.id
        ? {
            ...program,
            funnel: {
              invited: Math.max(0, Number(funnel.invited || 0)),
              attended: Math.max(0, Number(funnel.attended || 0)),
              completed: Math.max(0, Number(funnel.completed || 0))
            }
          }
        : program
    );
    notify('Program funnel updated.');
  });
};

const onWorkspaceExportSelectedCustomers = (rows = []) => {
  const csv = toCsv(rows, Object.keys(rows[0] || {}).map((key) => ({ label: key, value: (row) => row[key] })));
  if (!csv.trim()) return;
  triggerDownload(`customers-selected-${toIsoDate(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
  notify('Selected customer CSV exported.');
};

const onExportWorkspace = () => {
  triggerDownload(
    `workspace-${toIsoDate(new Date())}.json`,
    JSON.stringify(currentWorkspace(), null, 2),
    'application/json;charset=utf-8'
  );
  notify('Workspace JSON exported.');
};

const onImportWorkspace = (payload) => {
  const candidate = payload?.workspace || payload;
  if (!candidate || typeof candidate !== 'object') {
    notify('Invalid workspace payload.');
    return;
  }
  setWorkspace(candidate);
  const first = currentWorkspace().customers?.[0]?.id || '';
  if (first) setSelectedCustomer(first);
  render();
  notify('Workspace imported.');
};

const onLoadSampleWorkspace = () => {
  if (!state.data?.sampleWorkspace) return;
  setWorkspace(state.data.sampleWorkspace);
  const first = currentWorkspace().customers?.[0]?.id || '';
  if (first) setSelectedCustomer(first);
  render();
  notify('Sample portfolio loaded.');
};

const onResetWorkspace = async () => {
  resetLocalState();
  await reloadData();
  notify('Local workspace reset.');
};

const onUpdateScoringWeights = (weights) => {
  updateWorkspace((workspace) => {
    workspace.settings = workspace.settings || {};
    const adoption = Math.max(0, Number(weights.adoption || 0));
    const engagement = Math.max(0, Number(weights.engagement || 0));
    const risk = Math.max(0, Number(weights.risk || 0));
    const total = adoption + engagement + risk;
    workspace.settings.scoringWeights = total
      ? {
          adoption: Math.round((adoption / total) * 100),
          engagement: Math.round((engagement / total) * 100),
          risk: Math.round((risk / total) * 100)
        }
      : { adoption: 45, engagement: 30, risk: 25 };
    notify('Scoring weights updated.');
  });
};

const onResetPtCalibration = () => {
  updateWorkspace((workspace) => {
    workspace.settings = workspace.settings || {};
    workspace.settings.ptCalibration = ensurePtCalibration(DEFAULT_PT_CALIBRATION);
    notify('PtE/PtC calibration profile reset to defaults.');
  });
};

const onAddRiskTemplate = (template) => {
  updateWorkspace((workspace) => {
    workspace.settings = workspace.settings || {};
    workspace.settings.riskPlaybookTemplates = workspace.settings.riskPlaybookTemplates || [];
    workspace.settings.riskPlaybookTemplates.push({
      id: createWorkspaceId('tpl'),
      ...template
    });
    notify('Risk template added.');
  });
};

const onAddProgramTemplate = (template) => {
  updateWorkspace((workspace) => {
    workspace.settings = workspace.settings || {};
    workspace.settings.programTemplates = workspace.settings.programTemplates || [];
    workspace.settings.programTemplates.push({
      id: createWorkspaceId('prog_tpl'),
      ...template
    });
    notify('Program template added.');
  });
};

const onCreateMonthlySnapshot = () => {
  updateWorkspace((workspace) => {
    workspace.snapshots = createMonthlySnapshot(workspace, new Date());
    notify('Monthly snapshot captured.');
  });
};

const onExportProgramFollowupList = (programId) => {
  const workspace = currentWorkspace();
  const program = findWorkspaceProgramIn(workspace, programId);
  if (!program) return;
  const customers = workspace.customers || [];
  const rows = (program.cohortCustomerIds || [])
    .map((customerId) => customers.find((customer) => customer.id === customerId))
    .filter(Boolean)
    .flatMap((customer) =>
      (customer.contacts || []).map((contact) => ({
        customerId: customer.id,
        customerName: customer.name,
        contactName: contact.name || '',
        role: contact.role || '',
        email: contact.email || '',
        program: program.name
      }))
    );
  const csv = toCsv(rows, [
    { label: 'customerId', value: (row) => row.customerId },
    { label: 'customerName', value: (row) => row.customerName },
    { label: 'contactName', value: (row) => row.contactName },
    { label: 'role', value: (row) => row.role },
    { label: 'email', value: (row) => row.email },
    { label: 'program', value: (row) => row.program }
  ]);
  triggerDownload(`program-followup-${programId}-${toIsoDate(new Date())}.csv`, csv, 'text/csv;charset=utf-8');
  notify('Program follow-up list exported.');
};

const onInviteAccountToProgram = async (programId, accountId) => {
  const match = findProgram(programId);
  const customer = workspaceCustomerById(accountId);
  const account = getAccountById(accountId);
  const program = match?.view;
  if (!program || (!customer && !account)) return;
  const participantName = customer?.name || account?.name || accountId;
  const invite = [
    `Hello ${participantName} team,`,
    ``,
    `You are invited to ${program.title || 'this program'}.`,
    `Date/Time: ${formatDateTime(program.date)}`,
    `Target use cases: ${(program.target_use_cases || []).join(', ') || 'Platform'}`,
    ``,
    `${program.invite_blurb || 'Please register and bring implementation questions.'}`
  ].join('\n');
  await copyText(invite);
  const nextTouchDate = toIsoDate(program.date || new Date());
  if (match?.source === 'workspace') {
    updateWorkspace((workspace) => {
      const target = findWorkspaceProgramIn(workspace, programId);
      if (!target) return;
      const cohort = new Set(target.cohortCustomerIds || []);
      cohort.add(accountId);
      target.cohortCustomerIds = [...cohort];
      if (!Array.isArray(workspace.engagements[accountId])) workspace.engagements[accountId] = [];
      workspace.engagements[accountId].unshift({
        id: createWorkspaceId('eng'),
        ts: `${toIsoDate(new Date())}T12:00:00.000Z`,
        type: 'Webinar',
        summary: `Invite sent for ${target.name}.`,
        tags: ['program', 'invitation'],
        nextSteps: ['Confirm registration and follow-up plan'],
        owner: 'CSE'
      });
    });
  } else if (account) {
    account.engagement = {
      ...account.engagement,
      next_touch_date: nextTouchDate
    };
    persistAccountField(accountId, 'engagement.next_touch_date', nextTouchDate);
    appendChangeLog(accountId, 'Engagement', `Invited to program ${program.title}.`, nextTouchDate);
  }
  addEngagementLogEntry({
    account_id: accountId,
    account_name: participantName,
    date: toIsoDate(new Date()),
    type: 'program invitation',
    notes_customer_safe: `Invite sent for ${program.title}.`,
    notes_internal: `Next touch moved to ${nextTouchDate}.`
  });
  notify(`Invite copied for ${participantName}.`);
  render();
};

const modal = createModal();
document.body.appendChild(modal.element);

const openMissingEditor = ({ accountId, path, label, type = 'text' }) => {
  const account = getAccountById(accountId);
  const currentValue = String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((cursor, key) => (cursor && typeof cursor === 'object' ? cursor[key] : undefined), account);

  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `
    <label class="form-span">
      ${label}
      <input name="value" type="${type}" required />
    </label>
    <div class="page-actions form-span">
      <button class="qa" type="submit">Save</button>
      <button class="ghost-btn" type="button" data-cancel>Cancel</button>
    </div>
  `;
  const input = form.elements.namedItem('value');
  if (input && currentValue !== null && currentValue !== undefined) {
    input.value = String(currentValue);
  }

  form.querySelector('[data-cancel]')?.addEventListener('click', () => modal.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = form.elements.namedItem('value').value;
    persistAccountField(accountId, path, value);
    const category = String(path || '').startsWith('health')
      ? 'Risk'
      : String(path || '').startsWith('engagement')
        ? 'Engagement'
        : String(path || '').startsWith('outcomes')
          ? 'Outcomes'
          : 'Usage';
    appendChangeLog(accountId, category, `${label} updated.`);
    state.data = await loadDashboardData();
    modal.close();
    render();
    notify(`${label} updated.`);
  });

  modal.open({ title: `Update ${label}`, content: form });
};

const renderShellContext = () => {
  const accounts = state.data?.accounts || [];
  const workspace = currentWorkspace();
  const customers = workspace.customers || [];
  const inCustomerModel = ['customers', 'customer', 'program', 'risks', 'expansion', 'voc', 'reports', 'propensity', 'settings'].includes(
    state.route.name
  );
  const activeAccountId = inCustomerModel
    ? state.selectedCustomerId || customers[0]?.id || ''
    : state.selectedAccountId || accounts[0]?.id || '';
  const activeAccount = inCustomerModel
    ? customers.find((customer) => customer.id === activeAccountId) || customers[0] || null
    : accounts.find((account) => account.id === activeAccountId) || accounts[0] || null;

  const safeToggle = appRoot.querySelector('[data-global-safe-toggle]');
  if (safeToggle) safeToggle.checked = state.customerSafe;
  const safeToggleLabel = appRoot.querySelector('[data-safe-toggle-label]');
  if (safeToggleLabel) safeToggleLabel.classList.toggle('active', state.customerSafe);

  const accountSelect = appRoot.querySelector('[data-global-account-select]');
  if (accountSelect) {
    const options = inCustomerModel ? customers : accounts;
    accountSelect.innerHTML = options.length
      ? options
          .map(
            (account) =>
              `<option value="${account.id}" ${account.id === activeAccountId ? 'selected' : ''}>${
                state.customerSafe ? maskField('accountName', account.name) || 'Your Organization' : account.name
              }</option>`
          )
          .join('')
      : '<option value="">No accounts loaded</option>';
    accountSelect.value = activeAccountId;
  }

  const personaSelect = appRoot.querySelector('[data-global-persona]');
  if (personaSelect) {
    personaSelect.value = state.route.name === 'manager' ? 'manager' : state.persona;
  }

  const jumpSelect = appRoot.querySelector('[data-global-jump]');
  if (jumpSelect) {
    const isAccountContext = state.route.name === 'account' || state.route.name === 'journey' || state.route.name === 'customer';
    const sectionLinks =
      state.route.name === 'customer'
        ? [
            { id: 'adoption', label: 'Adoption' },
            { id: 'success-plan', label: 'Success Plan' },
            { id: 'engagement', label: 'Engagement' },
            { id: 'risk', label: 'Risk' },
            { id: 'expansion', label: 'Expansion' },
            { id: 'voc', label: 'VOC' }
          ]
        : ACCOUNT_SECTION_LINKS;
    const options = [{ value: '', label: isAccountContext ? 'Jump to account section' : 'Open account workspace' }];
    if (activeAccount || state.data?.accounts?.length || customers.length) {
      const accountLabel = activeAccount
        ? state.customerSafe
          ? maskField('accountName', activeAccount.name) || 'Your Organization'
          : activeAccount.name
        : 'Account';
      options.push({
        value: activeAccount ? `account:${activeAccount.id}` : 'account',
        label: activeAccount ? `${inCustomerModel ? 'Customer' : 'Account'}: ${accountLabel}` : 'Account'
      });
    }
    if (isAccountContext) {
      options.push(
        ...sectionLinks.map((item) => ({
          value: `section:${item.id}`,
          label: item.label
        }))
      );
    }
    jumpSelect.innerHTML = options.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
    jumpSelect.value = '';
  }

  const safeLabel = appRoot.querySelector('[data-safe-label]');
  if (safeLabel) {
    const routeLabel = ROUTE_LABELS[state.route.name] || 'Today';
    safeLabel.textContent = `${routeLabel} • ${state.persona === 'manager' ? 'CSE Manager' : 'CSE On-Demand'}`;
  }

  const headerStatus = appRoot.querySelector('[data-header-status]');
  if (headerStatus) {
    headerStatus.classList.toggle('status-pill--internal', !state.customerSafe);
    headerStatus.classList.toggle('status-pill--safe', state.customerSafe);
    headerStatus.innerHTML = state.customerSafe
      ? '<span class="status-pill__dot" aria-hidden="true"></span>Customer-Safe'
      : '<span class="status-pill__dot" aria-hidden="true"></span>Internal View';
  }

  const themeToggleButton = appRoot.querySelector('[data-toggle-theme]');
  if (themeToggleButton) {
    const next = state.theme === 'dark' ? 'Light' : 'Dark';
    themeToggleButton.textContent = `Switch to ${next} mode`;
    themeToggleButton.setAttribute('aria-label', `Switch to ${next} mode`);
  }

  appRoot.querySelectorAll('[data-global-filter-engagement-type]').forEach((input) => {
    const value = String(input.getAttribute('data-global-filter-engagement-type') || '').toUpperCase();
    input.checked = Array.isArray(state.portfolioFilters.engagementTypes) && state.portfolioFilters.engagementTypes.includes(value);
  });

  appRoot.querySelectorAll('[data-global-filter-requested-by]').forEach((input) => {
    const value = String(input.getAttribute('data-global-filter-requested-by') || '').toUpperCase();
    input.checked = Array.isArray(state.portfolioFilters.requestedBy) && state.portfolioFilters.requestedBy.includes(value);
  });

  appRoot.querySelectorAll('[data-global-filter-engagement-status]').forEach((input) => {
    const value = String(input.getAttribute('data-global-filter-engagement-status') || '').toUpperCase();
    input.checked = Array.isArray(state.portfolioFilters.engagementStatus) && state.portfolioFilters.engagementStatus.includes(value);
  });

};

const copyShareSnapshot = async () => {
  const route = routePath(state.route.name, state.route.params);
  const url = buildShareSnapshotUrl({
    basePath: state.basePath,
    route,
    customerSafe: state.customerSafe,
    workspace: currentWorkspace()
  });
  await copyText(url);
  notify('Share snapshot URL copied.');
};

let palette = null;
const openToolkitTool = (toolId) => {
  storage.set(STORAGE_KEYS.toolkitLaunch, toolId);
  router.navigate('toolkit');
};

const commandEntries = (workspace) => {
  const workspaceRows = buildWorkspacePortfolio(currentWorkspace()).rows || [];
  const workspaceCustomerCommands = workspaceRows.map((row) => {
    const typeKey = normalizeEngagementType(row.engagementType);
    const typeMeta = ENGAGEMENT_TYPES[typeKey] || ENGAGEMENT_TYPES.ON_DEMAND;
    const label = state.customerSafe ? maskField('accountName', row.customer.name) || 'Your Organization' : row.customer.name;
    return {
      id: `workspace-customer-${row.customer.id}`,
      label: `Open customer: ${label}`,
      meta: `${typeMeta.label} • ${row.customer.tier || 'Standard'} • ${row.health}`,
      engagementType: typeKey,
      engagementIcon: typeMeta.icon,
      engagementColor: typeMeta.color,
      action: { route: 'customer', params: { id: row.customer.id } }
    };
  });

  const accountSectionCommands = workspace?.account
    ? ACCOUNT_SECTION_LINKS.map((item) => ({
        id: `account-section-${item.id}`,
        label: `Jump section: ${item.label}`,
        meta: `Account: ${workspace.account.name}`,
        action: {
          custom: () => {
            const accountId = workspace.account.id;
            setSelectedAccount(accountId);
            router.navigate('account', { id: accountId });
            window.setTimeout(() => {
              const tabButton = routeRoot.querySelector(`[data-tab-target="${item.id}"]`);
              tabButton?.click();
              const panel = routeRoot.querySelector(`[data-tab-panel="${item.id}"]`);
              panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
          }
        }
      }))
    : [];

  return [
    { id: 'cmd-home', label: 'Open Today Console', meta: 'Today', action: { route: 'home' } },
    { id: 'cmd-portfolio', label: 'Open Portfolio Table', meta: 'Portfolio', action: { route: 'portfolio' } },
    { id: 'cmd-customers', label: 'Open Customer Directory', meta: 'Customers', action: { route: 'customers' } },
    { id: 'cmd-risks', label: 'Open Risk Signals', meta: 'Risks', action: { route: 'risks' } },
    { id: 'cmd-expansion', label: 'Open Expansion Board', meta: 'Expansion', action: { route: 'expansion' } },
    { id: 'cmd-voc', label: 'Open VOC Registry', meta: 'VOC', action: { route: 'voc' } },
    { id: 'cmd-manager', label: 'Open Manager Dashboard', meta: 'Manager', action: { route: 'manager' } },
    { id: 'cmd-reports', label: 'Open Reports Center', meta: 'Reports', action: { route: 'reports' } },
    { id: 'cmd-settings', label: 'Open Settings', meta: 'Settings', action: { route: 'settings' } },
    { id: 'cmd-simulator', label: 'Open Adoption Simulator', meta: 'Simulator', action: { route: 'simulator' } },
    { id: 'cmd-account', label: 'Open Accounts Workspace', meta: 'Accounts', action: { route: 'account' } },
    { id: 'cmd-toolkit', label: 'Open Success Plans', meta: 'Success Plans', action: { route: 'toolkit' } },
    { id: 'cmd-journey', label: 'Open Journey Workspace', meta: 'Journey', action: { route: 'journey' } },
    { id: 'cmd-programs', label: 'Open Programs', meta: 'Programs', action: { route: 'programs' } },
    { id: 'cmd-playbooks', label: 'Open Playbooks', meta: 'Playbooks', action: { route: 'playbooks' } },
    { id: 'cmd-resources', label: 'Open Resources', meta: 'Resources', action: { route: 'resources' } },
    { id: 'cmd-cheatsheet', label: 'Open Cheatsheet', meta: 'Cheatsheet', action: { route: 'cheatsheet' } },
    { id: 'cmd-exports', label: 'Open Exports', meta: 'Exports', action: { route: 'exports' } },
    { id: 'cmd-intake', label: 'Create Intake Request', meta: 'Tools', action: { route: 'intake' } },
    { id: 'cmd-tool-success-plan', label: 'Success Plan Generator', meta: 'Success Plans', action: { custom: () => openToolkitTool('success-plan') } },
    { id: 'cmd-tool-ebr', label: 'Executive Business Review Generator', meta: 'Success Plans', action: { custom: () => openToolkitTool('ebr-generator') } },
    { id: 'cmd-tool-adoption-plan', label: 'Adoption Expansion Planner', meta: 'Success Plans', action: { custom: () => openToolkitTool('adoption-expansion') } },
    { id: 'cmd-tool-workshop', label: 'Workshop Planning Toolkit', meta: 'Success Plans', action: { custom: () => openToolkitTool('workshop-plan') } },
    { id: 'cmd-tool-renewal', label: 'Renewal Readiness Checklist', meta: 'Success Plans', action: { custom: () => openToolkitTool('renewal-checklist') } },
    { id: 'cmd-tool-issue', label: 'Collaboration Issue Generator', meta: 'Success Plans', action: { custom: () => openToolkitTool('issue-generator') } },
    { id: 'cmd-tool-log', label: 'Engagement Logger', meta: 'Success Plans', action: { custom: () => openToolkitTool('engagement-logger') } },
    { id: 'cmd-share', label: 'Copy Share Snapshot', meta: 'Exports', action: { custom: copyShareSnapshot } },
    ...workspaceCustomerCommands,
    ...portfolioCommandEntries(state.data),
    ...managerCommandEntries(),
    ...simulatorCommandEntries(),
    ...programsCommandEntries(workspaceProgramsForProgramsPage()),
    ...playbooksCommandEntries(state.data.playbooks),
    ...resourcesCommandEntries(),
    ...propensityCommandEntries(),
    ...cheatsheetCommandEntries(),
    ...toolkitCommandEntries(),
    ...exportsCommandEntries(),
    ...intakeCommandEntries(state.data.accounts),
    ...accountSectionCommands,
    ...accountCommandEntries(workspace),
    ...customersCommandEntries(state.data.workspace),
    ...customerDetailCommandEntries(state.data.workspace)
  ];
};

const reloadData = async () => {
  state.data = await loadDashboardData();
  state.data.workspace = ensureWorkspaceDerived(currentWorkspace());
  persistWorkspace(state.data.workspace);
  state.actionCardCompletion = storage.get(STORAGE_KEYS.actionCards, {});
  if (!state.selectedAccountId && state.data.accounts?.length) {
    setSelectedAccount(state.data.accounts[0].id);
  }
  if (!state.selectedCustomerId && state.data.workspace?.customers?.length) {
    setSelectedCustomer(state.data.workspace.customers[0].id);
  }
  render();
};

const normalizeRouteLayout = (view) => {
  if (!(view instanceof HTMLElement)) return;
  view.classList.add('page');
  if (!view.classList.contains('section-stack')) {
    view.classList.add('section-stack');
  }

  [...view.children].forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (child.tagName === 'SECTION' || child.tagName === 'HEADER') {
      child.classList.add('section');
    }
  });

  view.querySelectorAll('.metric-head').forEach((header) => header.classList.add('section__header'));

  view.querySelectorAll('details').forEach((details) => {
    details.classList.add('accordion__item');
    const summary = details.querySelector(':scope > summary');
    if (summary) {
      summary.classList.add('accordion__header');
    }
    let body = details.querySelector(':scope > .accordion__body');
    if (!body) {
      const bodyNodes = [...details.childNodes].filter((node) => node !== summary);
      body = document.createElement('div');
      body.className = 'accordion__body';
      bodyNodes.forEach((node) => body.appendChild(node));
      details.appendChild(body);
    }
  });
};

const renderCurrentRoute = () => {
  const route = state.route;
  if (route.name === 'manager') state.persona = 'manager';
  const portfolio = buildPortfolioView(state.data);
  const workspaceModel = currentWorkspace();
  const workspacePortfolio = buildWorkspacePortfolio(workspaceModel);
  const manager = buildManagerDashboard(workspaceModel);
  const loadErrors = Array.isArray(state.data?.loadErrors) ? state.data.loadErrors : [];
  const accountLoadError = loadErrors.some((item) => item.file === 'accounts.json');

  if (route.name === 'account') {
    if (route.params.id) setSelectedAccount(route.params.id);
    if (!route.params.id && currentAccount()) {
      router.navigate('account', { id: currentAccount().id }, { replace: true });
      return;
    }
  }
  if (route.name === 'journey') {
    const journeyId = route.params.id || state.selectedAccountId || state.data.accounts?.[0]?.id || '';
    if (journeyId && journeyId !== state.selectedAccountId) setSelectedAccount(journeyId);
    if (!route.params.id && journeyId) {
      router.navigate('journey', { id: journeyId }, { replace: true });
      return;
    }
  }
  if (route.name === 'customer') {
    if (route.params.id) setSelectedCustomer(route.params.id);
    const selectedId = route.params.id || state.selectedCustomerId || workspaceModel.customers?.[0]?.id || '';
    if (!route.params.id && selectedId) {
      router.navigate('customer', { id: selectedId }, { replace: true });
      return;
    }
  }
  if (route.name === 'program') {
    const fallbackProgramId = workspaceModel.programs?.[0]?.id || state.data.programs?.[0]?.program_id || '';
    const requestedProgramId = String(route.params.id || '').trim();
    if (!requestedProgramId && fallbackProgramId) {
      router.navigate('program', { id: fallbackProgramId }, { replace: true });
      return;
    }
    if (requestedProgramId) {
      const match = findProgram(requestedProgramId);
      if (!match && fallbackProgramId) {
        router.navigate('program', { id: fallbackProgramId }, { replace: true });
        return;
      }
      const canonicalWorkspaceId = match?.workspaceProgram?.id || '';
      if (canonicalWorkspaceId && requestedProgramId !== canonicalWorkspaceId) {
        router.navigate('program', { id: canonicalWorkspaceId }, { replace: true });
        return;
      }
    }
  }

  let view = null;
  const workspace = buildAccountWorkspace(state.data, state.selectedAccountId || route.params.id);
  const selectedCustomerId = route.params.id || state.selectedCustomerId || workspaceModel.customers?.[0]?.id || '';
  const selectedCustomer = workspaceCustomerById(selectedCustomerId);
  const customerMetrics = selectedCustomer ? scoreBreakdown(workspaceModel, selectedCustomer.id, new Date()) : null;
  const programMatch =
    route.name === 'program'
      ? findProgram(route.params.id || workspaceModel.programs?.[0]?.id || state.data.programs?.[0]?.program_id || '')
      : null;
  const programDetail =
    route.name === 'program'
      ? programMatch?.source === 'workspace'
        ? programMatch.workspaceProgram
        : legacyProgramToWorkspaceDetail(programMatch?.view)
      : null;

  const common = {
    customerSafe: state.customerSafe,
    maskField,
    persona: state.persona,
    setMode: (mode) => setViewMode(mode),
    navigate: (name, params) => {
      if (name === 'account' && params?.id) setSelectedAccount(params.id);
      if (name === 'account' && !params?.id) params = { id: currentAccount()?.id || state.data.accounts?.[0]?.id || '' };
      if (name === 'customer' && params?.id) setSelectedCustomer(params.id);
      if (name === 'customer' && !params?.id) params = { id: currentCustomer()?.id || workspaceModel.customers?.[0]?.id || '' };
      router.navigate(name, params);
    }
  };

  if (route.name === 'home') {
    view = renderPortfolioHomePage({
      portfolio,
      workspace: workspaceModel,
      workspacePortfolio,
      filters: state.portfolioFilters,
      filterCount: countActivePortfolioFilters(state.portfolioFilters),
      onSetFilters: setPortfolioFilters,
      updatedOn: state.data.updated_on,
      mode: state.viewMode,
      accountLoadError,
      onRetryData: reloadData,
      onQuickLogEngagement: onWorkspaceQuickLogEngagement,
      onCopyInvite,
      onLogAttendance,
      onExportPortfolio: () => exportPortfolioCsv(workspaceModel),
      onCopyShare: copyShareSnapshot,
      requests: state.data.requests || [],
      programs: workspaceModel.programs || [],
      accounts: workspaceModel.customers || [],
      ...common
    });
  }

  if (route.name === 'portfolio') {
    view = renderPortfolioPage({
      portfolio,
      workspace: workspaceModel,
      workspacePortfolio,
      manager,
      filters: state.portfolioFilters,
      filterCount: countActivePortfolioFilters(state.portfolioFilters),
      onSetFilters: setPortfolioFilters,
      updatedOn: state.data.updated_on,
      mode: state.viewMode,
      accountLoadError,
      onRetryData: reloadData,
      onCopyInvite,
      onLogAttendance,
      onOpenMissingEditor: openMissingEditor,
      onQuickLogEngagement: onWorkspaceQuickLogEngagement,
      onCreateRequest,
      requests: state.data.requests || [],
      notify,
      copyText,
      ...common
    });
  }

  if (route.name === 'manager') {
    view = renderManagerPage({
      portfolio,
      manager,
      ...common
    });
  }

  if (route.name === 'customers') {
    view = renderCustomersPage({
      workspace: workspaceModel,
      portfolioRows: workspacePortfolio.rows,
      onCreateCustomer,
      onBulkAddToProgram: onBulkAddCustomersToProgram,
      onBulkExport: onWorkspaceExportSelectedCustomers,
      onBulkLogEngagement: onBulkLogWorkspaceEngagement,
      notify,
      ...common
    });
  }

  if (route.name === 'customer' && selectedCustomer) {
    view = renderCustomerDetailPage({
      customer: selectedCustomer,
      metrics: customerMetrics,
      adoption: workspaceModel.adoption?.[selectedCustomer.id],
      successPlan: workspaceModel.successPlans?.[selectedCustomer.id],
      engagements: workspaceModel.engagements?.[selectedCustomer.id],
      risk: workspaceModel.risk?.[selectedCustomer.id],
      expansion: workspaceModel.expansion?.[selectedCustomer.id],
      voc: (workspaceModel.voc || []).filter((item) => item.customerId === selectedCustomer.id),
      customerSafe: state.customerSafe,
      onUpdateStageStatus: onWorkspaceUpdateStageStatus,
      onUpdateUseCasePercent: onWorkspaceUpdateUseCasePercent,
      onUpdateUseCaseEvidence: onWorkspaceUpdateUseCaseEvidence,
      onAddTimeToValueMilestone: onWorkspaceAddTimeToValue,
      onAddOutcome: onWorkspaceAddOutcome,
      onAddMilestone: onWorkspaceAddMilestone,
      onAddEngagement: onWorkspaceAddEngagement,
      onSetRiskOverride: onWorkspaceUpdateRiskOverride,
      onAddRiskSignal: onWorkspaceAddManualRiskSignal,
      onDismissRiskSignal: onWorkspaceDismissRiskSignal,
      onAddPlaybookAction: onWorkspaceAddPlaybookAction,
      onTogglePlaybookStatus: onWorkspaceTogglePlaybookAction,
      onAddExpansion: onWorkspaceAddExpansion,
      onSetExpansionStatus: onWorkspaceSetExpansionStatus,
      onAddVoc: onWorkspaceAddVoc,
      onExportCustomerPdf: (customerId) =>
        exportAccountSummaryPdf(workspaceModel, {
          customerId,
          customerSafe: state.customerSafe
        }),
      onExportCustomerCsv: (customerId) =>
        exportAccountCsv(workspaceModel, {
          customerId,
          customerSafe: state.customerSafe
        }),
      ...common
    });
  }

  if (route.name === 'toolkit') {
    view = renderToolkitPage({
      accounts: state.data.accounts,
      templates: state.data.templates || {},
      customerSafe: state.customerSafe,
      onToggleSafe: setSafeMode,
      selectedAccountId: state.selectedAccountId,
      notify,
      copyText,
      ...common
    });
  }

  if (route.name === 'simulator') {
    view = renderSimulatorPage({
      capabilities: state.data.simulatorCapabilities || [],
      rules: state.data.simulatorRules || [],
      customerSafe: state.customerSafe,
      onToggleSafe: setSafeMode,
      notify,
      copyText,
      ...common
    });
  }

  if (route.name === 'account') {
    view = renderAccountPage({
      workspace,
      resources: state.data.resources,
      customerSafe: state.customerSafe,
      mode: state.viewMode,
      actionCompletion: state.actionCardCompletion[workspace?.account?.id || ''] || {},
      onToggleActionCompletion: setActionCardCompletion,
      onToggleSafe: setSafeMode,
      onCopyInvite,
      onExportAccountCsv: (account, options) => exportAccountCsv(account, options),
      onExportAccountPdf: (account, options) => exportAccountSummaryPdf(account, options),
      onOpenMissingEditor: openMissingEditor,
      onLogEngagement,
      copyText,
      notify,
      journeyMode: true,
      ...common
    });
  }

  if (route.name === 'journey') {
    view = renderAccountPage({
      workspace,
      resources: state.data.resources,
      customerSafe: state.customerSafe,
      mode: state.viewMode,
      actionCompletion: state.actionCardCompletion[workspace?.account?.id || ''] || {},
      onToggleActionCompletion: setActionCardCompletion,
      onToggleSafe: setSafeMode,
      onCopyInvite,
      onExportAccountCsv: (account, options) => exportAccountCsv(account, options),
      onExportAccountPdf: (account, options) => exportAccountSummaryPdf(account, options),
      onOpenMissingEditor: openMissingEditor,
      onLogEngagement,
      copyText,
      notify,
      journeyMode: true,
      ...common
    });
  }

  if (route.name === 'programs') {
    view = renderProgramsPage({
      programs: workspaceProgramsForProgramsPage(workspaceModel),
      accounts: workspaceModel.customers || [],
      mode: state.viewMode,
      onCopyInvite,
      onLogAttendance,
      onAddRegistration,
      onInviteAccount: onInviteAccountToProgram,
      onOpenProgram: (programId) => router.navigate('program', { id: programId }),
      notify,
      ...common
    });
  }

  if (route.name === 'program' && programDetail) {
    view = renderProgramDetailPage({
      workspace: workspaceModel,
      program: programDetail,
      onAddCustomerToProgram: onWorkspaceAddCustomerToProgram,
      onUpdateProgramFunnel: onWorkspaceUpdateProgramFunnel,
      onExportFollowUpList: onExportProgramFollowupList,
      notify,
      ...common
    });
  }

  if (route.name === 'playbooks') {
    view = renderPlaybooksPage({
      playbooks: state.data.playbooks,
      resources: state.data.resources,
      customerSafe: state.customerSafe,
      checklistState: state.checklistState,
      mode: state.viewMode,
      onChecklistChange: (playbookId, checkKey, value) => {
        if (!state.checklistState[playbookId]) state.checklistState[playbookId] = {};
        state.checklistState[playbookId][checkKey] = value;
        persistPlaybookChecklist(state.checklistState);
      },
      copyText,
      notify,
      ...common
    });
  }

  if (route.name === 'resources') {
    view = renderResourcesPage({
      resources: state.data.resources,
      categories: state.data.categories,
      customerSafe: state.customerSafe,
      mode: state.viewMode,
      copyText,
      notify,
      ...common
    });
  }

  if (route.name === 'cheatsheet') {
    view = renderCheatsheetPage({
      cheatsheet: state.data.cheatsheet || {},
      ...common
    });
  }

  if (route.name === 'exports') {
    view = renderExportsPage({
      workspace: workspaceModel,
      account: currentAccount(),
      selectedCustomerId: state.selectedCustomerId,
      customerSafe: state.customerSafe,
      mode: state.viewMode,
      onSelectCustomer: (customerId) => {
        setSelectedCustomer(customerId);
        render();
      },
      onExportPortfolio: () => exportPortfolioCsv(workspaceModel),
      onExportProgramsCsv: () => exportProgramsCsv(workspaceModel),
      onExportVocCsv: () => exportVocCsv(workspaceModel),
      onExportManagerSummary: () => exportManagerSummaryPdf(workspaceModel),
      onExportAccountCsv: (target, options = {}) => {
        if (typeof target === 'string') {
          return exportAccountCsv(workspaceModel, { ...options, customerId: target });
        }
        return exportAccountCsv(target, options);
      },
      onExportAccountPdf: (target, options = {}) => {
        if (typeof target === 'string') {
          return exportAccountSummaryPdf(workspaceModel, { ...options, customerId: target });
        }
        return exportAccountSummaryPdf(target, options);
      },
      onCopyShare: copyShareSnapshot,
      ...common
    });
  }

  if (route.name === 'risks') {
    view = renderRisksPage({
      workspace: workspaceModel,
      portfolioRows: workspacePortfolio.rows,
      onBulkApplyPlaybook: onWorkspaceBulkApplyPlaybook,
      notify,
      ...common
    });
  }

  if (route.name === 'expansion') {
    view = renderExpansionPage({
      workspace: workspaceModel,
      onAddExpansion: onWorkspaceAddExpansion,
      onSetExpansionStatus: onWorkspaceSetExpansionStatus,
      notify,
      ...common
    });
  }

  if (route.name === 'voc') {
    view = renderVocPage({
      workspace: workspaceModel,
      onAddVoc: onWorkspaceAddVoc,
      onExportVocCsv: () => exportVocCsv(workspaceModel),
      notify,
      ...common
    });
  }

  if (route.name === 'reports') {
    view = renderReportsPage({
      manager,
      onExportManagerSummary: () => exportManagerSummaryPdf(workspaceModel),
      onExportPortfolioCsv: () => exportPortfolioCsv(workspaceModel),
      onExportProgramsCsv: () => exportProgramsCsv(workspaceModel),
      ...common
    });
  }

  if (route.name === 'propensity') {
    view = renderPropensityPage({
      workspace: workspaceModel,
      workspacePortfolio,
      manager,
      notify,
      ...common
    });
  }

  if (route.name === 'settings') {
    view = renderSettingsPage({
      workspace: workspaceModel,
      onLoadSamplePortfolio: onLoadSampleWorkspace,
      onImportWorkspace,
      onExportWorkspace,
      onResetWorkspace,
      onUpdateScoringWeights,
      onResetPtCalibration,
      onAddRiskTemplate,
      onAddProgramTemplate,
      onCreateSnapshot: onCreateMonthlySnapshot,
      theme: state.theme,
      onSetTheme: setTheme,
      density: state.density,
      onSetDensity: setDensity,
      defaultMode: storage.get(STORAGE_KEYS.defaultMode, state.viewMode) || 'today',
      defaultPersona: storage.get(STORAGE_KEYS.defaultPersona, state.persona) || 'cse',
      onSetDefaultMode: setDefaultMode,
      onSetDefaultPersona: setDefaultPersona,
      notify,
      ...common
    });
  }

  if (route.name === 'intake') {
    view = renderIntakePage({
      data: state.data,
      requests: state.data.requests,
      onCreateRequest,
      copyText,
      notify,
      ...common
    });
  }

  if (!view) {
    view = document.createElement('section');
    view.className = 'route-page';
    view.innerHTML = `
      <div class="card empty-state">
        <h2>Page not available</h2>
        <p class="muted">The requested route is not configured yet.</p>
        <button class="ghost-btn" type="button" data-go-home>Back to Today</button>
      </div>
    `;
    view.querySelector('[data-go-home]')?.addEventListener('click', () => router.navigate('home'));
  }

  routeRoot.innerHTML = '';
  const modeTabs = createModeTabs({
    currentMode: state.viewMode,
    counts:
      state.route.name === 'home'
        ? {
            today: (workspacePortfolio.rows || []).length,
            review: (workspacePortfolio.atRisk || []).length,
            deep: (workspacePortfolio.expansionCandidates || []).length
          }
        : {},
    onSelect: (mode) => setViewMode(mode)
  });
  routeRoot.appendChild(modeTabs);

  const chips = createActiveFilterChips({
    filters: (() => {
      const filters = [];
      const queueTab = state.activeQueueTab;
      if (queueTab && queueTab !== 'all') {
        filters.push({ id: `queue-${queueTab}`, label: `Queue: ${ENGAGEMENT_TYPES[queueTab]?.label || queueTab}` });
      }
      const typeFilters = state.filters?.engagementTypes || [];
      typeFilters.forEach((type) => filters.push({ id: `type-${type}`, label: `Type: ${ENGAGEMENT_TYPES[type]?.label || type}` }));
      const requestedByFilters = state.filters?.requestedBy || [];
      requestedByFilters.forEach((requestedBy) => filters.push({ id: `requested-${requestedBy}`, label: `Requested by: ${requestedBy}` }));
      const statusFilters = state.filters?.engagementStatus || [];
      statusFilters.forEach((status) => filters.push({ id: `status-${status}`, label: `Status: ${status}` }));
      const useCaseFilters = state.filters?.useCaseMaturity || [];
      useCaseFilters.forEach((entry, index) =>
        filters.push({
          id: `usecase-${entry.useCase}-${index}`,
          label: `${entry.useCase}: ${(entry.levels || []).join(', ')}`
        })
      );
      return filters;
    })(),
    onRemove: (id) => {
      if (id.startsWith('queue-')) {
        state.activeQueueTab = 'all';
      } else if (id.startsWith('type-')) {
        const target = id.replace('type-', '');
        state.filters.engagementTypes = (state.filters.engagementTypes || []).filter((value) => value !== target);
      } else if (id.startsWith('requested-')) {
        const target = id.replace('requested-', '');
        state.filters.requestedBy = (state.filters.requestedBy || []).filter((value) => value !== target);
      } else if (id.startsWith('status-')) {
        const target = id.replace('status-', '');
        state.filters.engagementStatus = (state.filters.engagementStatus || []).filter((value) => value !== target);
      } else if (id.startsWith('usecase-')) {
        const [, useCase, idxRaw] = id.split('-');
        const index = Number(idxRaw);
        state.filters.useCaseMaturity = (state.filters.useCaseMaturity || []).filter((entry, entryIndex) => {
          if (Number.isFinite(index)) return entryIndex !== index;
          return entry.useCase !== useCase;
        });
      }
      render();
    },
    onClear: () => {
      state.activeQueueTab = 'all';
      state.filters.engagementTypes = [];
      state.filters.requestedBy = [];
      state.filters.engagementStatus = [];
      state.filters.useCaseMaturity = [];
      render();
    }
  });
  if (chips) routeRoot.appendChild(chips);

  routeRoot.appendChild(view);

  normalizeTables(routeRoot);
  normalizeAccordions(routeRoot);

  bindRouteEvents();
  renderShellContext();
  renderLeftRail();
  setActiveNav();
  syncHeaderOffset();
};

const render = () => {
  renderLeftRail();
  renderShellContext();
  renderCurrentRoute();
  setActiveNav();
  syncModeHash();
  syncSidebarState();
  syncHeaderOffset();
};

state.basePath = detectBasePath(window.location.pathname);
applyQueryOverrides();
const router = createRouter(state.basePath);

const bindGlobalEvents = () => {
  const syncGlobalMultiFilters = () => {
    const engagementTypes = [...appRoot.querySelectorAll('[data-global-filter-engagement-type]:checked')].map((input) =>
      String(input.getAttribute('data-global-filter-engagement-type') || '').toUpperCase()
    );
    const requestedBy = [...appRoot.querySelectorAll('[data-global-filter-requested-by]:checked')].map((input) =>
      String(input.getAttribute('data-global-filter-requested-by') || '').toUpperCase()
    );
    const engagementStatus = [...appRoot.querySelectorAll('[data-global-filter-engagement-status]:checked')].map((input) =>
      String(input.getAttribute('data-global-filter-engagement-status') || '').toUpperCase()
    );
    setPortfolioFilters({
      engagementTypes,
      requestedBy,
      engagementStatus
    });
  };

  const handleJumpSelection = (rawValue, select) => {
    const value = String(rawValue || '').trim();
    if (!value) return;
    const customerRouteContext = ['customer', 'customers', 'program', 'risks', 'expansion', 'voc', 'reports', 'propensity', 'settings'].includes(
      state.route.name
    );
    if (value.startsWith('section:')) {
      const sectionId = value.split(':')[1] || '';
      const accountId = customerRouteContext
        ? state.selectedCustomerId || state.data.workspace?.customers?.[0]?.id || ''
        : state.selectedAccountId || state.data.accounts?.[0]?.id || '';
      if (!accountId || !sectionId) return;
      const applyFocus = () => focusAccountSection(sectionId);
      if (state.route.name === 'account' || state.route.name === 'journey' || state.route.name === 'customer') {
        applyFocus();
      } else {
        if (customerRouteContext) {
          setSelectedCustomer(accountId);
          router.navigate('customer', { id: accountId });
        } else {
          setSelectedAccount(accountId);
          router.navigate('account', { id: accountId });
        }
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => applyFocus());
        });
      }
      if (select) select.value = '';
      return;
    }
    if (value.startsWith('account:')) {
      const accountId = value.split(':')[1] || state.selectedCustomerId || state.selectedAccountId || state.data.accounts?.[0]?.id || '';
      if (!accountId) return;
      if (workspaceCustomerById(accountId)) {
        setSelectedCustomer(accountId);
        router.navigate('customer', { id: accountId });
      } else {
        setSelectedAccount(accountId);
        router.navigate('account', { id: accountId });
      }
      if (select) select.value = '';
      return;
    }
    if (value === 'account') {
      const accountId = customerRouteContext
        ? state.selectedCustomerId || state.data.workspace?.customers?.[0]?.id || ''
        : state.selectedAccountId || state.data.accounts?.[0]?.id || '';
      if (!accountId) return;
      if (customerRouteContext) {
        setSelectedCustomer(accountId);
        router.navigate('customer', { id: accountId });
      } else {
        setSelectedAccount(accountId);
        router.navigate('account', { id: accountId });
      }
      if (select) select.value = '';
      return;
    }
    if (select) select.value = '';
  };

  const moreButton = appRoot.querySelector('[data-open-more]');
  const moreMenu = appRoot.querySelector('[data-more-menu]');
  const filtersPanel = appRoot.querySelector('[data-filters-panel]');
  const getFiltersButtons = () => [...appRoot.querySelectorAll('[data-open-filters]')];

  moreButton?.setAttribute('aria-expanded', 'false');

  appRoot.addEventListener('click', (event) => {
    const sidebarToggle = event.target.closest('[data-sidebar-toggle]');
    if (sidebarToggle) {
      event.preventDefault();
      toggleSidebar();
      return;
    }

    const exportButton = event.target.closest('[data-global-export]');
    if (exportButton) {
      const modal = createEngagementExportModal({
        workspace: currentWorkspace(),
        customerSafe: state.customerSafe,
        maskField,
        notify,
        onClose: () => {}
      });
      document.body.appendChild(modal);
      closeSidebar();
      return;
    }

    const openSettings = event.target.closest('[data-open-settings]');
    if (openSettings) {
      router.navigate('settings');
      closeSidebar();
      if (moreMenu) moreMenu.hidden = true;
      moreButton?.setAttribute('aria-expanded', 'false');
      return;
    }

    const toggleTheme = event.target.closest('[data-toggle-theme]');
    if (toggleTheme) {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
      notify(`Theme switched to ${nextTheme}.`);
      if (moreMenu) moreMenu.hidden = true;
      moreButton?.setAttribute('aria-expanded', 'false');
      return;
    }

    const copySnapshot = event.target.closest('[data-copy-snapshot]');
    if (copySnapshot) {
      copyShareSnapshot();
      closeSidebar();
      if (moreMenu) moreMenu.hidden = true;
      moreButton?.setAttribute('aria-expanded', 'false');
      return;
    }

    const openResources = event.target.closest('[data-go-resources]');
    if (openResources) {
      router.navigate('resources');
      closeSidebar();
      if (moreMenu) moreMenu.hidden = true;
      moreButton?.setAttribute('aria-expanded', 'false');
      return;
    }

    const openPropensity = event.target.closest('[data-go-propensity]');
    if (openPropensity) {
      router.navigate('propensity');
      closeSidebar();
      if (moreMenu) moreMenu.hidden = true;
      moreButton?.setAttribute('aria-expanded', 'false');
      return;
    }

    const openPortfolio = event.target.closest('[data-go-portfolio]');
    if (openPortfolio) {
      router.navigate('portfolio');
      closeSidebar();
      return;
    }

    const openPlaybooks = event.target.closest('[data-go-playbooks]');
    if (openPlaybooks) {
      router.navigate('playbooks');
      closeSidebar();
      return;
    }

    const toggleMore = event.target.closest('[data-open-more]');
    if (toggleMore) {
      event.stopPropagation();
      if (!moreMenu) return;
      const filterButtons = getFiltersButtons();
      if (filtersPanel && !filtersPanel.hasAttribute('hidden')) {
        filtersPanel.setAttribute('hidden', 'hidden');
        filterButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
      }
      const expanded = moreButton?.getAttribute('aria-expanded') === 'true';
      moreMenu.hidden = Boolean(expanded);
      moreButton?.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      syncHeaderOffset();
      return;
    }

    const toggleFilters = event.target.closest('[data-open-filters]');
    if (toggleFilters) {
      if (!filtersPanel) return;
      if (moreMenu && !moreMenu.hidden) {
        moreMenu.hidden = true;
        moreButton?.setAttribute('aria-expanded', 'false');
      }
      const hidden = filtersPanel.hasAttribute('hidden');
      if (hidden) {
        filtersPanel.removeAttribute('hidden');
        getFiltersButtons().forEach((button) => button.setAttribute('aria-expanded', 'true'));
      } else {
        filtersPanel.setAttribute('hidden', 'hidden');
        getFiltersButtons().forEach((button) => button.setAttribute('aria-expanded', 'false'));
      }
      syncHeaderOffset();
      return;
    }

    const link = event.target.closest('[data-nav-route]');
    if (!link) return;
    event.preventDefault();
    const name = link.getAttribute('data-nav-route');
    if (name === 'account') {
      const targetId = currentAccount()?.id || state.data.accounts?.[0]?.id || '';
      setSelectedAccount(targetId);
      router.navigate('account', { id: targetId });
      return;
    }
    if (name === 'journey') {
      const targetId = currentAccount()?.id || state.data.accounts?.[0]?.id || '';
      if (targetId) setSelectedAccount(targetId);
      router.navigate('journey', { id: targetId });
      return;
    }
    if (name === 'customers') {
      const targetId = currentCustomer()?.id || state.data.workspace?.customers?.[0]?.id || '';
      if (targetId) setSelectedCustomer(targetId);
      router.navigate('customers');
      return;
    }
    if (name === 'customer') {
      const targetId = currentCustomer()?.id || state.data.workspace?.customers?.[0]?.id || '';
      if (!targetId) return;
      setSelectedCustomer(targetId);
      router.navigate('customer', { id: targetId });
      return;
    }
    router.navigate(name);
    closeSidebar();
  });

  appRoot.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches('[data-global-account-select]')) {
      const accountId = target.value;
      if (!accountId) return;
      if (['customers', 'customer', 'program', 'risks', 'expansion', 'voc', 'reports', 'propensity', 'settings'].includes(state.route.name)) {
        setSelectedCustomer(accountId);
        router.navigate('customer', { id: accountId });
      } else {
        setSelectedAccount(accountId);
        router.navigate('account', { id: accountId });
      }
      closeSidebar();
      return;
    }

    if (target.matches('[data-global-persona]')) {
      setPersona(target.value);
      return;
    }

    if (target.matches('[data-global-jump]')) {
      handleJumpSelection(target.value, target);
      closeSidebar();
      return;
    }

    if (target.matches('[data-global-safe-toggle]')) {
      setSafeMode(Boolean(target.checked));
      return;
    }

    if (target.matches('[data-global-mode]')) {
      setViewMode(target.value);
      return;
    }

    if (
      target.matches('[data-global-filter-engagement-type]') ||
      target.matches('[data-global-filter-requested-by]') ||
      target.matches('[data-global-filter-engagement-status]')
    ) {
      syncGlobalMultiFilters();
    }
  });

  document.addEventListener('click', (event) => {
    const insideMore = event.target.closest('[data-more-menu]') || event.target.closest('[data-open-more]');
    if (moreMenu && !moreMenu.hidden && !insideMore) {
      moreMenu.hidden = true;
      moreButton?.setAttribute('aria-expanded', 'false');
    }
    const filtersButtons = getFiltersButtons();
    const insideFilters = event.target.closest('[data-filters-panel]') || event.target.closest('[data-open-filters]');
    if (filtersPanel && !filtersPanel.hasAttribute('hidden') && !insideFilters) {
      filtersPanel.setAttribute('hidden', 'hidden');
      filtersButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
    }
    syncHeaderOffset();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeHeaderMenus();
      closeSidebar();
      syncHeaderOffset();
    }
  });

  sidebarOverlay?.addEventListener('click', closeSidebar);

  settingsRoot?.querySelectorAll('[data-close-settings]').forEach((item) => {
    item.addEventListener('click', () => {
      settingsRoot.classList.remove('is-open');
      settingsRoot.setAttribute('aria-hidden', 'true');
    });
  });

  settingsRoot?.querySelector('[data-reset-local-state]')?.addEventListener('click', async () => {
    resetLocalState();
    state.checklistState = {};
    await reloadData();
    settingsRoot.classList.remove('is-open');
    settingsRoot.setAttribute('aria-hidden', 'true');
    notify('Local state reset.');
  });
};

const init = async () => {
  applyTheme();
  applyDensity();
  if (routeRoot) {
    routeRoot.innerHTML = '';
    routeRoot.appendChild(
      createEmptyState({
        variant: 'loading',
        title: 'Loading your portfolio...',
        body: 'Fetching accounts and engagements.'
      })
    );
  }

  mountToastContainer();
  state.data = await loadDashboardData();
  if (pendingSnapshotWorkspace) {
    state.data.workspace = ensureWorkspaceShape(
      {
        ...state.data.workspace,
        portfolio: {
          ...(state.data.workspace?.portfolio || {}),
          ...(pendingSnapshotWorkspace.portfolio || {})
        },
        customers: Array.isArray(pendingSnapshotWorkspace.customers)
          ? pendingSnapshotWorkspace.customers
          : state.data.workspace?.customers
      },
      state.data.sampleWorkspace
    );
    pendingSnapshotWorkspace = null;
  }
  state.data.workspace = ensureWorkspaceDerived(currentWorkspace());
  persistWorkspace(state.data.workspace);
  state.checklistState = loadPlaybookChecklist();

  if (!state.selectedAccountId && state.data.accounts?.length) {
    setSelectedAccount(state.data.accounts[0].id);
  }
  if (!state.selectedCustomerId && state.data.workspace?.customers?.length) {
    setSelectedCustomer(state.data.workspace.customers[0].id);
  }

  bindGlobalEvents();
  observeHeaderOffset();

  palette = createCommandPalette({
    onSelect(entry) {
      if (!entry?.action) return;
      if (entry.action.custom) {
        entry.action.custom();
        return;
      }
      if (entry.action.route === 'account' && entry.action.params?.id) {
        setSelectedAccount(entry.action.params.id);
      }
      router.navigate(entry.action.route, entry.action.params || {});
    }
  });

  appRoot.querySelector('[data-open-palette]')?.addEventListener('click', () => palette.open());

  router.subscribe((route) => {
    state.route = route;
    const hashMode = parseModeFromHash();
    if (hashMode) {
      state.viewMode = hashMode;
      storage.set(STORAGE_KEYS.viewMode, state.viewMode);
    }
    closeHeaderMenus();
    closeSidebar();
    render();
  });

  router.start();
  const loader = document.getElementById('app-loading');
  if (loader) {
    loader.classList.add('hidden');
    window.setTimeout(() => loader.remove(), 350);
  }
};

init().catch((error) => {
  console.error(error);
  routeRoot.innerHTML = `
    <section class="card">
      <h1>Failed to load dashboard</h1>
      <p class="muted">${error.message}</p>
    </section>
  `;
  const loader = document.getElementById('app-loading');
  if (loader) {
    loader.classList.add('hidden');
    window.setTimeout(() => loader.remove(), 350);
  }
});
