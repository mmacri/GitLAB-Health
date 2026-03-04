import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const mainSource = readFileSync('src/main.js', 'utf8');

test('global navigation is defined once and account jump nav is contextual', () => {
  const navLinksCount = (indexHtml.match(/data-nav-route=/g) || []).length;
  const navContainerCount = (indexHtml.match(/class=\"nav-links\"/g) || []).length;

  assert.ok(navLinksCount >= 6, 'expected primary navigation links in top nav');
  assert.equal(navContainerCount, 1, 'top-level nav links container should only appear once');
  assert.ok(!indexHtml.includes('Navigate Close'), 'legacy duplicate bottom navigation should not exist');
  assert.ok(indexHtml.includes('>Accounts<'), 'primary navigation should include Accounts');
  assert.ok(indexHtml.includes('>Success Plans<'), 'primary navigation should include Success Plans');
  assert.ok(mainSource.includes('Jump To Section'), 'account contextual section jump should exist');
});
