import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { redactPlaybooksForCustomer } from '../lib/redaction.js';

const playbooksDoc = JSON.parse(readFileSync('data/playbooks.json', 'utf8'));
const programsDoc = JSON.parse(readFileSync('data/programs.json', 'utf8'));
const resourcesDoc = JSON.parse(readFileSync('data/resources.json', 'utf8'));

const expectedCategories = new Set([
  'Onboarding Playbooks',
  'Adoption Playbooks',
  'Risk Mitigation Playbooks',
  'Executive Engagement Playbooks',
  'Expansion Playbooks',
  'Renewal Playbooks',
  'Technical Enablement Playbooks'
]);

const canonical = (value) => String(value || '').trim().toLowerCase().replace(/\/+$/, '');

test('playbook library is populated, non-duplicative, and wired to real references', () => {
  const playbooks = playbooksDoc.playbooks || [];
  const categoryList = playbooksDoc.categories || [];

  assert.ok(Array.isArray(playbooks) && playbooks.length >= 7, 'playbook library should include at least 7 playbooks');
  assert.ok(Array.isArray(categoryList) && categoryList.length === expectedCategories.size, 'playbook categories should be defined');

  const seenIds = new Set();
  const seenTitles = new Set();
  const programIds = new Set((programsDoc.programs || []).map((program) => program.program_id));
  const resourceIds = new Set((resourcesDoc.resources || []).map((resource) => resource.id));

  categoryList.forEach((category) => {
    assert.ok(expectedCategories.has(category), `unexpected playbook category: ${category}`);
  });

  playbooks.forEach((playbook) => {
    assert.ok(playbook.id, 'playbook id is required');
    assert.ok(playbook.title, 'playbook title is required');
    assert.ok(playbook.category, 'playbook category is required');
    assert.ok(playbook.when_to_run, 'playbook when_to_run is required');
    assert.ok(playbook.objective, 'playbook objective is required');
    assert.ok(Array.isArray(playbook.trigger_signals) && playbook.trigger_signals.length >= 2, 'playbook trigger signals required');
    assert.ok(Array.isArray(playbook.preparation_steps) && playbook.preparation_steps.length >= 2, 'playbook preparation steps required');
    assert.ok(Array.isArray(playbook.execution_agenda) && playbook.execution_agenda.length >= 3, 'playbook execution agenda required');
    assert.ok(Array.isArray(playbook.artifacts_generated) && playbook.artifacts_generated.length >= 1, 'playbook artifacts required');
    assert.ok(Array.isArray(playbook.checklist) && playbook.checklist.length >= 3, 'playbook checklist required');
    assert.ok(Array.isArray(playbook.resource_ids) && playbook.resource_ids.length >= 2, 'playbook resource ids required');

    assert.ok(expectedCategories.has(playbook.category), `invalid playbook category: ${playbook.category}`);
    assert.ok(!seenIds.has(playbook.id), `duplicate playbook id: ${playbook.id}`);
    assert.ok(!seenTitles.has(canonical(playbook.title)), `duplicate playbook title: ${playbook.title}`);
    seenIds.add(playbook.id);
    seenTitles.add(canonical(playbook.title));

    assert.ok(programIds.has(playbook.recommended_program), `playbook program missing: ${playbook.recommended_program}`);

    const refs = new Set();
    (playbook.references || []).forEach((url) => {
      assert.ok(/^https?:\/\//.test(url), `playbook reference must be absolute url: ${url}`);
      const key = canonical(url);
      assert.ok(!refs.has(key), `duplicate reference url in playbook: ${playbook.id}`);
      refs.add(key);
    });

    (playbook.resource_ids || []).forEach((resourceId) => {
      assert.ok(resourceIds.has(resourceId), `resource id missing from registry: ${resourceId}`);
    });
  });

  const blob = JSON.stringify(playbooksDoc);
  assert.ok(!/\bTBD\b|placeholder|lorem|coming soon/i.test(blob), 'playbooks should not contain placeholder content');
});

test('customer-safe playbook redaction removes internal-only fields and checklist items', () => {
  const redacted = redactPlaybooksForCustomer(playbooksDoc.playbooks || []);
  assert.ok(redacted.length > 0, 'redacted playbooks should exist');

  redacted.forEach((playbook) => {
    assert.equal(Object.prototype.hasOwnProperty.call(playbook, 'internal_only'), false, 'internal_only should be removed');
    (playbook.checklist || []).forEach((item) => {
      assert.equal(Boolean(item.internal_only), false, 'internal-only checklist entries should not remain');
    });
  });
});
