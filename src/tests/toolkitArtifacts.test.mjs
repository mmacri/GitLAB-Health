import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEngagementLogCsv } from '../lib/engagementLog.js';
import {
  buildCollaborationIssueBody,
  buildExecutiveSnapshotMarkdown,
  buildGitLabIssueDraftUrl,
  buildRenewalChecklistMarkdown,
  buildSuccessPlanMarkdown,
  buildWorkshopPlanMarkdown
} from '../lib/toolkit.js';
import { readJson } from './helpers.js';

const sampleAccount = readJson('data/accounts.json').accounts[0];

test('success plan generator returns complete markdown', () => {
  const markdown = buildSuccessPlanMarkdown({
    account: sampleAccount,
    lifecycleStage: 'enable',
    objectives: ['Objective A'],
    successMetrics: ['Metric A'],
    initiatives: ['Initiative A'],
    milestones: [{ date: '2026-03-20', description: 'Kickoff workshop' }]
  });

  assert.ok(markdown.includes('# Customer Success Plan'));
  assert.ok(markdown.includes('Objective A'));
  assert.ok(markdown.includes('Metric A'));
  assert.ok(markdown.includes('Kickoff workshop'));
});

test('executive snapshot and workshop generators return non-empty content', () => {
  const snapshot = buildExecutiveSnapshotMarkdown({
    account: sampleAccount,
    nextSteps: ['Confirm owners'],
    customerSafe: true
  });
  const workshop = buildWorkshopPlanMarkdown({
    account: sampleAccount,
    workshopType: 'CI/CD',
    audienceRoles: ['Engineering Manager'],
    prerequisites: ['Runner access confirmed']
  });

  assert.ok(snapshot.includes('Executive Adoption Snapshot'));
  assert.ok(snapshot.includes('Confirm owners'));
  assert.ok(workshop.includes('Workshop Plan'));
  assert.ok(workshop.includes('Runner access confirmed'));
});

test('renewal checklist and collaboration issue include required sections', () => {
  const renewal = buildRenewalChecklistMarkdown({
    account: sampleAccount,
    renewalDate: sampleAccount.renewal_date,
    health: sampleAccount.health.overall,
    execSponsorStatus: 'Confirmed',
    valueProofStatus: 'Customer confirmed'
  });
  const issueBody = buildCollaborationIssueBody({
    account: sampleAccount,
    title: 'CSE collaboration request',
    description: 'Need support for CI uplift',
    desiredOutcome: 'Raise CI adoption',
    definitionOfDone: 'Three teams using CI',
    nextActions: ['Book workshop']
  });

  assert.ok(renewal.includes('## Adoption'));
  assert.ok(renewal.includes('## Risks'));
  assert.ok(issueBody.includes('## Desired Outcome'));
  assert.ok(issueBody.includes('## Definition of Done'));
  assert.ok(issueBody.includes('Book workshop'));
});

test('gitlab issue draft URL and customer-safe engagement csv are generated correctly', () => {
  const url = buildGitLabIssueDraftUrl({
    baseUrl: 'https://gitlab.com',
    projectPath: 'group/project',
    title: 'My Title',
    body: 'Body text'
  });
  assert.ok(url.includes('/-/issues/new?'));
  assert.ok(url.includes('issue%5Btitle%5D=My+Title'));

  const csv = buildEngagementLogCsv(
    [
      {
        id: 'eng-1',
        account_id: 'northwind-industries',
        account_name: 'Northwind Industries',
        date: '2026-03-03',
        type: 'workshop',
        notes_customer_safe: 'Completed workshop recap.',
        notes_internal: 'Internal signal detail.',
        created_at: '2026-03-03T10:00:00.000Z'
      }
    ],
    { customerSafe: true }
  );

  assert.equal(csv.includes('notes_internal'), false);
  assert.equal(csv.includes('Internal signal detail.'), false);
  assert.equal(csv.includes('Completed workshop recap.'), true);
});
