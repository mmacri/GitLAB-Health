import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWorkspaceFromLegacy, ensureWorkspaceShape } from '../lib/model.js';

test('ensureWorkspaceShape normalizes legacy program payloads into workspace program shape', () => {
  const workspace = ensureWorkspaceShape({
    customers: [{ id: 'cust_a', name: 'Acme Corp' }],
    programs: [
      {
        program_id: 'PGM-2026-001',
        title: 'CI Reliability Foundations',
        type: 'webinar',
        date: '2026-03-06T08:00:00Z',
        registration_count: 36,
        attendance_count: 20
      }
    ]
  });

  assert.equal(workspace.programs.length, 1);
  assert.equal(workspace.programs[0].id, 'prog_pgm_2026_001');
  assert.equal(workspace.programs[0].legacyProgramId, 'PGM-2026-001');
  assert.equal(workspace.programs[0].name, 'CI Reliability Foundations');
  assert.equal(workspace.programs[0].startDate, '2026-03-06');
  assert.equal(workspace.programs[0].funnel.invited, 36);
  assert.equal(workspace.programs[0].funnel.attended, 20);
});

test('buildWorkspaceFromLegacy preserves original legacy program id for interoperability', () => {
  const workspace = buildWorkspaceFromLegacy({
    accounts: [
      {
        id: 'acct_1',
        name: 'Acme Corp',
        segment: 'Enterprise',
        renewal_date: '2026-10-15',
        lifecycle_stage: 'enable',
        health: { overall: 'yellow', lifecycle_stage: 'enable', last_updated: '2026-03-01' },
        adoption: { use_case_scores: { SCM: 60, CI: 55, CD: 20, Secure: 15 }, trend_30d: 5, platform_adoption_score: 52 },
        outcomes: { objectives: [], executive_summary: '' },
        journey: { milestones: [] },
        engagement: {}
      }
    ],
    programs: [
      {
        program_id: 'PGM-2026-010',
        title: 'Secure Pipeline Lab',
        type: 'hands-on lab',
        date: '2026-04-01T08:00:00Z',
        target_use_cases: ['Secure'],
        registration_count: 40,
        attendance_count: 25,
        followup_steps: ['Share implementation checklist']
      }
    ]
  });

  assert.equal(workspace.programs.length, 1);
  assert.equal(workspace.programs[0].id, 'prog_pgm_2026_010');
  assert.equal(workspace.programs[0].legacyProgramId, 'PGM-2026-010');
  assert.equal(workspace.programs[0].name, 'Secure Pipeline Lab');
});
