import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/portfolioPage.js', 'utf8');

test('portfolio view includes manager dashboard snapshot section', () => {
  assert.match(source, /Manager Dashboard/);
  assert.match(source, /Avg adoption score/);
  assert.match(source, /Renewals < 90d/);
  assert.match(source, /No engagement > 30d/);
  assert.match(source, /Top Focus Accounts/);
});
