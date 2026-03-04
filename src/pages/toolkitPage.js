import { createModal } from '../components/modal.js';
import { metricTile } from '../components/metricTile.js';
import { statusChip } from '../components/statusChip.js';
import { formatDate, toIsoDate } from '../lib/date.js';
import { triggerDownload } from '../lib/exports.js';
import { addEngagementLogEntry, buildEngagementLogCsv, buildEngagementLogJson, loadEngagementLog } from '../lib/engagementLog.js';
import {
  buildCollaborationIssueBody,
  buildExecutiveSnapshotMarkdown,
  buildGitLabIssueDraftUrl,
  buildRenewalChecklistMarkdown,
  buildSuccessPlanMarkdown,
  buildWorkshopPlanMarkdown,
  parseMultilineItems
} from '../lib/toolkit.js';
import { storage, STORAGE_KEYS } from '../lib/storage.js';

let toolkitModal = null;

const ensureToolkitModal = () => {
  if (toolkitModal) return toolkitModal;
  toolkitModal = createModal();
  document.body.appendChild(toolkitModal.element);
  return toolkitModal;
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const accountOptions = (accounts = [], selectedId = '', includeNone = true) =>
  [
    includeNone ? `<option value="">No account context</option>` : '',
    ...(accounts || []).map((account) => `<option value="${account.id}" ${account.id === selectedId ? 'selected' : ''}>${account.name}</option>`)
  ]
    .filter(Boolean)
    .join('');

const byId = (accounts, id) => (accounts || []).find((item) => item.id === id) || null;
const asFilename = (value, fallback = 'artifact') => String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-');

const openPrintWindow = (title, markdown) => {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=920,height=700');
  if (!win) return false;
  win.document.open();
  win.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
      h1 { margin-top: 0; font-size: 24px; }
      pre { white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
      .meta { color: #6b7280; margin-bottom: 14px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">Generated ${escapeHtml(formatDate(new Date()))}</p>
    <pre>${escapeHtml(markdown)}</pre>
  </body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
  return true;
};

const parseMilestones = (value) =>
  parseMultilineItems(value).map((line) => {
    const [datePart, ...descriptionParts] = line.split('|');
    return { date: datePart?.trim() || '', description: descriptionParts.join('|').trim() || line };
  });

const getGitLabConfig = () => storage.get(STORAGE_KEYS.gitlabConfig, { baseUrl: 'https://gitlab.com', projectPath: '' });
const setGitLabConfig = (value) => storage.set(STORAGE_KEYS.gitlabConfig, value);

const openSuccessPlanModal = ({ accounts, templates, defaultAccountId, copyText, notify, customerSafe }) => {
  const modal = ensureToolkitModal();
  const defaults = templates || {};
  const form = document.createElement('form');
  const today = toIsoDate(new Date());
  form.className = 'form-grid';
  form.innerHTML = `
    <label class="form-span">
      Account
      <select name="account_id">${accountOptions(accounts, defaultAccountId || '', true)}</select>
    </label>
    <label>
      Lifecycle stage
      <input name="stage" type="text" value="enable" />
    </label>
    <label>
      Milestones (YYYY-MM-DD | description)
      <textarea name="milestones">${today} | Confirm plan owners and timeline</textarea>
    </label>
    <label>
      Objectives (one per line)
      <textarea name="objectives">${(defaults.success_plan_objectives || []).join('\n')}</textarea>
    </label>
    <label>
      Success metrics (one per line)
      <textarea name="metrics">${(defaults.success_plan_metrics || []).join('\n')}</textarea>
    </label>
    <label>
      Initiatives (one per line)
      <textarea name="initiatives">${(defaults.success_plan_initiatives || []).join('\n')}</textarea>
    </label>
    <label class="form-span">
      Preview
      <textarea name="preview" class="artifact" readonly></textarea>
    </label>
    <div class="form-actions form-span">
      <button class="qa" type="button" data-copy>Copy Markdown</button>
      <button class="ghost-btn" type="button" data-download>Download .md</button>
      <button class="ghost-btn" type="button" data-open-issue>Open New Issue Draft</button>
    </div>
  `;

  const build = () => {
    const accountId = form.elements.namedItem('account_id').value;
    const account = byId(accounts, accountId);
    const markdown = buildSuccessPlanMarkdown({
      account,
      lifecycleStage: form.elements.namedItem('stage').value,
      objectives: parseMultilineItems(form.elements.namedItem('objectives').value),
      successMetrics: parseMultilineItems(form.elements.namedItem('metrics').value),
      initiatives: parseMultilineItems(form.elements.namedItem('initiatives').value),
      milestones: parseMilestones(form.elements.namedItem('milestones').value)
    });
    form.elements.namedItem('preview').value = markdown;
    return { markdown, account };
  };

  build();
  ['account_id', 'stage', 'objectives', 'metrics', 'initiatives', 'milestones'].forEach((name) => {
    form.elements.namedItem(name).addEventListener('input', build);
    form.elements.namedItem(name).addEventListener('change', build);
  });

  form.querySelector('[data-copy]')?.addEventListener('click', async () => {
    const { markdown } = build();
    await copyText(markdown);
    notify('Success plan markdown copied.');
  });

  form.querySelector('[data-download]')?.addEventListener('click', () => {
    const { markdown, account } = build();
    triggerDownload(`success-plan-${asFilename(account?.name || 'general')}.md`, markdown, 'text/markdown;charset=utf-8');
  });

  form.querySelector('[data-open-issue]')?.addEventListener('click', () => {
    const { markdown, account } = build();
    const config = getGitLabConfig();
    const title = `Success Plan | ${account?.name || 'General'}`;
    const url = buildGitLabIssueDraftUrl({
      baseUrl: config.baseUrl,
      projectPath: config.projectPath,
      title,
      body: markdown
    });
    if (!url) {
      notify('Set GitLab base URL and project path in Collaboration Issue Generator.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    notify(customerSafe ? 'Customer-safe issue draft opened.' : 'Issue draft opened.');
  });

  modal.open({ title: 'Customer Success Plan Generator', content: form });
};

const openExecutiveSnapshotModal = ({ accounts, defaultAccountId, copyText, notify, customerSafe, templates }) => {
  const modal = ensureToolkitModal();
  const defaults = templates || {};
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `
    <label class="form-span">
      Account
      <select name="account_id" required>${accountOptions(accounts, defaultAccountId || '', false)}</select>
    </label>
    <label class="form-span">
      Next steps (one per line)
      <textarea name="steps">${(defaults.renewal_next_steps || []).join('\n')}</textarea>
    </label>
    <label class="form-span">
      Preview
      <textarea name="preview" class="artifact" readonly></textarea>
    </label>
    <div class="form-actions form-span">
      <button class="qa" type="button" data-copy>Copy Markdown</button>
      <button class="ghost-btn" type="button" data-download>Download .md</button>
      <button class="ghost-btn" type="button" data-pdf>Export PDF</button>
    </div>
  `;

  const build = () => {
    const account = byId(accounts, form.elements.namedItem('account_id').value) || accounts[0] || null;
    const markdown = buildExecutiveSnapshotMarkdown({
      account,
      nextSteps: parseMultilineItems(form.elements.namedItem('steps').value),
      customerSafe
    });
    form.elements.namedItem('preview').value = markdown;
    return { markdown, account };
  };

  build();
  form.elements.namedItem('account_id').addEventListener('change', build);
  form.elements.namedItem('steps').addEventListener('input', build);

  form.querySelector('[data-copy]')?.addEventListener('click', async () => {
    const { markdown } = build();
    await copyText(markdown);
    notify('Executive snapshot copied.');
  });

  form.querySelector('[data-download]')?.addEventListener('click', () => {
    const { markdown, account } = build();
    triggerDownload(`executive-snapshot-${asFilename(account?.name || 'account')}.md`, markdown, 'text/markdown;charset=utf-8');
  });

  form.querySelector('[data-pdf]')?.addEventListener('click', () => {
    const { markdown, account } = build();
    openPrintWindow(`Executive Adoption Snapshot - ${account?.name || 'Account'}`, markdown);
    notify('Snapshot print view opened for PDF save.');
  });

  modal.open({ title: 'Executive Adoption Snapshot Generator', content: form });
};

const openWorkshopPlanModal = ({ accounts, templates, defaultAccountId, copyText, notify }) => {
  const modal = ensureToolkitModal();
  const defaults = templates || {};
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `
    <label>
      Account
      <select name="account_id">${accountOptions(accounts, defaultAccountId || '', true)}</select>
    </label>
    <label>
      Workshop type
      <select name="workshop_type">
        <option value="CI/CD">CI/CD</option>
        <option value="Secure">Secure</option>
        <option value="SCM">SCM</option>
        <option value="Platform Foundations">Platform Foundations</option>
      </select>
    </label>
    <label>
      Audience roles (one per line)
      <textarea name="audience">Engineering Manager
Platform Team Lead</textarea>
    </label>
    <label>
      Prerequisites (one per line)
      <textarea name="prerequisites">${(defaults.workshop_prerequisites || []).join('\n')}</textarea>
    </label>
    <label class="form-span">
      Preview
      <textarea name="preview" class="artifact" readonly></textarea>
    </label>
    <div class="form-actions form-span">
      <button class="qa" type="button" data-copy>Copy Markdown</button>
      <button class="ghost-btn" type="button" data-download>Download .md</button>
    </div>
  `;

  const build = () => {
    const account = byId(accounts, form.elements.namedItem('account_id').value);
    const markdown = buildWorkshopPlanMarkdown({
      account,
      workshopType: form.elements.namedItem('workshop_type').value,
      audienceRoles: parseMultilineItems(form.elements.namedItem('audience').value),
      prerequisites: parseMultilineItems(form.elements.namedItem('prerequisites').value)
    });
    form.elements.namedItem('preview').value = markdown;
    return { markdown, account };
  };

  build();
  ['account_id', 'workshop_type', 'audience', 'prerequisites'].forEach((name) => {
    form.elements.namedItem(name).addEventListener('input', build);
    form.elements.namedItem(name).addEventListener('change', build);
  });

  form.querySelector('[data-copy]')?.addEventListener('click', async () => {
    const { markdown } = build();
    await copyText(markdown);
    notify('Workshop plan copied.');
  });

  form.querySelector('[data-download]')?.addEventListener('click', () => {
    const { markdown } = build();
    triggerDownload(`workshop-plan-${asFilename(form.elements.namedItem('workshop_type').value)}.md`, markdown, 'text/markdown;charset=utf-8');
  });

  modal.open({ title: 'Workshop Planning Toolkit', content: form });
};

const openRenewalChecklistModal = ({ accounts, defaultAccountId, copyText, notify }) => {
  const modal = ensureToolkitModal();
  const account = byId(accounts, defaultAccountId) || accounts[0] || null;
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `
    <label class="form-span">
      Account
      <select name="account_id">${accountOptions(accounts, account?.id || '', false)}</select>
    </label>
    <label>
      Renewal date
      <input name="renewal_date" type="date" value="${account?.renewal_date || ''}" />
    </label>
    <label>
      Health
      <input name="health" type="text" value="${account?.health?.overall || ''}" />
    </label>
    <label>
      Executive sponsor status
      <input name="exec_sponsor" type="text" value="Confirmed" />
    </label>
    <label>
      Value proof status
      <input name="value_proof" type="text" value="${account?.outcomes?.validation_status || 'Internal estimate'}" />
    </label>
    <label class="form-span">
      Preview
      <textarea name="preview" class="artifact" readonly></textarea>
    </label>
    <div class="form-actions form-span">
      <button class="qa" type="button" data-copy>Copy Markdown</button>
      <button class="ghost-btn" type="button" data-download>Download .md</button>
      <button class="ghost-btn" type="button" data-pdf>Export PDF</button>
    </div>
  `;

  const build = () => {
    const selected = byId(accounts, form.elements.namedItem('account_id').value) || account;
    const markdown = buildRenewalChecklistMarkdown({
      account: selected,
      renewalDate: form.elements.namedItem('renewal_date').value,
      health: form.elements.namedItem('health').value,
      execSponsorStatus: form.elements.namedItem('exec_sponsor').value,
      valueProofStatus: form.elements.namedItem('value_proof').value
    });
    form.elements.namedItem('preview').value = markdown;
    return { markdown, account: selected };
  };

  build();
  ['account_id', 'renewal_date', 'health', 'exec_sponsor', 'value_proof'].forEach((name) => {
    form.elements.namedItem(name).addEventListener('input', build);
    form.elements.namedItem(name).addEventListener('change', build);
  });

  form.querySelector('[data-copy]')?.addEventListener('click', async () => {
    const { markdown } = build();
    await copyText(markdown);
    notify('Renewal checklist copied.');
  });
  form.querySelector('[data-download]')?.addEventListener('click', () => {
    const { markdown, account: selected } = build();
    triggerDownload(`renewal-checklist-${asFilename(selected?.name || 'account')}.md`, markdown, 'text/markdown;charset=utf-8');
  });
  form.querySelector('[data-pdf]')?.addEventListener('click', () => {
    const { markdown, account: selected } = build();
    openPrintWindow(`Renewal Readiness Checklist - ${selected?.name || 'Account'}`, markdown);
    notify('Checklist print view opened for PDF save.');
  });

  modal.open({ title: 'Renewal Readiness Checklist', content: form });
};

const openIssueGeneratorModal = ({ accounts, defaultAccountId, templates, copyText, notify, customerSafe }) => {
  const modal = ensureToolkitModal();
  const config = getGitLabConfig();
  const account = byId(accounts, defaultAccountId) || accounts[0] || null;
  const defaults = templates || {};
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `
    <label class="form-span">
      Account
      <select name="account_id">${accountOptions(accounts, account?.id || '', false)}</select>
    </label>
    <label>
      GitLab base URL
      <input name="base_url" type="url" value="${escapeHtml(config.baseUrl || 'https://gitlab.com')}" />
    </label>
    <label>
      Project path (group/project)
      <input name="project_path" type="text" value="${escapeHtml(config.projectPath || '')}" />
    </label>
    <label class="form-span">
      Issue title
      <input name="issue_title" type="text" value="CSE collaboration request" />
    </label>
    <label class="form-span">
      Context / description
      <textarea name="description">${defaults.issue_default_description || ''}</textarea>
    </label>
    <label>
      Desired outcome
      <textarea name="outcome">Improve adoption depth and validate value metric progress.</textarea>
    </label>
    <label>
      Definition of done
      <textarea name="done">3+ green use cases or documented plan with measurable owners/dates.</textarea>
    </label>
    <label class="form-span">
      Next actions (one per line)
      <textarea name="next_actions">Schedule workshop
Confirm owner/date per action
Update account change log with evidence</textarea>
    </label>
    <label class="form-span">
      Issue body preview
      <textarea name="preview" class="artifact" readonly></textarea>
    </label>
    <div class="form-actions form-span">
      <button class="qa" type="button" data-copy-title>Copy Title</button>
      <button class="ghost-btn" type="button" data-copy-body>Copy Body</button>
      <button class="ghost-btn" type="button" data-download>Download .md</button>
      <button class="ghost-btn" type="button" data-open-issue>Open New Issue Draft</button>
      <button class="ghost-btn" type="button" data-open-list>Open Project Issues</button>
    </div>
    <p class="muted form-span">${customerSafe ? 'Customer-safe mode active: internal fields are redacted from generated artifacts.' : 'Internal mode active.'}</p>
  `;

  const build = () => {
    const selected = byId(accounts, form.elements.namedItem('account_id').value) || account;
    const title = form.elements.namedItem('issue_title').value;
    const body = buildCollaborationIssueBody({
      account: selected,
      title,
      description: form.elements.namedItem('description').value,
      desiredOutcome: form.elements.namedItem('outcome').value,
      definitionOfDone: form.elements.namedItem('done').value,
      nextActions: parseMultilineItems(form.elements.namedItem('next_actions').value)
    });
    form.elements.namedItem('preview').value = body;
    const savedConfig = {
      baseUrl: form.elements.namedItem('base_url').value,
      projectPath: form.elements.namedItem('project_path').value
    };
    setGitLabConfig(savedConfig);
    const draftUrl = buildGitLabIssueDraftUrl({
      baseUrl: savedConfig.baseUrl,
      projectPath: savedConfig.projectPath,
      title,
      body
    });
    const issuesUrl =
      savedConfig.baseUrl && savedConfig.projectPath
        ? `${String(savedConfig.baseUrl).replace(/\/+$/, '')}/${String(savedConfig.projectPath).replace(/^\/+/, '')}/-/issues`
        : '';
    return { title, body, draftUrl, issuesUrl };
  };

  build();
  ['account_id', 'base_url', 'project_path', 'issue_title', 'description', 'outcome', 'done', 'next_actions'].forEach((name) => {
    form.elements.namedItem(name).addEventListener('input', build);
    form.elements.namedItem(name).addEventListener('change', build);
  });

  form.querySelector('[data-copy-title]')?.addEventListener('click', async () => {
    const { title } = build();
    await copyText(title);
    notify('Issue title copied.');
  });
  form.querySelector('[data-copy-body]')?.addEventListener('click', async () => {
    const { body } = build();
    await copyText(body);
    notify('Issue body copied.');
  });
  form.querySelector('[data-download]')?.addEventListener('click', () => {
    const { title, body } = build();
    const text = `# ${title}\n\n${body}`;
    triggerDownload(`collaboration-issue-${asFilename(title, 'draft')}.md`, text, 'text/markdown;charset=utf-8');
  });
  form.querySelector('[data-open-issue]')?.addEventListener('click', () => {
    const { draftUrl } = build();
    if (!draftUrl) {
      notify('Set GitLab base URL and project path to open new issue.');
      return;
    }
    window.open(draftUrl, '_blank', 'noopener,noreferrer');
  });
  form.querySelector('[data-open-list]')?.addEventListener('click', () => {
    const { issuesUrl } = build();
    if (!issuesUrl) {
      notify('Set GitLab base URL and project path to open project issues.');
      return;
    }
    window.open(issuesUrl, '_blank', 'noopener,noreferrer');
  });

  modal.open({ title: 'Collaboration Issue Generator', content: form });
};

const renderTimelineEntries = (entries, customerSafe) => {
  if (!entries.length) return '<p class="empty-text">No engagement events logged yet.</p>';
  return `<div class="timeline">${entries
    .slice(0, 10)
    .map(
      (entry) => `
        <div class="timeline-item">
          <strong>${escapeHtml(entry.type)}</strong>
          <span>${escapeHtml(entry.notes_customer_safe || 'No notes')}</span>
          ${statusChip({ label: formatDate(entry.date), tone: 'neutral' })}
          ${customerSafe || !entry.notes_internal ? '' : `<span class="muted">Internal: ${escapeHtml(entry.notes_internal)}</span>`}
        </div>
      `
    )
    .join('')}</div>`;
};

const openEngagementLoggerModal = ({ accounts, defaultAccountId, copyText, notify, customerSafe }) => {
  const modal = ensureToolkitModal();
  const entries = loadEngagementLog();
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `
    <label>
      Account
      <select name="account_id">${accountOptions(accounts, defaultAccountId || '', false)}</select>
    </label>
    <label>
      Date
      <input name="date" type="date" value="${toIsoDate(new Date())}" />
    </label>
    <label>
      Type
      <select name="type">
        <option value="workshop">Workshop</option>
        <option value="office hours">Office Hours</option>
        <option value="exec briefing">Executive Briefing</option>
        <option value="cadence call">Cadence Call</option>
      </select>
    </label>
    <label class="form-span">
      Customer-safe notes
      <textarea name="safe_notes"></textarea>
    </label>
    <label class="form-span" ${customerSafe ? 'style="display:none;"' : ''}>
      Internal notes
      <textarea name="internal_notes"></textarea>
    </label>
    <div class="form-actions form-span">
      <button class="qa" type="button" data-save>Log Engagement</button>
      <button class="ghost-btn" type="button" data-export-json>Export JSON</button>
      <button class="ghost-btn" type="button" data-export-csv>Export CSV</button>
    </div>
    <section class="form-span card compact-card">
      <div class="metric-head">
        <h3>Recent engagement timeline</h3>
        ${statusChip({ label: `${entries.length} events`, tone: 'neutral' })}
      </div>
      <div data-log-list>${renderTimelineEntries(entries, customerSafe)}</div>
    </section>
  `;

  const refreshList = () => {
    const next = loadEngagementLog();
    const host = form.querySelector('[data-log-list]');
    host.innerHTML = renderTimelineEntries(next, customerSafe);
  };

  form.querySelector('[data-save]')?.addEventListener('click', () => {
    const account = byId(accounts, form.elements.namedItem('account_id').value);
    if (!account) {
      notify('Select an account to log engagement.');
      return;
    }
    addEngagementLogEntry({
      account_id: account.id,
      account_name: account.name,
      date: form.elements.namedItem('date').value,
      type: form.elements.namedItem('type').value,
      notes_customer_safe: form.elements.namedItem('safe_notes').value,
      notes_internal: form.elements.namedItem('internal_notes')?.value || ''
    });
    form.elements.namedItem('safe_notes').value = '';
    if (form.elements.namedItem('internal_notes')) form.elements.namedItem('internal_notes').value = '';
    refreshList();
    notify('Engagement event logged.');
  });

  form.querySelector('[data-export-json]')?.addEventListener('click', () => {
    const text = buildEngagementLogJson(loadEngagementLog(), { customerSafe });
    triggerDownload(`engagement-log-${customerSafe ? 'customer-safe' : 'internal'}.json`, text, 'application/json;charset=utf-8');
  });

  form.querySelector('[data-export-csv]')?.addEventListener('click', () => {
    const csv = buildEngagementLogCsv(loadEngagementLog(), { customerSafe });
    triggerDownload(`engagement-log-${customerSafe ? 'customer-safe' : 'internal'}.csv`, csv, 'text/csv;charset=utf-8');
  });

  modal.open({ title: 'Engagement Timeline Logger', content: form });
};

const TOOL_DEFS = [
  {
    id: 'success-plan',
    title: 'Customer Success Plan Generator',
    summary: 'Generate GitLab-ready markdown plans with outcomes, metrics, initiatives, and milestones.'
  },
  {
    id: 'exec-snapshot',
    title: 'Executive Adoption Snapshot',
    summary: 'Produce customer-safe executive summary markdown and print-friendly PDF output.'
  },
  {
    id: 'workshop-plan',
    title: 'Workshop Planning Toolkit',
    summary: 'Create workshop agenda, prerequisites checklist, and follow-up actions.'
  },
  {
    id: 'renewal-checklist',
    title: 'Renewal Readiness Checklist',
    summary: 'Build a renewal checklist covering adoption, engagement, value, and risk readiness.'
  },
  {
    id: 'issue-generator',
    title: 'Collaboration Issue Generator',
    summary: 'Generate issue title/body and open prefilled GitLab issue drafts.'
  },
  {
    id: 'engagement-logger',
    title: 'Engagement Logger',
    summary: 'Log touchpoints to local storage and export timeline data as JSON or CSV.'
  }
];

const toolkitFlowVisual = () => `
  <section class="card">
    <div class="metric-head">
      <h2>How To Use The Toolkit</h2>
      ${statusChip({ label: 'Guidance', tone: 'neutral' })}
    </div>
    <div class="flow-steps">
      <article class="flow-step">
        <strong>Request Intake</strong>
        <p>Start from Today queue or create a new engagement request.</p>
      </article>
      <article class="flow-step">
        <strong>Generate Plan</strong>
        <p>Create success plan and workshop prep artifacts with account context.</p>
      </article>
      <article class="flow-step">
        <strong>Execute + Log</strong>
        <p>Run enablement motion and log attendance/engagement events.</p>
      </article>
      <article class="flow-step">
        <strong>Export + Share</strong>
        <p>Publish customer-safe summary and GitLab collaboration issue draft.</p>
      </article>
    </div>
  </section>
`;

const openTool = (toolId, ctx) => {
  if (toolId === 'success-plan') return openSuccessPlanModal(ctx);
  if (toolId === 'exec-snapshot') return openExecutiveSnapshotModal(ctx);
  if (toolId === 'workshop-plan') return openWorkshopPlanModal(ctx);
  if (toolId === 'renewal-checklist') return openRenewalChecklistModal(ctx);
  if (toolId === 'issue-generator') return openIssueGeneratorModal(ctx);
  if (toolId === 'engagement-logger') return openEngagementLoggerModal(ctx);
  return null;
};

export const renderToolkitPage = (ctx) => {
  const { accounts, templates, customerSafe, onToggleSafe, navigate, notify, copyText, selectedAccountId } = ctx;
  const defaultAccountId = selectedAccountId || accounts?.[0]?.id || '';
  const entries = loadEngagementLog();

  const wrapper = document.createElement('section');
  wrapper.className = 'route-page page-shell section-stack';
  wrapper.setAttribute('data-page', 'toolkit');
  wrapper.innerHTML = `
    <header class="page-head page-intro">
      <div>
        <p class="eyebrow">Toolkit</p>
        <h1>CSE Productivity Toolkit</h1>
        <p class="hero-lede">Workflow-first generators for success planning, executive communication, renewals, collaboration issues, and engagement logging.</p>
      </div>
      <div class="page-actions">
        <button class="ghost-btn" type="button" data-go-today>Back to Today</button>
        <label class="safe-toggle">
          <input type="checkbox" data-safe-toggle ${customerSafe ? 'checked' : ''} />
          <span>Customer-safe</span>
        </label>
      </div>
    </header>

    <section class="card">
      <div class="metric-grid kpi-4">
        ${metricTile({ label: 'Accounts available', value: accounts.length, tone: 'neutral' })}
        ${metricTile({ label: 'Generators', value: TOOL_DEFS.length, tone: 'good' })}
        ${metricTile({ label: 'Engagement logs', value: entries.length, tone: entries.length ? 'good' : 'neutral' })}
        ${metricTile({ label: 'Mode', value: customerSafe ? 'Customer-safe' : 'Internal', tone: customerSafe ? 'good' : 'warn' })}
      </div>
    </section>

    ${toolkitFlowVisual()}

    <section class="toolkit-grid">
      ${TOOL_DEFS.map(
        (tool) => `
          <article class="card compact-card">
            <div class="metric-head">
              <h3>${tool.title}</h3>
              ${statusChip({ label: 'Ready', tone: 'good' })}
            </div>
            <p class="muted">${tool.summary}</p>
            <div class="page-actions">
              <button class="qa" type="button" data-open-tool="${tool.id}">Open</button>
            </div>
          </article>
        `
      ).join('')}
    </section>
  `;

  wrapper.querySelector('[data-go-today]')?.addEventListener('click', () => navigate('home'));
  wrapper.querySelector('[data-safe-toggle]')?.addEventListener('change', (event) => onToggleSafe(Boolean(event.target.checked)));

  wrapper.addEventListener('click', (event) => {
    const button = event.target.closest('[data-open-tool]');
    if (!button) return;
    const toolId = button.getAttribute('data-open-tool');
    openTool(toolId, {
      accounts,
      templates,
      customerSafe,
      defaultAccountId,
      copyText,
      notify
    });
  });

  const launchTool = storage.get(STORAGE_KEYS.toolkitLaunch, '');
  if (launchTool) {
    storage.remove(STORAGE_KEYS.toolkitLaunch);
    window.setTimeout(() => {
      openTool(launchTool, { accounts, templates, customerSafe, defaultAccountId, copyText, notify });
    }, 0);
  }

  return wrapper;
};

export const toolkitCommandEntries = () =>
  [
    { id: 'toolkit-success-plan', label: 'Toolkit: Success Plan Generator', meta: 'Toolkit', action: { route: 'toolkit' } },
    { id: 'toolkit-exec-snapshot', label: 'Toolkit: Executive Snapshot', meta: 'Toolkit', action: { route: 'toolkit' } },
    { id: 'toolkit-workshop', label: 'Toolkit: Workshop Planner', meta: 'Toolkit', action: { route: 'toolkit' } },
    { id: 'toolkit-renewal', label: 'Toolkit: Renewal Checklist', meta: 'Toolkit', action: { route: 'toolkit' } },
    { id: 'toolkit-issue', label: 'Toolkit: Collaboration Issue', meta: 'Toolkit', action: { route: 'toolkit' } },
    { id: 'toolkit-engagement', label: 'Toolkit: Engagement Logger', meta: 'Toolkit', action: { route: 'toolkit' } }
  ];
