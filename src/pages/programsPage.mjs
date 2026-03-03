import { renderActionDrawer } from '../components/actionDrawer.mjs';
import { statusChip } from '../components/statusChip.mjs';
import { formatDateTime } from '../lib/date.mjs';

const grouped = (programs) => ({
  webinar: (programs || []).filter((item) => item.type === 'webinar'),
  'hands-on lab': (programs || []).filter((item) => item.type === 'hands-on lab'),
  'office hours': (programs || []).filter((item) => item.type === 'office hours')
});

const programCard = (item) => `
  <article class="card compact-card">
    <div class="metric-head">
      <h3>${item.title}</h3>
      ${statusChip({ label: item.type, tone: 'neutral' })}
    </div>
    <p class="muted">${formatDateTime(item.date)}</p>
    <p class="muted">Use cases: ${(item.target_use_cases || []).join(', ')}</p>
    <p class="muted">Registration ${item.registration_count} | Attendance ${item.attendance_count}</p>
    <div class="page-actions">
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

export const renderProgramsPage = (ctx) => {
  const { programs, mode, navigate, onCopyInvite, onLogAttendance, onAddRegistration, notify } = ctx;

  const sets = grouped([...(programs || [])].sort((a, b) => new Date(a.date) - new Date(b.date)));
  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
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
          <div class="main-col">${sets.webinar.map(programCard).join('') || '<p class="empty-text">No webinars scheduled.</p>'}</div>
        </section>

        <section class="card">
          <div class="metric-head"><h2>Hands-on Labs</h2>${statusChip({ label: `${sets['hands-on lab'].length} items`, tone: 'neutral' })}</div>
          <div class="main-col">${sets['hands-on lab'].map(programCard).join('') || '<p class="empty-text">No labs scheduled.</p>'}</div>
        </section>

        <section class="card">
          <div class="metric-head"><h2>Office Hours</h2>${statusChip({ label: `${sets['office hours'].length} items`, tone: 'neutral' })}</div>
          <div class="main-col">${sets['office hours'].map(programCard).join('') || '<p class="empty-text">No office hours scheduled.</p>'}</div>
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

  wrapper.addEventListener('click', (event) => {
    const invite = event.target.closest('[data-copy-invite]');
    if (invite) {
      onCopyInvite(invite.getAttribute('data-copy-invite'));
      return;
    }

    const attendance = event.target.closest('[data-log-attendance]');
    if (attendance) {
      onLogAttendance(attendance.getAttribute('data-log-attendance'), 1);
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
    action: { route: 'programs' }
  }))
];
