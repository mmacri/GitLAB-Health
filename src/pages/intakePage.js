import { buildCustomerAgenda, buildFollowupEmail, buildIssueBody } from '../lib/artifacts.js';
import { formatDate, toIsoDate } from '../lib/date.js';
import { storage, STORAGE_KEYS } from '../lib/storage.js';
import { statusChip } from '../components/statusChip.js';

const REQUESTOR_ROLES = ['Account Executive', 'Renewals Manager'];
const STAGES = ['onboard', 'enable', 'expand', 'optimize', 'renew'];
const TOPICS = ['SCM', 'CI', 'CD', 'Secure', 'platform foundations'];

const safeText = (value) => String(value || '').trim();

const nextRequestId = (requests = []) => {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  let max = 0;
  requests.forEach((request) => {
    const id = String(request.request_id || '');
    if (!id.startsWith(prefix)) return;
    const seq = Number(id.slice(prefix.length));
    if (Number.isFinite(seq)) max = Math.max(max, seq);
  });
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
};

const renderAccountOptions = (accounts = []) =>
  accounts
    .map((account) => `<option value="${account.id}">${account.name} (${account.segment})</option>`)
    .join('');

const defaultDraft = (accounts = []) => ({
  requestor_role: REQUESTOR_ROLES[0],
  account_id: accounts[0]?.id || '',
  stage: 'enable',
  topic: 'CI',
  desired_outcome: '',
  definition_of_done: '',
  due_date: toIsoDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)),
  notes: ''
});

const loadDraft = (accounts) => {
  const stored = storage.get(STORAGE_KEYS.intakeDraft, null);
  if (!stored || typeof stored !== 'object') return defaultDraft(accounts);
  return {
    ...defaultDraft(accounts),
    ...stored
  };
};

const artifactCard = (title, key, value) => `
  <article class="card compact-card">
    <div class="metric-head">
      <h3>${title}</h3>
      <button class="ghost-btn" type="button" data-copy-artifact="${key}">Copy</button>
    </div>
    <textarea class="artifact" readonly data-artifact="${key}">${value || ''}</textarea>
  </article>
`;

const renderArtifacts = (container, artifacts) => {
  const root = container.querySelector('[data-artifacts-root]');
  if (!root) return;

  root.innerHTML = `
    ${artifactCard('Collaboration issue body (GitLab markdown)', 'issue', artifacts.issue)}
    ${artifactCard('Customer-safe meeting agenda', 'agenda', artifacts.agenda)}
    ${artifactCard('Customer-safe follow-up email', 'email', artifacts.email)}
  `;
};

