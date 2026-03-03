import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCustomerAgenda, buildFollowupEmail, buildIssueBody } from '../lib/artifacts.js';
import { readJson } from './helpers.js';

test('intake artifact generation includes required fields and non-empty output', () => {
  const account = readJson('data/accounts.json').accounts[0];
  const request = {
    request_id: 'REQ-2026-999',
    account_id: account.id,
    requestor_role: 'Account Executive',
    topic: 'CI',
    stage: 'enable',
    desired_outcome: 'Increase CI adoption depth for top teams.',
    definition_of_done: 'CI score above 70 and evidence shared in weekly update.',
    due_date: '2026-03-31',
    status: 'new',
    assigned_to: 'CSE Pool'
  };

  const issue = buildIssueBody(request, account);
  const agenda = buildCustomerAgenda(request, account);
  const email = buildFollowupEmail(request, account);

  [issue, agenda, email].forEach((artifact) => {
    assert.ok(artifact.trim().length > 20);
    assert.equal(artifact.includes(account.name), true);
  });

  assert.equal(issue.includes(request.desired_outcome), true);
  assert.equal(issue.includes(request.definition_of_done), true);
  assert.equal(agenda.toLowerCase().includes('definition of done'), true);
  assert.equal(email.includes('Agreed outcome'), true);
});
