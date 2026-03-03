import { createCommandPalette } from './components/commandPalette.js';
import { createModal } from './components/modal.js';
import { buildHref, createRouter, detectBasePath, routePath } from './lib/router.js';
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
import { formatDateTime } from './lib/date.js';
import { buildAccountWorkspace, buildPortfolioView } from './lib/scoring.js';
import { storage, STORAGE_KEYS } from './lib/storage.js';
import { renderAccountPage, accountCommandEntries } from './pages/accountPage.js';
import { renderExportsPage, exportsCommandEntries } from './pages/exportsPage.js';
import { renderIntakePage, intakeCommandEntries } from './pages/intakePage.js';
import { renderPlaybooksPage, playbooksCommandEntries } from './pages/playbooksPage.js';
import { renderPortfolioHomePage, renderPortfolioPage, portfolioCommandEntries } from './pages/portfolioPage.js';
import { renderProgramsPage, programsCommandEntries } from './pages/programsPage.js';
import { renderResourcesPage, resourcesCommandEntries } from './pages/resourcesPage.js';

const appRoot = document.querySelector('[data-app-root]');
const routeRoot = document.querySelector('[data-route-root]');
const leftRailRoot = document.querySelector('[data-left-rail]');
const toastRoot = document.querySelector('[data-toast]');
const settingsRoot = document.querySelector('[data-settings]');

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
    lowestUseCase: 'all',
    hasOpenRequest: false,
    belowThreeGreen: false
  },
  checklistState: {},
  selectedAccountId: storage.get(STORAGE_KEYS.selectedAccountId, '')
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

const applyQueryOverrides = () => {
  const search = new URLSearchParams(window.location.search);
  const route = search.get('route');
  const audience = search.get('audience');

  if (audience === 'customer') {
    state.customerSafe = true;
    storage.set(STORAGE_KEYS.safeMode, true);
  }

  if (!route) return;
  const normalized = route.startsWith('/') ? route : `/${route}`;
  const base = state.basePath.replace(/\/+$/, '');
  window.history.replaceState({}, '', `${base}${normalized}`);
};

