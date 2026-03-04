import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const accountsDoc = JSON.parse(readFileSync('data/accounts.json', 'utf8'));
const requestsDoc = JSON.parse(readFileSync('data/requests.json', 'utf8'));
const programsDoc = JSON.parse(readFileSync('data/programs.json', 'utf8'));

test('core datasets are populated and avoid TBD placeholders', () => {
  assert.ok(Array.isArray(accountsDoc.accounts) && accountsDoc.accounts.length > 0, 'accounts dataset should not be empty');
  assert.ok(Array.isArray(requestsDoc.requests) && requestsDoc.requests.length > 0, 'requests dataset should not be empty');
  assert.ok(Array.isArray(programsDoc.programs) && programsDoc.programs.length > 0, 'programs dataset should not be empty');

  const textBlob = [
    JSON.stringify(accountsDoc),
    JSON.stringify(requestsDoc),
    JSON.stringify(programsDoc)
  ].join('\n');
  assert.ok(!/\bTBD\b/i.test(textBlob), 'datasets should not contain TBD placeholders');
});
