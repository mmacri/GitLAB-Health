import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/pages/portfolioPage.js', 'utf8');

test('today page applies mode-based density behavior', () => {
  assert.ok(source.includes('const applyModeDensity = (wrapper, mode) => {'));
  assert.ok(source.includes('todayHide'), 'today mode hidden section set should be defined');
  assert.ok(source.includes('reviewHide'), 'review mode hidden section set should be defined');
  assert.ok(source.includes('applyModeDensity(wrapper, mode);'), 'today renderer should apply mode density');
});