const navItems = () => appRoot.querySelectorAll('[data-nav-route]');

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
  const recentAccounts = [...accounts]
    .sort((left, right) => {
      if (left.id === state.selectedAccountId) return -1;
      if (right.id === state.selectedAccountId) return 1;
      return String(left.name || '').localeCompare(String(right.name || ''));
    })
    .slice(0, 8);

  leftRailRoot.innerHTML = `
    <div class="rail-group">
      <p class="rail-label">Operate</p>
      <button class="rail-link ${state.route.name === 'home' ? 'is-active' : ''}" type="button" data-rail-route="home">Work Queue</button>
      <button class="rail-link ${state.route.name === 'portfolio' ? 'is-active' : ''}" type="button" data-rail-route="portfolio">Portfolio</button>
      <button class="rail-link ${state.route.name === 'programs' ? 'is-active' : ''}" type="button" data-rail-route="programs">Programs</button>
      <button class="rail-link ${state.route.name === 'resources' ? 'is-active' : ''}" type="button" data-rail-route="resources">Resources</button>
    </div>

    <div class="rail-group">
      <p class="rail-label">Tools</p>
      <button class="rail-link ${state.route.name === 'intake' ? 'is-active' : ''}" type="button" data-rail-route="intake">Intake</button>
      <button class="rail-link ${state.route.name === 'exports' ? 'is-active' : ''}" type="button" data-rail-route="exports">Exports</button>
      <button class="rail-link ${state.route.name === 'playbooks' ? 'is-active' : ''}" type="button" data-rail-route="playbooks">Playbooks</button>
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
            : '<p class="empty-text">No accounts loaded.</p>'
        }
      </div>
    </div>

    <div class="rail-group">
      <p class="rail-label">Shortcuts</p>
      <ul class="rail-shortcuts">
        <li><kbd>Ctrl</kbd> + <kbd>K</kbd> command palette</li>
        <li>Toggle customer-safe before sharing exports</li>
      </ul>
    </div>
  `;

  leftRailRoot.querySelectorAll('[data-rail-route]').forEach((button) => {
    button.addEventListener('click', () => {
      const routeName = button.getAttribute('data-rail-route');
      router.navigate(routeName);
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

const onLogAttendance = (programId, amount = 1) => {
  updateProgram(programId, (program) => ({
    ...program,
    attendance_count: Math.max(0, Number(program.attendance_count || 0) + Number(amount || 0))
  }));
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
  render();
};

const modal = createModal();
document.body.appendChild(modal.element);

const openMissingEditor = ({ accountId, path, label, type = 'text' }) => {
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

  form.querySelector('[data-cancel]')?.addEventListener('click', () => modal.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = form.elements.namedItem('value').value;
    persistAccountField(accountId, path, value);
    state.data = await loadDashboardData();
    modal.close();
    render();
    notify(`${label} updated.`);
  });

  modal.open({ title: `Update ${label}`, content: form });
};

const renderShellContext = () => {
  const safeToggle = appRoot.querySelector('[data-global-safe-toggle]');
  if (safeToggle) safeToggle.checked = state.customerSafe;

  const modeSelect = appRoot.querySelector('[data-global-mode]');
  if (modeSelect) modeSelect.value = state.viewMode;

  const safeLabel = appRoot.querySelector('[data-safe-label]');
  if (safeLabel) {
    safeLabel.textContent = state.customerSafe ? `Customer-safe mode • ${state.viewMode}` : `Internal mode • ${state.viewMode}`;
  }

  setActiveNav();
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

const commandEntries = (workspace) => {
  const accountEntries = (state.data.accounts || []).map((account) => ({
    id: `account-${account.id}`,
    label: `Open account: ${account.name}`,
    meta: `${account.segment}`,
    action: { route: 'account', params: { id: account.id } }
  }));

  return [
    { id: 'cmd-home', label: 'Open Work Queue', meta: 'Queue', action: { route: 'home' } },
    { id: 'cmd-portfolio', label: 'Open Portfolio Table', meta: 'Portfolio', action: { route: 'portfolio' } },
    { id: 'cmd-programs', label: 'Open Programs', meta: 'Programs', action: { route: 'programs' } },
    { id: 'cmd-playbooks', label: 'Open Playbooks', meta: 'Playbooks', action: { route: 'playbooks' } },
    { id: 'cmd-resources', label: 'Open Resources', meta: 'Resources', action: { route: 'resources' } },
    { id: 'cmd-exports', label: 'Open Exports', meta: 'Exports', action: { route: 'exports' } },
    { id: 'cmd-intake', label: 'Create Intake Request', meta: 'Tools', action: { route: 'intake' } },
    { id: 'cmd-share', label: 'Copy Share Snapshot', meta: 'Exports', action: { custom: copyShareSnapshot } },
    ...portfolioCommandEntries(state.data),
    ...programsCommandEntries(state.data.programs),
    ...playbooksCommandEntries(state.data.playbooks),
    ...resourcesCommandEntries(),
    ...exportsCommandEntries(),
    ...intakeCommandEntries(state.data.accounts),
    ...accountCommandEntries(workspace),
    ...accountEntries
  ];
};

const renderCurrentRoute = () => {
  const route = state.route;
  const portfolio = buildPortfolioView(state.data);

  if (route.name === 'account') {
    if (route.params.id) setSelectedAccount(route.params.id);
    if (!route.params.id && currentAccount()) {
      router.navigate('account', { id: currentAccount().id }, { replace: true });
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
      mode: state.viewMode,
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
      mode: state.viewMode,
      onExportPortfolio: () => exportPortfolioCsv(state.data.accounts, state.data.requests),
      ...common
    });
  }

  if (route.name === 'account') {
    view = renderAccountPage({
      workspace,
      resources: state.data.resources,
      customerSafe: state.customerSafe,
      mode: state.viewMode,
      onToggleSafe: setSafeMode,
      onCopyInvite,
      onExportAccountCsv: (account, options) => exportAccountCsv(account, options),
      onExportAccountPdf: (account, options) => exportAccountSummaryPdf(account, options),
      onOpenMissingEditor: openMissingEditor,
      copyText,
      notify,
      ...common
    });
  }

  if (route.name === 'programs') {
    view = renderProgramsPage({
      programs: state.data.programs,
      mode: state.viewMode,
      onCopyInvite,
      onLogAttendance,
      onAddRegistration,
      notify,
      ...common
    });
  }

  if (route.name === 'playbooks') {
    view = renderPlaybooksPage({
      playbooks: state.data.playbooks,
      customerSafe: state.customerSafe,
      checklistState: state.checklistState,
      mode: state.viewMode,
      onChecklistChange: (playbookId, checkKey, value) => {
        if (!state.checklistState[playbookId]) state.checklistState[playbookId] = {};
        state.checklistState[playbookId][checkKey] = value;
        persistPlaybookChecklist(state.checklistState);
      },
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
  routeRoot.appendChild(view);

  const commands = commandEntries(workspace);
  palette?.setEntries(commands);
};

const render = () => {
  renderShellContext();
  renderLeftRail();
  renderCurrentRoute();
};

state.basePath = detectBasePath(window.location.pathname);
applyQueryOverrides();
const router = createRouter(state.basePath);

const bindGlobalEvents = () => {
  navItems().forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const name = link.getAttribute('data-nav-route');
      if (name === 'account') {
        const targetId = currentAccount()?.id || state.data.accounts?.[0]?.id || '';
        setSelectedAccount(targetId);
        router.navigate('account', { id: targetId });
        return;
      }
      router.navigate(name);
    });
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

  settingsRoot?.querySelectorAll('[data-close-settings]').forEach((item) => {
    item.addEventListener('click', () => {
      settingsRoot.classList.remove('is-open');
      settingsRoot.setAttribute('aria-hidden', 'true');
    });
  });

  settingsRoot?.querySelector('[data-reset-local-state]')?.addEventListener('click', async () => {
    resetLocalState();
    state.checklistState = {};
    state.data = await loadDashboardData();
    settingsRoot.classList.remove('is-open');
    settingsRoot.setAttribute('aria-hidden', 'true');
    notify('Local state reset.');
    render();
  });
};

const init = async () => {
  state.data = await loadDashboardData();
  state.checklistState = loadPlaybookChecklist();

  if (!state.selectedAccountId && state.data.accounts?.length) {
    setSelectedAccount(state.data.accounts[0].id);
  }

  bindGlobalEvents();

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
