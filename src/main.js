import { createCommandPalette } from './components/commandPalette.js';
import { createModal } from './components/modal.js';
import { createRouter, detectBasePath, parseRoute, routePath } from './lib/router.js';
import {
  loadDashboardData,
  loadPlaybookChecklist,
  persistAccountField,
  persistPlaybookChecklist,
  persistProgram,
  persistRequests,
  resetLocalState
} from './lib/dataLoader.js';
import { buildShareSnapshotUrl, exportAccountCsv, exportAccountSummaryPdf, exportPortfolioCsv } from './lib/exports.js';
import { formatDateTime, toIsoDate } from './lib/date.js';
import { addEngagementLogEntry } from './lib/engagementLog.js';
import { buildAccountWorkspace, buildPortfolioView } from './lib/scoring.js';
import { storage, STORAGE_KEYS } from './lib/storage.js';
import { renderAccountPage, accountCommandEntries } from './pages/accountPage.js';
import { renderExportsPage, exportsCommandEntries } from './pages/exportsPage.js';
import { renderIntakePage, intakeCommandEntries } from './pages/intakePage.js';
import { renderPlaybooksPage, playbooksCommandEntries } from './pages/playbooksPage.js';
import { renderPortfolioHomePage, renderPortfolioPage, portfolioCommandEntries } from './pages/portfolioPage.js';
import { renderProgramsPage, programsCommandEntries } from './pages/programsPage.js';
import { renderResourcesPage, resourcesCommandEntries } from './pages/resourcesPage.js';
import { renderToolkitPage, toolkitCommandEntries } from './pages/toolkitPage.js';
import { renderCheatsheetPage, cheatsheetCommandEntries } from './pages/cheatsheetPage.js';
import { renderSimulatorPage, simulatorCommandEntries } from './pages/simulatorPage.js';
import { renderManagerPage, managerCommandEntries } from './pages/managerPage.js';

const appRoot = document.querySelector('[data-app-root]');
const routeRoot = document.querySelector('[data-route-root]');
const leftRailRoot = document.querySelector('[data-left-rail]');
const toastRoot = document.querySelector('[data-toast]');
const settingsRoot = document.querySelector('[data-settings]');

const syncHeaderOffset = () => {
  const header = document.querySelector('.app-header');
  if (!header) return;

  const offset = Math.ceil(header.getBoundingClientRect().height + 16);
  document.documentElement.style.setProperty('--header-offset', `${offset}px`);
};

const observeHeaderOffset = () => {
  syncHeaderOffset();

  window.addEventListener('resize', syncHeaderOffset);

  const header = document.querySelector('.app-header');
  if (header && 'ResizeObserver' in window) {
    const ro = new ResizeObserver(() => syncHeaderOffset());
    ro.observe(header);
  }
};

if (!appRoot || !routeRoot || !leftRailRoot) {
  throw new Error('App shell is missing required mount points.');
}

const state = {
  data: null,
  route: { name: 'home', params: {}, path: '/' },
  customerSafe: Boolean(storage.get(STORAGE_KEYS.safeMode, false)),
  viewMode: storage.get(STORAGE_KEYS.viewMode, 'today') || 'today',
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
    belowThreeGreen: false
  },
  checklistState: {},
  selectedAccountId: storage.get(STORAGE_KEYS.selectedAccountId, ''),
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

const setSafeMode = (value) => {
  state.customerSafe = Boolean(value);
  storage.set(STORAGE_KEYS.safeMode, state.customerSafe);
  render();
};

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

  if (audience === 'customer') {
    state.customerSafe = true;
    storage.set(STORAGE_KEYS.safeMode, true);
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
  { route: 'account', label: 'Accounts', icon: 'A' },
  { route: 'toolkit', label: 'Success Plans', icon: 'SP' },
  { route: 'simulator', label: 'Simulator', icon: 'S' },
  { route: 'playbooks', label: 'Playbooks', icon: 'PB' },
  { route: 'resources', label: 'Resources', icon: 'R' },
  { route: 'cheatsheet', label: 'Cheatsheet', icon: 'C' },
  { route: 'manager', label: 'Manager', icon: 'M' }
];
const ROUTE_LABELS = {
  home: 'Today',
  portfolio: 'Portfolio',
  account: 'Account',
  journey: 'Journey',
  toolkit: 'Success Plans',
  simulator: 'Simulator',
  programs: 'Programs',
  playbooks: 'Playbooks',
  resources: 'Resources',
  cheatsheet: 'Cheatsheet',
  exports: 'Exports',
  intake: 'Intake',
  manager: 'Manager'
};

