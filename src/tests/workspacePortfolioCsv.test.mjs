import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPortfolioCsv } from '../lib/exports.js';
import { readJson } from './helpers.js';

test('workspace portfolio csv exports expanded operating columns', () => {
  const workspaceDoc = readJson('data/workspace.sample.json');
  const workspace = workspaceDoc.workspace || workspaceDoc;
  const csv = buildPortfolioCsv(workspace);

  const lines = csv.trim().split('\n');
  assert.ok(lines.length > 1);
  assert.equal(
    lines[0],
    'customerId,name,tier,renewalDate,health,adoptionScore,engagementScore,riskScore,cicdPercent,securityPercent,lastEngagementDate,openExpansionCount'
  );

  const acmeRow = lines.find((line) => line.includes('cust_acme,Acme Corp'));
  assert.ok(acmeRow, 'Expected cust_acme row in workspace CSV export');
});
