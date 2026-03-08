import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const accountsDoc = JSON.parse(readFileSync('data/accounts.json', 'utf8'));
const requestsDoc = JSON.parse(readFileSync('data/requests.json', 'utf8'));
const programsDoc = JSON.parse(readFileSync('data/programs.json', 'utf8'));
const rulesDoc = JSON.parse(readFileSync('data/rules.json', 'utf8'));
const metricsDoc = JSON.parse(readFileSync('data/metrics.json', 'utf8'));

test('core datasets are populated and avoid TBD placeholders', () => {
  assert.ok(Array.isArray(accountsDoc.accounts) && accountsDoc.accounts.length > 0, 'accounts dataset should not be empty');
  assert.ok(Array.isArray(requestsDoc.requests) && requestsDoc.requests.length > 0, 'requests dataset should not be empty');
  assert.ok(Array.isArray(programsDoc.programs) && programsDoc.programs.length > 0, 'programs dataset should not be empty');
  assert.ok(Array.isArray(rulesDoc.rules) && rulesDoc.rules.length > 0, 'rules dataset should not be empty');
  assert.ok(Array.isArray(metricsDoc.use_case_scoring?.use_cases) && metricsDoc.use_case_scoring.use_cases.length > 0, 'metrics dataset should include use case scoring rows');

  const textBlob = [
    JSON.stringify(accountsDoc),
    JSON.stringify(requestsDoc),
    JSON.stringify(programsDoc),
    JSON.stringify(rulesDoc),
    JSON.stringify(metricsDoc)
  ].join('\n');
  assert.ok(!/\bTBD\b/i.test(textBlob), 'datasets should not contain TBD placeholders');
  assert.ok(!/"placeholder"\s*:\s*true/i.test(textBlob), 'datasets should not ship placeholder=true markers');
  assert.ok(!/Not yet tracked in this snapshot/i.test(textBlob), 'datasets should not ship unresolved not-tracked copy');
});