const setActiveNav = () => {
  navItems().forEach((link) => {
    const route = link.getAttribute('data-nav-route');
    const active = route === state.route.name;
    link.classList.toggle('is-active', active);
  });
};

const renderLeftRail = () => {
  if (!leftRailRoot) return;
  const accounts = state.data?.accounts || [];
  const loadErrors = Array.isArray(state.data?.loadErrors) ? state.data.loadErrors : [];
  const accountLoadError = loadErrors.some((item) => item.file === 'accounts.json');
  const current = currentAccount();
  const isAccountContext = state.route.name === 'account' || state.route.name === 'journey';
  const redCount = accounts.filter((account) => String(account.health?.overall || '').toLowerCase() === 'red').length;
  const renewalWindowCount = accounts.filter((account) => {
    const target = account.renewal_date ? new Date(account.renewal_date).getTime() : Number.POSITIVE_INFINITY;
    return Number.isFinite(target) && Math.floor((target - Date.now()) / (1000 * 60 * 60 * 24)) <= 90;
  }).length;
  const staleCount = accounts.filter((account) => {
    const lastUpdated = account.health?.last_updated ? new Date(account.health.last_updated).getTime() : null;
    if (!lastUpdated) return true;
    return Math.floor((Date.now() - lastUpdated) / (1000 * 60 * 60 * 24)) > 30;
  }).length;
  const recentAccounts = [...accounts]
    .sort((left, right) => {
      if (left.id === state.selectedAccountId) return -1;
      if (right.id === state.selectedAccountId) return 1;
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
          ? ACCOUNT_SECTION_LINKS.map(
              (item) =>
                `<button class="rail-link" type="button" data-rail-section="${item.id}">${item.label}</button>`
            ).join('')
          : `<ul class="rail-shortcuts">
               <li>Accounts loaded: ${accounts.length}</li>
               <li>Red health: ${redCount}</li>
               <li>Renewal < 90 days: ${renewalWindowCount}</li>
               <li>Stale health > 30d: ${staleCount}</li>
             </ul>`
      }
      <button class="rail-link" type="button" data-rail-open-current ${current ? '' : 'disabled'}>Open Current Account</button>
    </div>

    <div class="rail-group">
      <p class="rail-label">Recent Accounts</p>
      <div class="rail-list">
        ${
          recentAccounts.length
            ? recentAccounts
                .map(
                  (account) =>
                    `<button class="rail-link ${account.id === state.selectedAccountId ? 'is-active' : ''}" type="button" data-rail-account="${account.id}">${account.name}</button>`
                )
                .join('')
            : accountLoadError
              ? '<p class="empty-text">Account data failed to load.</p>'
              : '<p class="empty-text">No accounts loaded.</p>'
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
    const targetId = currentAccount()?.id || state.data.accounts?.[0]?.id || '';
    if (!targetId) return;
    setSelectedAccount(targetId);
    router.navigate('account', { id: targetId });
  });

  leftRailRoot.querySelectorAll('[data-rail-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionId = button.getAttribute('data-rail-section');
      if (!sectionId) return;
      const tabButton = routeRoot.querySelector(`[data-tab-target="${sectionId}"]`);
      tabButton?.click();
      const panel = routeRoot.querySelector(`[data-tab-panel="${sectionId}"]`);
      panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  leftRailRoot.querySelectorAll('[data-rail-account]').forEach((button) => {
    button.addEventListener('click', () => {
      const accountId = button.getAttribute('data-rail-account');
      setSelectedAccount(accountId);
      router.navigate('account', { id: accountId });
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
  const activeAccountId = state.selectedAccountId || accounts[0]?.id || '';
  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0] || null;

  const safeToggle = appRoot.querySelector('[data-global-safe-toggle]');
  if (safeToggle) safeToggle.checked = state.customerSafe;

  const modeSelect = appRoot.querySelector('[data-global-mode]');
  if (modeSelect) modeSelect.value = state.viewMode;

  const accountSelect = appRoot.querySelector('[data-global-account-select]');
  if (accountSelect) {
    accountSelect.innerHTML = accounts.length
      ? accounts
          .map(
            (account) =>
              `<option value="${account.id}" ${account.id === activeAccountId ? 'selected' : ''}>${account.name}</option>`
          )
          .join('')
      : '<option value="">No accounts loaded</option>';
    accountSelect.value = activeAccountId;
  }

  const personaSelect = appRoot.querySelector('[data-global-persona]');
  if (personaSelect) {
    personaSelect.value = state.route.name === 'manager' ? 'manager' : 'cse';
  }

  const jumpSelect = appRoot.querySelector('[data-global-jump]');
  if (jumpSelect) {
    const options = [
      { value: 'home', label: 'Today' },
      { value: 'portfolio', label: 'Portfolio' },
      { value: activeAccount ? `account:${activeAccount.id}` : 'account', label: activeAccount ? `Account: ${activeAccount.name}` : 'Account' },
      { value: 'programs', label: 'Programs' },
      { value: 'toolkit', label: 'Success Plans' },
      { value: 'simulator', label: 'Simulator' },
      { value: 'playbooks', label: 'Playbooks' },
      { value: 'resources', label: 'Resources' },
      { value: 'cheatsheet', label: 'Cheatsheet' },
      { value: 'manager', label: 'Manager' },
      { value: 'exports', label: 'Exports' },
      { value: 'intake', label: 'Intake' }
    ];
    jumpSelect.innerHTML = options.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
    const currentValue =
      state.route.name === 'account' || state.route.name === 'journey'
        ? activeAccount
          ? `account:${activeAccount.id}`
          : 'account'
        : state.route.name;
    jumpSelect.value = options.some((item) => item.value === currentValue) ? currentValue : 'home';
  }

  const safeLabel = appRoot.querySelector('[data-safe-label]');
  if (safeLabel) {
    const routeLabel = ROUTE_LABELS[state.route.name] || 'Today';
    const modeLabel = state.viewMode === 'deep' ? 'Deep Dive' : state.viewMode === 'review' ? 'Review' : 'Today';
    safeLabel.textContent = state.customerSafe
      ? `Customer-safe mode • ${routeLabel} • ${modeLabel}`
      : `Internal mode • ${routeLabel} • ${modeLabel}`;
  }
};

const copyShareSnapshot = async () => {
  const route = routePath(state.route.name, state.route.params);
  const url = buildShareSnapshotUrl({
    basePath: state.basePath,
    route,
    customerSafe: state.customerSafe
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
    { id: 'cmd-manager', label: 'Open Manager Dashboard', meta: 'Manager', action: { route: 'manager' } },
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
    ...accountCommandEntries(workspace)
  ];
};

const reloadData = async () => {
  state.data = await loadDashboardData();
  state.actionCardCompletion = storage.get(STORAGE_KEYS.actionCards, {});
  if (!state.selectedAccountId && state.data.accounts?.length) {
    setSelectedAccount(state.data.accounts[0].id);
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
  const portfolio = buildPortfolioView(state.data);
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

  let view = null;
  const workspace = buildAccountWorkspace(state.data, state.selectedAccountId || route.params.id);

  const common = {
    navigate: (name, params) => {
      if (name === 'account' && params?.id) setSelectedAccount(params.id);
      if (name === 'account' && !params?.id) params = { id: currentAccount()?.id || state.data.accounts?.[0]?.id || '' };
      router.navigate(name, params);
    }
  };

  if (route.name === 'home') {
    view = renderPortfolioHomePage({
      portfolio,
      filters: state.portfolioFilters,
      onSetFilters: setPortfolioFilters,
      updatedOn: state.data.updated_on,
      mode: state.viewMode,
      accountLoadError,
      onRetryData: reloadData,
      onCopyInvite,
      onLogAttendance,
      onExportPortfolio: () => exportPortfolioCsv(state.data.accounts, state.data.requests),
      onCopyShare: copyShareSnapshot,
      ...common
    });
  }

  if (route.name === 'portfolio') {
    view = renderPortfolioPage({
      portfolio,
      filters: state.portfolioFilters,
      onSetFilters: setPortfolioFilters,
      updatedOn: state.data.updated_on,
      accountLoadError,
      onRetryData: reloadData,
      onExportPortfolio: () => exportPortfolioCsv(state.data.accounts, state.data.requests),
      ...common
    });
  }

  if (route.name === 'manager') {
    view = renderManagerPage({
      portfolio,
      mode: state.viewMode,
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
      onExportPortfolio: () => exportPortfolioCsv(state.data.accounts, state.data.requests),
      onExportAccountCsv: (account, options) => exportAccountCsv(account, options),
      onExportAccountPdf: (account, options) => exportAccountSummaryPdf(account, options),
      onCopyShare: copyShareSnapshot,
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
    router.navigate(name);
  });

  appRoot.querySelector('[data-global-account-select]')?.addEventListener('change', (event) => {
    const accountId = event.target.value;
    if (!accountId) return;
    setSelectedAccount(accountId);
    router.navigate('account', { id: accountId });
  });

  appRoot.querySelector('[data-global-export]')?.addEventListener('click', () => {
    router.navigate('exports');
  });

  appRoot.querySelector('[data-global-persona]')?.addEventListener('change', (event) => {
    const persona = event.target.value;
    if (persona === 'manager') {
      router.navigate('manager');
      return;
    }
    router.navigate('home');
  });

  appRoot.querySelector('[data-global-jump]')?.addEventListener('change', (event) => {
    const value = String(event.target.value || '').trim();
    if (!value) return;
    if (value.startsWith('account:')) {
      const accountId = value.split(':')[1] || state.selectedAccountId || state.data.accounts?.[0]?.id || '';
      if (!accountId) return;
      setSelectedAccount(accountId);
      router.navigate('account', { id: accountId });
      return;
    }
    if (value === 'account') {
      const accountId = state.selectedAccountId || state.data.accounts?.[0]?.id || '';
      if (!accountId) return;
      setSelectedAccount(accountId);
      router.navigate('account', { id: accountId });
      return;
    }
    router.navigate(value);
  });

  appRoot.querySelector('[data-global-safe-toggle]')?.addEventListener('change', (event) => {
    setSafeMode(Boolean(event.target.checked));
  });

  appRoot.querySelector('[data-global-mode]')?.addEventListener('change', (event) => {
    setViewMode(event.target.value);
  });

  appRoot.querySelector('[data-open-settings]')?.addEventListener('click', () => {
    settingsRoot?.classList.add('is-open');
    settingsRoot?.setAttribute('aria-hidden', 'false');
  });

  const moreButton = appRoot.querySelector('[data-open-more]');
  const moreMenu = appRoot.querySelector('[data-more-menu]');
  moreButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!moreMenu) return;
    const expanded = moreButton.getAttribute('aria-expanded') === 'true';
    moreMenu.hidden = expanded;
    moreButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });

  document.addEventListener('click', (event) => {
    if (!moreMenu || moreMenu.hidden) return;
    if (event.target.closest('[data-more-menu]') || event.target.closest('[data-open-more]')) return;
    moreMenu.hidden = true;
    moreButton?.setAttribute('aria-expanded', 'false');
  });

  appRoot.querySelector('[data-copy-snapshot]')?.addEventListener('click', async () => {
    await copyShareSnapshot();
    if (moreMenu) moreMenu.hidden = true;
    moreButton?.setAttribute('aria-expanded', 'false');
  });

  appRoot.querySelector('[data-go-resources]')?.addEventListener('click', () => {
    router.navigate('resources');
    if (moreMenu) moreMenu.hidden = true;
    moreButton?.setAttribute('aria-expanded', 'false');
  });

  const filtersButton = appRoot.querySelector('[data-open-filters]');
  const filtersPanel = appRoot.querySelector('[data-filters-panel]');
  filtersButton?.addEventListener('click', () => {
    if (!filtersPanel) return;
    const hidden = filtersPanel.hasAttribute('hidden');
    if (hidden) {
      filtersPanel.removeAttribute('hidden');
      filtersButton.setAttribute('aria-expanded', 'true');
    } else {
      filtersPanel.setAttribute('hidden', 'hidden');
      filtersButton.setAttribute('aria-expanded', 'false');
    }
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
  state.checklistState = loadPlaybookChecklist();

  if (!state.selectedAccountId && state.data.accounts?.length) {
    setSelectedAccount(state.data.accounts[0].id);
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
