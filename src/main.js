import { createCommandPalette } from './components/commandPalette.js';
import { createModal } from './components/modal.js';
import { createCustomerSafeBanner } from './components/CustomerSafeBanner.js';
import { createEngagementExportModal } from './components/EngagementExportModal.js';
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
import { renderSettingsPage } from './pages/settingsPage.js';

const appRoot = document.querySelector('[data-app-root]');
const routeRoot = document.querySelector('[data-route-root]');
const leftRailRoot = document.querySelector('[data-left-rail]');
const toastRoot = document.querySelector('[data-toast]');
const settingsRoot = document.querySelector('[data-settings]');
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
  const filtersButton = appRoot?.querySelector('[data-open-filters]');
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
  if (filtersButton) {
    filtersButton.setAttribute('aria-expanded', 'false');
  }
};

if (!appRoot || !routeRoot || !leftRailRoot) {
  throw new Error('App shell is missing required mount points.');
}

const state = {
  data: null,
  route: { name: 'home', params: {}, path: '/' },
  customerSafe: customerSafe.isCustomerSafe,
  viewMode: storage.get(STORAGE_KEYS.viewMode, 'today') || 'today',
  persona: 'cse',
  basePath: '',
  portfolioFilters: {
    segment: 'all',
    renewalWindow: 'all',
    health: 'all',
    staleOnly: false,
    staleDays: 30,
    engagementRecency: 'all',
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

const notify = (message) => {
  if (!toastRoot) return;
  toastRoot.textContent = message;
  toastRoot.classList.add('is-visible');
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => toastRoot.classList.remove('is-visible'), 1800);
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

const setViewMode = (value) => {
  state.viewMode = value || 'today';
  storage.set(STORAGE_KEYS.viewMode, state.viewMode);
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

  if (audience === 'customer') {
    state.customerSafe = setCustomerSafeMode(true);
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
  settings: 'Settings',
  playbooks: 'Playbooks',
  resources: 'Resources',
  cheatsheet: 'Cheatsheet',
  exports: 'Exports',
  intake: 'Intake',
  manager: 'Manager'
};

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
    link.classList.toggle('is-active', active);
  });
};

