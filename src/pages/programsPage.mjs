import { formatDateTime } from '../lib/date.mjs';

const byDateAsc = (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime();

const programCard = (program) => `
  <article class="card program-card" data-program-id="${program.program_id}">
    <div class="metric-head">
      <h3>${program.title}</h3>
      <span class="status-pill" data-status="good">${program.type}</span>
    </div>
    <p class="muted">${formatDateTime(program.date)}</p>
    <p class="muted">Target use cases: ${(program.target_use_cases || []).join(', ')}</p>
    <div class="program-metrics">
      <div><span class="metric-label">Registrations</span><strong>${program.registration_count}</strong></div>
      <div><span class="metric-label">Attendance</span><strong>${program.attendance_count}</strong></div>
    </div>
    <div class="inline-actions">
      <button class="ghost-btn" type="button" data-copy-invite="${program.program_id}">Copy invite blurb</button>
      <button class="ghost-btn" type="button" data-log-attendance="${program.program_id}">Log attendance</button>
      <button class="ghost-btn" type="button" data-add-registration="${program.program_id}">Add registration</button>
    </div>
  </article>
`;

export const renderProgramsPage = (ctx) => {
  const { programs, navigate, onCopyInvite, onLogAttendance, onAddRegistration, notify } = ctx;
  const sorted = [...(programs || [])].sort(byDateAsc);

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Programs</p>
        <h1>1:many CSE Delivery Programs</h1>
        <p class="hero-lede">
          Webinars, hands-on labs, and office hours are first-class pooled levers for faster technical adoption.
        </p>
        <p class="muted hint-text">
          Handbook intent: drive repeatable adoption outcomes through pooled programming before one-off account motions.
        </p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-portfolio>Back to portfolio</button>
      </div>
    </header>

    <section class="card">
      <div class="metric-head">
        <h2>Upcoming programs</h2>
        <span class="status-pill" data-status="watch">${sorted.length} scheduled</span>
      </div>
      <div class="program-grid">
        ${sorted.length ? sorted.map(programCard).join('') : '<p class="empty-text">No programs scheduled.</p>'}
      </div>
    </section>
  `;

  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));

  wrapper.addEventListener('click', (event) => {
    const invite = event.target.closest('[data-copy-invite]');
    if (invite) {
      onCopyInvite(invite.getAttribute('data-copy-invite'));
      return;
    }

    const attendance = event.target.closest('[data-log-attendance]');
    if (attendance) {
      const id = attendance.getAttribute('data-log-attendance');
      onLogAttendance(id, 1);
      notify('Attendance logged.');
      return;
    }

    const registration = event.target.closest('[data-add-registration]');
    if (registration) {
      const id = registration.getAttribute('data-add-registration');
      onAddRegistration(id, 1);
      notify('Registration count updated.');
    }
  });

  return wrapper;
};

export const programsCommandEntries = (programs = []) =>
  (programs || []).map((program) => ({
    id: `program-${program.program_id}`,
    label: `Program: ${program.title}`,
    meta: `${program.type} | ${formatDateTime(program.date)}`,
    action: { route: 'programs' }
  }));
