import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = JSON.parse(readFileSync('data/resources.json', 'utf8'));
const allowedCategories = new Set(['Onboarding', 'Adoption', 'Risk', 'Renewal', 'Enablement']);
const allowedAudiences = new Set(['Customer-safe', 'Internal']);
const allowedTypes = new Set(['Handbook', 'Docs', 'Playbook']);

test('resources registry is populated and handbook-aligned', () => {
  assert.ok(Array.isArray(doc.resources), 'resources array must exist');
  assert.ok(doc.resources.length >= 30, 'resources registry should contain at least 30 entries');

  doc.resources.forEach((resource) => {
    assert.ok(resource.id, 'resource.id is required');
    assert.ok(resource.title, 'resource.title is required');
    assert.ok(resource.url, 'resource.url is required');
    assert.ok(/^https?:\/\//.test(resource.url), 'resource.url must be an absolute URL');
    assert.ok(allowedCategories.has(resource.category), `invalid category: ${resource.category}`);
    assert.ok(allowedAudiences.has(resource.audience), `invalid audience: ${resource.audience}`);
    assert.ok(allowedTypes.has(resource.type), `invalid type: ${resource.type}`);
  });
});