const renderLeftRail = () => {
  if (!leftRailRoot) return;
  const accounts = state.data?.accounts || [];
  const workspace = currentWorkspace();
  const workspacePortfolio = buildWorkspacePortfolio(workspace);
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
  const redCount = (workspacePortfolio.rows || []).filter((row) => String(row.health || '').toLowerCase() === 'red').length;
  const renewalWindowCount = (workspacePortfolio.rows || []).filter((row) => Number(row.renewalDays ?? 999) <= 90).length;
  const staleCount = (workspacePortfolio.rows || []).filter((row) => Number(row.engagementDays ?? 999) > 30).length;
  const recentCustomers = [...customers]
    .sort((left, right) => {
      if (left.id === state.selectedCustomerId) return -1;
      if (right.id === state.selectedCustomerId) return 1;
      return String(left.name || '').localeCompare(String(right.name || ''));
    })
    .slice(0, 8);

  leftRailRoot.innerHTML = `
    <div class="rail-group">
      <p class="rail-label">Primary Navigation</p>
      <div class="rail-list">
        ${PRIMARY_NAV_ITEMS.map(
          (item) =>
            `<button class="rail-link rail-nav-link" type="button" data-nav-route="${item.route}"><span class="rail-nav-icon">${item.icon}</span><span>${item.label}</span></button>`
        ).join('')}
      </div>
    </div>

    <div class="rail-group">
      <p class="rail-label">${isAccountContext ? 'Jump To Section' : 'Daily Focus'}</p>
      ${
        isAccountContext
          ? sectionLinks.map(
              (item) =>
                `<button class="rail-link" type="button" data-rail-section="${item.id}">${item.label}</button>`
            ).join('')
          : `<ul class="rail-shortcuts">
               <li>Customers loaded: ${customers.length}</li>
               <li>Red health: ${redCount}</li>
               <li>Renewal < 90 days: ${renewalWindowCount}</li>
               <li>Engagement stale > 30d: ${staleCount}</li>
             </ul>`
      }
      <button class="rail-link" type="button" data-rail-open-current ${current ? '' : 'disabled'}>Open Current Customer</button>
    </div>

    <div class="rail-group">
      <p class="rail-label">Recent Customers</p>
      <div class="rail-list">
        ${
          recentCustomers.length
            ? recentCustomers
                .map(
                  (customer) =>
                    `<button class="rail-link ${customer.id === state.selectedCustomerId ? 'is-active' : ''}" type="button" data-rail-customer="${customer.id}">${
                      state.customerSafe ? maskField('accountName', customer.name) || 'Your Organization' : customer.name
                    }</button>`
                )
                .join('')
            : accountLoadError
              ? '<p class="empty-text">Customer data failed to load.</p>'
              : '<p class="empty-text">No customers loaded.</p>'
        }
      </div>
    </div>

    <div class="rail-group">
      <p class="rail-label">${isAccountContext ? 'Usage Guidance' : 'CSE Loop'}</p>
      <ul class="rail-shortcuts">
        ${
          isAccountContext
            ? '<li>Use tabs for workflow details and section-level actions.</li><li>Use customer-safe mode before sharing artifacts.</li><li>Use Exports tab for PDF/CSV and copy templates.</li>'
            : '<li>1. Triage queue in Today</li><li>2. Execute program or workshop motion</li><li>3. Log engagement and update outcomes</li><li>4. Export customer-safe summary</li>'
        }
      </ul>
    </div>

    <div class="rail-group">
      <p class="rail-label">Shortcuts</p>
      <ul class="rail-shortcuts">
        <li><kbd>Ctrl</kbd> + <kbd>K</kbd> command palette</li>
        <li>Toggle customer-safe before sharing exports</li>
      </ul>
    </div>
  `;

  leftRailRoot.querySelector('[data-rail-open-current]')?.addEventListener('click', () => {
    const customerContext = ['customers', 'customer', 'program', 'risks', 'expansion', 'voc', 'reports', 'settings'].includes(
      state.route.name
    );
    if (customerContext) {
      const targetId = currentCustomer()?.id || state.data.workspace?.customers?.[0]?.id || '';
      if (!targetId) return;
      setSelectedCustomer(targetId);
      router.navigate('customer', { id: targetId });
      return;
    }
    const targetId = currentAccount()?.id || state.data.accounts?.[0]?.id || '';
    if (!targetId) return;
    setSelectedAccount(targetId);
    router.navigate('account', { id: targetId });
  });

  leftRailRoot.querySelectorAll('[data-rail-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionId = button.getAttribute('data-rail-section');
      focusAccountSection(sectionId);
    });
  });

  leftRailRoot.querySelectorAll('[data-rail-customer]').forEach((button) => {
    button.addEventListener('click', () => {
      const customerId = button.getAttribute('data-rail-customer');
      setSelectedCustomer(customerId);
      router.navigate('customer', { id: customerId });
    });
  });
};

const findProgram = (programId) => state.data.programs.find((program) => program.program_id === programId) || null;

const onCopyInvite = async (programId) => {
  const program = findProgram(programId);
  if (!program) return;
  const blurb = program.invite_blurb || [
    `Join ${program.title}`,
    `When: ${formatDateTime(program.date)}`,
    `Use cases: ${(program.target_use_cases || []).join(', ')}`
  ].join('\n');
  await copyText(blurb);
  notify(`Invite copied for ${program.title}.`);
};

const updateProgram = (programId, updater) => {
  const index = state.data.programs.findIndex((program) => program.program_id === programId);
  if (index < 0) return;
  const updated = updater(state.data.programs[index]);
  state.data.programs[index] = updated;
  persistProgram(updated);
  render();
};

const onLogAttendance = (programId, amount = 1, accountId = '') => {
  const normalizedAmount = Number(amount || 0);
  updateProgram(programId, (program) => ({
    ...program,
    attendance_count: Math.max(0, Number(program.attendance_count || 0) + normalizedAmount)
  }));

  if (!accountId) return;

  const account = getAccountById(accountId);
  const program = findProgram(programId);
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
  updateProgram(programId, (program) => ({
    ...program,
    registration_count: Math.max(0, Number(program.registration_count || 0) + Number(amount || 0))
  }));
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
    const program = (workspace.programs || []).find((item) => item.id === programId);
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
    const program = (workspace.programs || []).find((item) => item.id === programId);
    if (!program) return;
    const cohort = new Set(program.cohortCustomerIds || []);
    cohort.add(customerId);
    program.cohortCustomerIds = [...cohort];
    notify('Customer added to program cohort.');
  });
};