export const renderIntakePage = (ctx) => {
  const { data, requests, navigate, onCreateRequest, copyText, notify } = ctx;
  const accounts = data.accounts || [];
  const state = {
    draft: loadDraft(accounts),
    artifacts: null
  };

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page';
  wrapper.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Intake</p>
        <h1>Engagement Request Form</h1>
        <p class="hero-lede">
          Create pooled CSE intake that can be triaged quickly and executed through 1:many programs plus focused account follow-up.
        </p>
        <p class="muted hint-text">
          Handbook intent: CSEs are technical SMEs in a pooled on-demand model; define outcomes and done criteria before assignment.
        </p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-portfolio>Back to portfolio</button>
      </div>
    </header>

    <section class="card">
      <form class="form-grid" data-intake-form>
        <label>
          <span>Requestor role</span>
          <select name="requestor_role">
            ${REQUESTOR_ROLES.map((role) => `<option value="${role}">${role}</option>`).join('')}
          </select>
        </label>
        <label>
          <span>Account</span>
          <select name="account_id">${renderAccountOptions(accounts)}</select>
        </label>
        <label>
          <span>Lifecycle stage</span>
          <select name="stage">${STAGES.map((stage) => `<option value="${stage}">${stage}</option>`).join('')}</select>
        </label>
        <label>
          <span>Topic</span>
          <select name="topic">${TOPICS.map((topic) => `<option value="${topic}">${topic}</option>`).join('')}</select>
        </label>
        <label class="form-span">
          <span>Desired outcome</span>
          <textarea name="desired_outcome" rows="3" required placeholder="Example: Lift CI adoption from 49 to 65 before renewal review."></textarea>
        </label>
        <label class="form-span">
          <span>Definition of done</span>
          <textarea name="definition_of_done" rows="3" required placeholder="Example: CI score >= 65 and executive-ready evidence package delivered."></textarea>
        </label>
        <label>
          <span>Due date</span>
          <input type="date" name="due_date" required />
        </label>
        <label class="form-span">
          <span>Attach notes</span>
          <textarea name="notes" rows="3" placeholder="Context, dependencies, and constraints."></textarea>
        </label>
        <div class="form-actions form-span">
          <button class="qa" type="submit">Submit request</button>
          <button class="ghost-btn" type="button" data-clear-draft>Clear draft</button>
        </div>
      </form>
    </section>

    <section class="card">
      <div class="metric-head">
        <h2>Generated Artifacts</h2>
        ${statusChip({ label: 'Generated on submit', tone: 'warn' })}
      </div>
      <p class="muted">After submit, copy these outputs directly into collaboration issue, customer agenda, and follow-up channels.</p>
      <div class="artifact-grid" data-artifacts-root>
        <p class="empty-text">Submit a request to generate issue body, agenda, and follow-up email templates.</p>
      </div>
    </section>
  `;

  const form = wrapper.querySelector('[data-intake-form]');
  const setFieldValues = () => {
    if (!form) return;
    Object.entries(state.draft).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (!field) return;
      field.value = value || '';
    });
  };

  const persistDraft = () => {
    storage.set(STORAGE_KEYS.intakeDraft, state.draft);
  };

  const collectDraft = () => {
    if (!form) return;
    const values = Object.fromEntries(new FormData(form).entries());
    state.draft = {
      ...state.draft,
      ...values
    };
    persistDraft();
  };

  setFieldValues();

  form?.addEventListener('input', collectDraft);
  form?.addEventListener('change', collectDraft);

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    collectDraft();

    const request = {
      request_id: nextRequestId(requests),
      account_id: safeText(state.draft.account_id),
      requestor_role: safeText(state.draft.requestor_role),
      topic: safeText(state.draft.topic),
      stage: safeText(state.draft.stage),
      desired_outcome: safeText(state.draft.desired_outcome),
      definition_of_done: safeText(state.draft.definition_of_done),
      due_date: safeText(state.draft.due_date),
      status: 'new',
      assigned_to: 'Unassigned',
      notes: safeText(state.draft.notes),
      created_on: toIsoDate(new Date())
    };

    const account = accounts.find((item) => item.id === request.account_id);
    const artifacts = {
      issue: buildIssueBody(request, account),
      agenda: buildCustomerAgenda(request, account),
      email: buildFollowupEmail(request, account)
    };

    state.artifacts = artifacts;
    renderArtifacts(wrapper, artifacts);
    onCreateRequest(request);
    notify(`Request ${request.request_id} added for ${account?.name || request.account_id}.`);
  });

  wrapper.querySelector('[data-clear-draft]')?.addEventListener('click', () => {
    state.draft = defaultDraft(accounts);
    storage.remove(STORAGE_KEYS.intakeDraft);
    setFieldValues();
    notify('Intake draft cleared.');
  });

  wrapper.querySelector('[data-go-portfolio]')?.addEventListener('click', () => navigate('portfolio'));

  wrapper.addEventListener('click', (event) => {
    const button = event.target.closest('[data-copy-artifact]');
    if (!button) return;
    const key = button.getAttribute('data-copy-artifact');
    const text = state.artifacts?.[key];
    if (!text) return;
    copyText(text).then(() => notify(`${key} copied to clipboard.`));
  });

  return wrapper;
};

export const intakeCommandEntries = (accounts = []) => [
  {
    id: 'intake-back-portfolio',
    label: 'Back to pooled portfolio',
    meta: 'Portfolio',
    action: { route: 'portfolio' }
  },
  ...accounts.map((account) => ({
    id: `intake-open-${account.id}`,
    label: `Open account: ${account.name}`,
    meta: `Renewal ${formatDate(account.renewal_date)}`,
    action: { route: 'account', params: { id: account.id } }
  }))
];
