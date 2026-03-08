import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureWorkspaceShape } from '../lib/model.js';

test('ensureWorkspaceShape includes operations risk run history', () => {
  const workspace = ensureWorkspaceShape({
    customers: [
      {
        id: 'cust_ops',
        name: 'Ops Customer'
      }
    ]
  });

  assert.ok(workspace.operations, 'operations block should exist');
  assert.ok(Array.isArray(workspace.operations.riskRuns), 'operations.riskRuns should be an array');
  assert.equal(workspace.operations.riskRuns.length, 0);
});

test('ensureWorkspaceShape normalizes and caps risk run history', () => {
  const riskRuns = Array.from({ length: 180 }).map((_, index) => ({
    id: `run_${index + 1}`,
    at: `2026-03-${String((index % 28) + 1).padStart(2, '0')}T12:00:00.000Z`,
    action: 'Run technical recovery workshop',
    owner: 'CSE',
    due: '2026-04-01',
    customerIds: ['cust_ops'],
    customerNames: ['Ops Customer']
  }));

  const workspace = ensureWorkspaceShape({
    customers: [
      {
        id: 'cust_ops',
        name: 'Ops Customer'
      }
    ],
    operations: {
      riskRuns
    }
  });

  assert.equal(workspace.operations.riskRuns.length, 150, 'risk run history should be capped at 150 entries');
  assert.equal(workspace.operations.riskRuns[0].id, 'run_1');
  assert.equal(workspace.operations.riskRuns[149].id, 'run_150');
});
