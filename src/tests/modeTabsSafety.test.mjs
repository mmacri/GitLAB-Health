import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modeTabsSource = readFileSync('src/components/ModeTabs.js', 'utf8');

test('mode tabs defensively handle null counts payloads', () => {
  assert.ok(
    modeTabsSource.includes("const safeCounts = counts && typeof counts === 'object' ? counts : {};"),
    'ModeTabs should normalize null/invalid counts to an empty object'
  );
  assert.ok(
    modeTabsSource.includes('safeCounts[mode.id]'),
    'ModeTabs should read count badges from the normalized safeCounts object'
  );
});
