import { createCommandPalette } from './components/commandPalette.mjs';
import { createRouter, detectBasePath } from './lib/router.mjs';
import { loadDashboardData, persistProgram, persistRequests } from './lib/dataLoader.mjs';
import { exportAccountCsv, exportAccountSummaryPdf, exportPortfolioCsv } from './lib/exports.mjs';
import { buildAccountWorkspace, buildPortfolioView } from './lib/scoring.mjs';
import { storage, STORAGE_KEYS } from './lib/storage.mjs';
import { formatDateTime } from './lib/date.mjs';
import { renderPortfolioPage, portfolioCommandEntries } from './pages/portfolioPage.mjs';
import { renderIntakePage, intakeCommandEntries } from './pages/intakePage.mjs';
import { renderProgramsPage, programsCommandEntries } from './pages/programsPage.mjs';
import { renderResourcesPage, resourcesCommandEntries } from './pages/resourcesPage.mjs';
import { accountCommandEntries, renderAccountPage } from './pages/accountPage.mjs';

const appRoot = document.querySelector('[data-app-root]');
const routeRoot = document.querySelector('[data-route-root]');
const toastRoot = document.querySelector('[data-toast]');

if (!appRoot || !routeRoot) {
  throw new Error('App shell is missing required mount points.');
}

const state = {
  data: null,
  route: { name: 'portfolio', params: {}, path: '/' },
  customerSafe: Boolean(storage.get(STORAGE_KEYS.safeMode, false)),
  basePath: '',
  commandEntries: []
};

const showToast = (message) => {
  if (!toastRoot) return;
  toastRoot.textContent = message;
  toastRoot.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toastRoot.classList.remove('is-visible'), 1800);
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

const setSafeMode = (value) => {
  state.customerSafe = Boolean(value);
  storage.set(STORAGE_KEYS.safeMode, state.customerSafe);
  render();
};

const applyRouteFromQuery = () => {
  const search = new URLSearchParams(window.location.search);
  const route = search.get('route');
  if (!route) return;
  const normalized = route.startsWith('/') ? route : `/${route}`;
  const base = state.basePath.replace(/\/+$/, '');
  window.history.replaceState({}, '', `${base}${normalized}`);
};

const navItems = () => appRoot.querySelectorAll('[data-nav-route]');

const setActiveNav = () => {
  navItems().forEach((link) => {
    const route = link.getAttribute('data-nav-route');
    const active = route === state.route.name || (route === 'portfolio' && state.route.name === 'portfolio');
    link.classList.toggle('is-active', active);
  });
};

const findProgram = (programId) => state.data.programs.find((program) => program.program_id === programId) || null;

const inviteBlurb = (program) =>
  [
    `Join our GitLab ${program.type} session: ${program.title}`,
    `When: ${formatDateTime(program.date)}`,
    `Focus use cases: ${(program.target_use_cases || []).join(', ')}`,
    'Hosted by the pooled CSE On-Demand team.'
  ].join('\n');

const updateProgram = (programId, updater) => {
  const index = state.data.programs.findIndex((program) => program.program_id === programId);
  if (index === -1) return;
  const current = state.data.programs[index];
  const updated = updater(current);
  state.data.programs[index] = updated;
  persistProgram(updated);
  render();
};

const onCopyInvite = async (programId) => {
  const program = findProgram(programId);
  if (!program) return;
  await copyText(inviteBlurb(program));
  showToast(`Invite copied for ${program.title}.`);
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

const renderShellContext = () => {
  const safeToggle = appRoot.querySelector('[data-global-safe-toggle]');
  if (safeToggle) safeToggle.checked = state.customerSafe;
  const modeLabel = appRoot.querySelector('[data-safe-label]');
  if (modeLabel) modeLabel.textContent = state.customerSafe ? 'Customer-safe mode is ON' : 'Internal mode is ON';
  setActiveNav();
};

let palette = null;

const setCommandEntries = (entries) => {
  state.commandEntries = entries;
  palette?.setEntries(entries);
};

const buildGlobalCommands = () => [
  { id: 'go-portfolio', label: 'Open portfolio', meta: 'Portfolio', action: { route: 'portfolio' } },
  { id: 'go-intake', label: 'Create intake request', meta: 'Intake', action: { route: 'intake' } },
  { id: 'go-programs', label: 'Open programs', meta: 'Programs', action: { route: 'programs' } },
  { id: 'go-resources', label: 'Open resources', meta: 'Resources', action: { route: 'resources' } }
];

const handleRouteRender = () => {
  const route = state.route;
  const portfolio = buildPortfolioView(state.data);
  let view = null;
  let commands = [...buildGlobalCommands(), ...portfolioCommandEntries(state.data)];

  if (route.name === 'portfolio') {
    view = renderPortfolioPage({
      data: state.data,
      portfolio,
      customerSafe: state.customerSafe,
      navigate: (name, params) => router.navigate(name, params),
      onToggleSafe: setSafeMode,
      onExportPortfolio: () => exportPortfolioCsv(state.data.accounts, state.data.requests),
      onCopyInvite,
      onLogAttendance
    });
  }

  if (route.name === 'intake') {
    view = renderIntakePage({
      data: state.data,
      requests: state.data.requests,
      navigate: (name, params) => router.navigate(name, params),
      onCreateRequest,
      copyText,
      notify: showToast
    });
    commands = [...commands, ...intakeCommandEntries(state.data.accounts)];
  }

  if (route.name === 'programs') {
    view = renderProgramsPage({
      programs: state.data.programs,
      navigate: (name, params) => router.navigate(name, params),
      onCopyInvite,
      onLogAttendance,
      onAddRegistration,
      notify: showToast
    });
    commands = [...commands, ...programsCommandEntries(state.data.programs)];
  }

  if (route.name === 'resources') {
    view = renderResourcesPage({
      resources: state.data.resources,
      categories: state.data.categories,
      customerSafe: state.customerSafe,
      navigate: (name, params) => router.navigate(name, params)
    });
    commands = [...commands, ...resourcesCommandEntries()];
  }

  if (route.name === 'account') {
    const workspace = buildAccountWorkspace(state.data, route.params.id);
    view = renderAccountPage({
      workspace,
      resources: state.data.resources,
      customerSafe: state.customerSafe,
      navigate: (name, params) => router.navigate(name, params),
      onToggleSafe: setSafeMode,
      onCopyInvite,
      onExportAccountCsv: (account, options) => exportAccountCsv(account, options),
      onExportAccountPdf: (account, options) => exportAccountSummaryPdf(account, options),
      copyText,
      notify: showToast
    });
    commands = [...commands, ...accountCommandEntries(workspace)];
  }

  routeRoot.innerHTML = '';
  routeRoot.appendChild(view);
  setCommandEntries(commands);
};

const render = () => {
  renderShellContext();
  handleRouteRender();
};

state.basePath = detectBasePath(window.location.pathname);
applyRouteFromQuery();
const router = createRouter(state.basePath);

const bindGlobalEvents = () => {
  navItems().forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const route = link.getAttribute('data-nav-route');
      router.navigate(route);
    });
  });

  appRoot.querySelector('[data-global-safe-toggle]')?.addEventListener('change', (event) => {
    setSafeMode(Boolean(event.target.checked));
  });
};

const init = async () => {
  state.data = await loadDashboardData();
  bindGlobalEvents();

  palette = createCommandPalette({
    onSelect(entry) {
      if (!entry?.action) return;
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
