import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/managerPage.js', 'utf8');

test('manager page contains team-level portfolio controls and charts', () => {
  assert.match(source, /CSE Manager Dashboard/);
  assert.match(source, /Portfolio Health Distribution/);
  assert.match(source, /Use Case Adoption Distribution/);
  assert.match(source, /Renewal Risk Map/);
});
