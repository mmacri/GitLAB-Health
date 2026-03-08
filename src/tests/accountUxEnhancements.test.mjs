import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/accountPage.js', 'utf8');

test('account view includes devops adoption journey map and simulator shortcut', () => {
  assert.match(source, /DevOps Adoption Journey Map/);
  assert.match(source, /data-go-simulator/);
  assert.match(source, /navigate\('simulator'\)/);
  assert.match(source, /setAttribute\('data-page', journeyMode \? 'journey' : 'account'\)/);
});
