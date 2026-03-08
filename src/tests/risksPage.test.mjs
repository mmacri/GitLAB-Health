import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const risksPageSource = readFileSync('src/pages/risksPage.js', 'utf8');

test('risks page includes operational filters and bulk selection controls', () => {
  assert.ok(risksPageSource.includes('data-filter-search'), 'risks page should include search filter');
  assert.ok(risksPageSource.includes('data-filter-signal'), 'risks page should include signal filter');
  assert.ok(risksPageSource.includes('data-filter-severity'), 'risks page should include severity filter');
  assert.ok(risksPageSource.includes('data-filter-renewal'), 'risks page should include renewal filter');
  assert.ok(risksPageSource.includes('data-select-all-risks'), 'risks page should include select-all checkbox');
  assert.ok(risksPageSource.includes('data-risk-select'), 'risks page should include row selection checkboxes');
});
