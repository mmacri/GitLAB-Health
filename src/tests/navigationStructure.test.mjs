import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexHtml = readFileSync('index.html', 'utf8');
const mainSource = readFileSync('src/main.js', 'utf8');

test('global navigation is defined once and account jump nav is contextual', () => {
  const navContainerCount = (indexHtml.match(/class=\"nav-links\"/g) || []).length;

  assert.equal(navContainerCount, 0, 'top nav should not duplicate full route links');
  assert.ok(!indexHtml.includes('Navigate Close'), 'legacy duplicate bottom navigation should not exist');
  assert.ok(mainSource.includes('PRIMARY_NAV_ITEMS'), 'sidebar primary nav definitions should exist');
  assert.ok(mainSource.includes("route: 'account'"), 'primary navigation should include Accounts');
  assert.ok(mainSource.includes("route: 'simulator'"), 'primary navigation should include Simulator');
  assert.ok(mainSource.includes("route: 'toolkit'"), 'primary navigation should include Success Plans');
  assert.ok(mainSource.includes("route: 'manager'"), 'primary navigation should include Manager');
  assert.ok(mainSource.includes('Jump To Section'), 'account contextual section jump should exist');
  assert.ok(!mainSource.includes('data-set-mode='), 'mode switching should be handled by top mode tabs, not sidebar buttons');
});
