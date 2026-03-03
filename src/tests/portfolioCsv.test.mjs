import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPortfolioCsv } from '../lib/exports.js';
import { readJson } from './helpers.js';

const splitCsvLine = (line) => line.split(',');

test('portfolio csv exports expected columns and values', () => {
  const accounts = readJson('data/accounts.json').accounts;
  const requests = readJson('data/requests.json').requests;
  const csv = buildPortfolioCsv(accounts, requests);

  const lines = csv.trim().split('\n');
  assert.ok(lines.length > 1);

  const header = splitCsvLine(lines[0]);
  assert.deepEqual(header, [
    'account_id',
    'account_name',
    'segment',
    'renewal_date',
    'health_overall',
    'lifecycle_stage',
    'platform_adoption_score',
    'platform_adoption_level',
    'open_requests',
    'next_touch_date'
  ]);

  const contosoLine = lines.find((line) => line.startsWith('contoso-financial-services,'));
  assert.ok(contosoLine, 'Expected contoso account in export');
  const contoso = splitCsvLine(contosoLine);
  assert.equal(contoso[4], 'red');
  const expectedOpenRequests = String(
    requests.filter(
      (request) =>
        request.account_id === 'contoso-financial-services' &&
        !['completed', 'closed'].includes(String(request.status).toLowerCase())
    ).length
  );
  assert.equal(contoso[8], expectedOpenRequests);
});
