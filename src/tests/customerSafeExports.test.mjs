import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAccountCsv, buildAccountExportModel, buildAccountSummaryHtml } from '../lib/exports.mjs';
import { CUSTOMER_SAFE_DENYLIST, hasDeniedKey } from '../lib/redaction.mjs';
import { readJson } from './helpers.mjs';

test('customer-safe export model redacts denylisted keys', () => {
  const accounts = readJson('data/accounts.json').accounts;
  const account = accounts[0];

  const safeModel = buildAccountExportModel(account, { customerSafe: true });

  assert.equal(hasDeniedKey(safeModel, CUSTOMER_SAFE_DENYLIST), false);
  assert.equal('internal_only' in safeModel, false);
});

test('customer-safe csv and html exclude internal-only content', () => {
  const accounts = readJson('data/accounts.json').accounts;
  const account = accounts[0];

  const safeCsv = buildAccountCsv(account, { customerSafe: true });
  const safeHtml = buildAccountSummaryHtml(account, { customerSafe: true });

  assert.equal(safeCsv.includes('sentiment_notes'), false);
  assert.equal(safeCsv.includes(account.internal_only.sentiment_notes), false);
  assert.equal(safeHtml.includes('Internal Notes'), false);
  assert.equal(safeHtml.includes(account.internal_only.sentiment_notes), false);
});
