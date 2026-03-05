import { renderActionDrawer } from '../components/actionDrawer.js';
import { statusChip } from '../components/statusChip.js';
import { formatDateTime } from '../lib/date.js';

const grouped = (programs) => ({
  webinar: (programs || []).filter((item) => item.type === 'webinar'),
  'hands-on lab': (programs || []).filter((item) => item.type === 'hands-on lab'),
  'office hours': (programs || []).filter((item) => item.type === 'office hours')
});

const accountOptions = (accounts = []) =>
  (accounts || []).map((account) => `<option value="${account.id}">${account.name}</option>`).join('');

const programCard = (item, accounts) => `
  <article class="card compact-card">
    <div class="metric-head">
      <h3>${item.title}</h3>
      ${statusChip({ label: item.type, tone: 'neutral' })}
    </div>
    <p class="muted">${formatDateTime(item.date)}</p>
    <p class="muted">Use cases: ${(item.target_use_cases || []).join(', ')}</p>
    <p class="muted">Registration ${item.registration_count} | Attendance ${item.attendance_count}</p>
    <label>
      Account
      <select data-program-account="${item.program_id}">
        ${accountOptions(accounts)}
      </select>
    </label>
    <div class="page-actions">
      <button class="ghost-btn" type="button" data-open-program="${item.program_id}">Open program</button>
      <button class="ghost-btn" type="button" data-invite-account="${item.program_id}">Invite Account</button>
      <button class="ghost-btn" type="button" data-copy-invite="${item.program_id}">Copy invite blurb</button>
      <button class="ghost-btn" type="button" data-log-attendance="${item.program_id}">Log attendance</button>
      <button class="ghost-btn" type="button" data-add-registration="${item.program_id}">Add registration</button>
    </div>
    <details>
      <summary>Follow-up steps</summary>
      <ul class="simple-list">${(item.followup_steps || []).map((step) => `<li>${step}</li>`).join('')}</ul>
    </details>
  </article>
`;

const programMixVisual = (sets) => {
  const webinar = sets.webinar.length;
  const labs = sets['hands-on lab'].length;
  const officeHours = sets['office hours'].length;
  const total = Math.max(1, webinar + labs + officeHours);
  const width = (value) => Math.max(8, Math.round((value / total) * 100));

  return `
    <section class="card">
      <div class="metric-head">
        <h2>Program Mix</h2>
        ${statusChip({ label: `${total} total`, tone: 'neutral' })}
      </div>
      <div class="mix-chart">
        <div class="mix-row"><span>Webinars</span><div class="mix-bar"><i style="width:${width(webinar)}%"></i></div><strong>${webinar}</strong></div>
        <div class="mix-row"><span>Hands-on Labs</span><div class="mix-bar"><i style="width:${width(labs)}%"></i></div><strong>${labs}</strong></div>
        <div class="mix-row"><span>Office Hours</span><div class="mix-bar"><i style="width:${width(officeHours)}%"></i></div><strong>${officeHours}</strong></div>
      </div>
      <p class="muted">Use this visual to balance 1:many motions across adoption gaps and renewal windows.</p>
    </section>
  `;
};

export const renderProgramsPage = (ctx) => {
  const { programs, accounts, mode, navigate, onCopyInvite, onLogAttendance, onAddRegistration, onInviteAccount, onOpenProgram, notify } = ctx;

  const sets = grouped([...(programs || [])].sort((a, b) => new Date(a.date) - new Date(b.date)));
  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Programs</p>
        <h1>Enablement Motions</h1>
        <p class="hero-lede">Webinars, hands-on labs, and office hours are first-class pooled CSE delivery motions.</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-home>Back to Portfolio</button>
      </div>
    </header>

    <section class="dashboard-grid">
      <div class="main-col">
        <section class="card">
          <div class="metric-head"><h2>Webinars</h2>${statusChip({ label: `${sets.webinar.length} items`, tone: 'neutral' })}</div>
          <div class="main-col">${sets.webinar.map((item) => programCard(item, accounts)).join('') || '<p class="empty-text">No webinars scheduled.</p>'}</div>
        </section>

        ${programMixVisual(sets)}

        <section class="card">
          <div class="metric-head"><h2>Hands-on Labs</h2>${statusChip({ label: `${sets['hands-on lab'].length} items`, tone: 'neutral' })}</div>
          <div class="main-col">${sets['hands-on lab'].map((item) => programCard(item, accounts)).join('') || '<p class="empty-text">No labs scheduled.</p>'}</div>
        </section>

        <section class="card">
          <div class="metric-head"><h2>Office Hours</h2>${statusChip({ label: `${sets['office hours'].length} items`, tone: 'neutral' })}</div>
          <div class="main-col">${sets['office hours'].map((item) => programCard(item, accounts)).join('') || '<p class="empty-text">No office hours scheduled.</p>'}</div>
        </section>
      </div>

      <div></div>
      <div data-drawer-host></div>
    </section>
  `;

  const drawer = renderActionDrawer({
    title: 'Programs Action Drawer',
    mode,
    nextActions: [
      'Copy invite blurb for upcoming program',
      'Log attendance immediately after session',
      'Route attendees to account follow-up workflow'
    ],
    dueSoon: (programs || []).slice(0, 4).map((item) => `${item.title} (${formatDateTime(item.date)})`),
    riskSignals: ['Low attendance trend', 'Missing follow-up mapping', 'No program mapped to low use-case'],
    onGenerateAgenda: () => navigate('intake'),
    onGenerateEmail: () => navigate('intake'),
    onGenerateIssue: () => navigate('intake'),
    onExportPortfolio: () => navigate('exports'),
    onExportAccount: () => navigate('exports'),
    onExportSummary: () => navigate('exports')
  });
  wrapper.querySelector('[data-drawer-host]').appendChild(drawer);

  wrapper.querySelector('[data-go-home]')?.addEventListener('click', () => navigate('home'));

  const selectedProgramAccount = (programId) => {
    const selector = wrapper.querySelector(`[data-program-account="${programId}"]`);
    return selector?.value || '';
  };

  wrapper.addEventListener('click', (event) => {
    const openProgram = event.target.closest('[data-open-program]');
    if (openProgram) {
      const programId = openProgram.getAttribute('data-open-program');
      onOpenProgram?.(programId);
      return;
    }

    const inviteAccount = event.target.closest('[data-invite-account]');
    if (inviteAccount) {
      const programId = inviteAccount.getAttribute('data-invite-account');
      const accountId = selectedProgramAccount(programId);
      if (!accountId) return;
      onInviteAccount(programId, accountId);
      return;
    }

    const invite = event.target.closest('[data-copy-invite]');
    if (invite) {
      onCopyInvite(invite.getAttribute('data-copy-invite'));
      return;
    }

    const attendance = event.target.closest('[data-log-attendance]');
    if (attendance) {
      const programId = attendance.getAttribute('data-log-attendance');
      onLogAttendance(programId, 1, selectedProgramAccount(programId));
      notify('Attendance updated.');
      return;
    }

    const registration = event.target.closest('[data-add-registration]');
    if (registration) {
      onAddRegistration(registration.getAttribute('data-add-registration'), 1);
      notify('Registration updated.');
    }
  });

  return wrapper;
};

export const programsCommandEntries = (programs = []) => [
  { id: 'programs-open', label: 'Open programs', meta: 'Programs', action: { route: 'programs' } },
  ...(programs || []).map((program) => ({
    id: `program-${program.program_id}`,
    label: `Program: ${program.title}`,
    meta: `${program.type}`,
    action: { route: 'program', params: { id: program.program_id } }
  }))
];