const onWorkspaceUpdateProgramFunnel = (programId, funnel) => {
  updateWorkspace((workspace) => {
    workspace.programs = (workspace.programs || []).map((program) =>
      program.id === programId
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
  const program = (workspace.programs || []).find((item) => item.id === programId);
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
  const program = findProgram(programId);
  const account = getAccountById(accountId);
  if (!program || !account) return;
  const invite = [
    `Hello ${account.name} team,`,
    ``,
    `You are invited to ${program.title}.`,
    `Date/Time: ${formatDateTime(program.date)}`,
    `Target use cases: ${(program.target_use_cases || []).join(', ')}`,
    ``,
    `${program.invite_blurb || 'Please register and bring implementation questions.'}`
  ].join('\n');
  await copyText(invite);
  const nextTouchDate = toIsoDate(program.date);
  account.engagement = {
    ...account.engagement,
    next_touch_date: nextTouchDate
  };
  persistAccountField(accountId, 'engagement.next_touch_date', nextTouchDate);
  appendChangeLog(accountId, 'Engagement', `Invited to program ${program.title}.`, nextTouchDate);
  addEngagementLogEntry({
    account_id: account.id,
    account_name: account.name,
    date: toIsoDate(new Date()),
    type: 'program invitation',
    notes_customer_safe: `Invite sent for ${program.title}.`,
    notes_internal: `Next touch moved to ${nextTouchDate}.`
  });
  notify(`Invite copied for ${account.name}.`);
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
  const inCustomerModel = ['customers', 'customer', 'program', 'risks', 'expansion', 'voc', 'reports', 'settings'].includes(
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

  const modeSelect = appRoot.querySelector('[data-global-mode]');
  if (modeSelect) modeSelect.value = state.viewMode;

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
      options.push({
        value: activeAccount ? `account:${activeAccount.id}` : 'account',
        label: activeAccount ? `${inCustomerModel ? 'Customer' : 'Account'}: ${activeAccount.name}` : 'Account'
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
    const modeLabel = state.viewMode === 'deep' ? 'Deep Dive' : state.viewMode === 'review' ? 'Review' : 'Today';
    safeLabel.textContent = state.customerSafe
      ? `Customer-safe mode • ${routeLabel} • ${modeLabel} • ${state.persona === 'manager' ? 'Manager' : 'CSE On-Demand'}`
      : `Internal mode • ${routeLabel} • ${modeLabel} • ${state.persona === 'manager' ? 'Manager' : 'CSE On-Demand'}`;
  }

  const managerBadge = appRoot.querySelector('[data-manager-badge]');
  if (managerBadge) {
    managerBadge.hidden = state.persona !== 'manager';
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

  const filtersShortcut = appRoot.querySelector('.header-panel [data-go-portfolio]');
  if (filtersShortcut) {
    const activeCount = countActivePortfolioFilters(state.portfolioFilters);
    filtersShortcut.textContent = `Open Portfolio Filters${activeCount ? ` (${activeCount} active)` : ''}`;
  }
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
    ...programsCommandEntries(state.data.programs),
    ...playbooksCommandEntries(state.data.playbooks),
    ...resourcesCommandEntries(),
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
    const programId = route.params.id || workspaceModel.programs?.[0]?.id || '';
    if (!route.params.id && programId) {
      router.navigate('program', { id: programId }, { replace: true });
      return;
    }
  }

  let view = null;
  const workspace = buildAccountWorkspace(state.data, state.selectedAccountId || route.params.id);
  const selectedCustomerId = route.params.id || state.selectedCustomerId || workspaceModel.customers?.[0]?.id || '';
  const selectedCustomer = workspaceCustomerById(selectedCustomerId);
  const customerMetrics = selectedCustomer ? scoreBreakdown(workspaceModel, selectedCustomer.id, new Date()) : null;
  const programDetail =
    route.name === 'program'
      ? (() => {
          const targetId = route.params.id || workspaceModel.programs?.[0]?.id || '';
          const workspaceProgram = (workspaceModel.programs || []).find((item) => item.id === targetId);
          if (workspaceProgram) return workspaceProgram;
          const legacyProgram = (state.data.programs || []).find((item) => item.program_id === targetId);
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
        })()
      : null;

  const common = {
    customerSafe: state.customerSafe,
    maskField,
    persona: state.persona,
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
      ...common
    });
  }

  if (route.name === 'portfolio') {
    view = renderPortfolioPage({
      portfolio,
      workspace: workspaceModel,
      workspacePortfolio,
      filters: state.portfolioFilters,
      onSetFilters: setPortfolioFilters,
      updatedOn: state.data.updated_on,
      accountLoadError,
      onRetryData: reloadData,
      onExportPortfolio: () => exportPortfolioCsv(workspaceModel),
      ...common
    });
  }

  if (route.name === 'manager') {
    view = renderManagerPage({
      portfolio,
      manager,
      mode: state.viewMode,
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
      onSetRiskOverride: onWorkspaceSetRiskOverride,
      onAddRiskSignal: onWorkspaceAddRiskSignal,
      onDismissRiskSignal: onWorkspaceDismissRiskSignal,
      onAddPlaybookAction: onWorkspaceAddPlaybookAction,
      onTogglePlaybookStatus: onWorkspaceTogglePlaybookStatus,
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
      notify,
      copyText,
      selectedAccountId: state.selectedAccountId,
      ...common
    });
  }

  if (route.name === 'simulator') {
    view = renderSimulatorPage({
      capabilities: state.data.simulatorCapabilities || [],
      rules: state.data.simulatorRules || [],
      customerSafe: state.customerSafe,
      onToggleSafe: setSafeMode,
      copyText,
      notify,
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
      programs: state.data.programs,
      accounts: state.data.accounts,
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
      account: currentAccount(),
      customerSafe: state.customerSafe,
      mode: state.viewMode,
      onExportPortfolio: () => exportPortfolioCsv(workspaceModel),
      onExportAccountCsv: (account, options) => exportAccountCsv(account, options),
      onExportAccountPdf: (account, options) => exportAccountSummaryPdf(account, options),
      onCopyShare: copyShareSnapshot,
      ...common
    });
  }

  if (route.name === 'risks') {
    view = renderRisksPage({
      workspace: workspaceModel,
      portfolioRows: workspacePortfolio.rows,
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

  if (route.name === 'settings') {
    view = renderSettingsPage({
      workspace: workspaceModel,
      onLoadSamplePortfolio: onLoadSampleWorkspace,
      onImportWorkspace,
      onExportWorkspace,
      onResetWorkspace,
      onUpdateScoringWeights,
      onAddRiskTemplate,
      onAddProgramTemplate,
      onCreateSnapshot: onCreateMonthlySnapshot,
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
    view.innerHTML = `<section class="card"><h1>Route not found</h1><button class="qa" type="button" data-go-home>Back to Portfolio</button></section>`;
    view.querySelector('[data-go-home]')?.addEventListener('click', () => router.navigate('home'));
  }

  routeRoot.innerHTML = '';
  normalizeRouteLayout(view);
  if (state.customerSafe) {
    view.prepend(createCustomerSafeBanner());
  }
  routeRoot.appendChild(view);

  const commands = commandEntries(workspace);
  palette?.setEntries(commands);
};

const render = () => {
  renderShellContext();
  renderLeftRail();
  renderCurrentRoute();
  setActiveNav();
  syncHeaderOffset();
};

state.basePath = detectBasePath(window.location.pathname);
applyQueryOverrides();
const router = createRouter(state.basePath);

const bindGlobalEvents = () => {
  appRoot.addEventListener('click', (event) => {
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
  });

  appRoot.querySelector('[data-global-account-select]')?.addEventListener('change', (event) => {
    const accountId = event.target.value;
    if (!accountId) return;
    if (['customers', 'customer', 'program', 'risks', 'expansion', 'voc', 'reports', 'settings'].includes(state.route.name)) {
      setSelectedCustomer(accountId);
      router.navigate('customer', { id: accountId });
      return;
    }
    setSelectedAccount(accountId);
    router.navigate('account', { id: accountId });
  });

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

  appRoot.querySelector('[data-global-export]')?.addEventListener('click', () => {
    const modal = createEngagementExportModal({
      workspace: currentWorkspace(),
      customerSafe: state.customerSafe,
      maskField,
      notify,
      onClose: () => {}
    });
    document.body.appendChild(modal);
  });

  appRoot.querySelector('[data-global-persona]')?.addEventListener('change', (event) => {
    const persona = event.target.value;
    state.persona = persona === 'manager' ? 'manager' : 'cse';
    if (state.route.name === 'manager' && state.persona !== 'manager') {
      router.navigate('home');
      return;
    }
    render();
  });

  appRoot.querySelector('[data-global-jump]')?.addEventListener('change', (event) => {
    const value = String(event.target.value || '').trim();
    if (!value) return;
    const customerRouteContext = ['customer', 'customers', 'program', 'risks', 'expansion', 'voc', 'reports', 'settings'].includes(
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
      event.target.value = '';
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
      event.target.value = '';
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
      event.target.value = '';
      return;
    }
    event.target.value = '';
  });

  appRoot.querySelector('[data-global-safe-toggle]')?.addEventListener('change', (event) => {
    setSafeMode(Boolean(event.target.checked));
  });

  appRoot.querySelector('[data-global-mode]')?.addEventListener('change', (event) => {
    setViewMode(event.target.value);
  });

  appRoot.querySelectorAll('[data-global-filter-engagement-type]').forEach((input) => {
    input.addEventListener('change', syncGlobalMultiFilters);
  });
  appRoot.querySelectorAll('[data-global-filter-requested-by]').forEach((input) => {
    input.addEventListener('change', syncGlobalMultiFilters);
  });
  appRoot.querySelectorAll('[data-global-filter-engagement-status]').forEach((input) => {
    input.addEventListener('change', syncGlobalMultiFilters);
  });

  appRoot.querySelector('[data-open-settings]')?.addEventListener('click', () => {
    router.navigate('settings');
  });

  const moreButton = appRoot.querySelector('[data-open-more]');
  const moreMenu = appRoot.querySelector('[data-more-menu]');
  const filtersButton = appRoot.querySelector('[data-open-filters]');
  const filtersPanel = appRoot.querySelector('[data-filters-panel]');

  moreButton?.setAttribute('aria-expanded', 'false');
  filtersButton?.setAttribute('aria-expanded', 'false');

  moreButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!moreMenu) return;
    if (filtersPanel && !filtersPanel.hasAttribute('hidden')) {
      filtersPanel.setAttribute('hidden', 'hidden');
      filtersButton?.setAttribute('aria-expanded', 'false');
    }
    const expanded = moreButton.getAttribute('aria-expanded') === 'true';
    moreMenu.hidden = expanded;
    moreButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    syncHeaderOffset();
  });

  document.addEventListener('click', (event) => {
    const insideMore = event.target.closest('[data-more-menu]') || event.target.closest('[data-open-more]');
    if (moreMenu && !moreMenu.hidden && !insideMore) {
      moreMenu.hidden = true;
      moreButton?.setAttribute('aria-expanded', 'false');
    }
    const insideFilters = event.target.closest('[data-filters-panel]') || event.target.closest('[data-open-filters]');
    if (filtersPanel && !filtersPanel.hasAttribute('hidden') && !insideFilters) {
      filtersPanel.setAttribute('hidden', 'hidden');
      filtersButton?.setAttribute('aria-expanded', 'false');
    }
    syncHeaderOffset();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeHeaderMenus();
    syncHeaderOffset();
  });

  appRoot.querySelector('[data-copy-snapshot]')?.addEventListener('click', async () => {
    await copyShareSnapshot();
    if (moreMenu) moreMenu.hidden = true;
    moreButton?.setAttribute('aria-expanded', 'false');
    syncHeaderOffset();
  });

  appRoot.querySelector('[data-go-resources]')?.addEventListener('click', () => {
    router.navigate('resources');
    if (moreMenu) moreMenu.hidden = true;
    moreButton?.setAttribute('aria-expanded', 'false');
    syncHeaderOffset();
  });

  filtersButton?.addEventListener('click', () => {
    if (!filtersPanel) return;
    if (moreMenu && !moreMenu.hidden) {
      moreMenu.hidden = true;
      moreButton?.setAttribute('aria-expanded', 'false');
    }
    const hidden = filtersPanel.hasAttribute('hidden');
    if (hidden) {
      filtersPanel.removeAttribute('hidden');
      filtersButton.setAttribute('aria-expanded', 'true');
    } else {
      filtersPanel.setAttribute('hidden', 'hidden');
      filtersButton.setAttribute('aria-expanded', 'false');
    }
    syncHeaderOffset();
  });

  appRoot.querySelector('[data-go-portfolio]')?.addEventListener('click', () => {
    router.navigate('portfolio');
  });
  appRoot.querySelector('[data-go-playbooks]')?.addEventListener('click', () => {
    router.navigate('playbooks');
  });

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
    closeHeaderMenus();
    render();
  });

  router.start();
};

init().catch((error) => {
  console.error(error);
  routeRoot.innerHTML = `
    <section class="card">
      <h1>Failed to load dashboard</h1>
      <p class="muted">${error.message}</p>
    </section>
  `;
});
