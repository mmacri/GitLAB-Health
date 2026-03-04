import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAccountWorkspace, computeAccountSignals, findAccountById } from '../lib/scoring.js';
import { evaluateOperatingModelEngine } from '../lib/operatingModelEngine.js';
import { readJson } from './helpers.js';

const accounts = readJson('data/accounts.json').accounts;
const requests = readJson('data/requests.json').requests;
const playbooks = readJson('data/playbooks.json').playbooks;
const programs = readJson('data/programs.json').programs;
const resources = readJson('data/resources.json').resources;
const rules = readJson('data/rules.json').rules;

test('operating model engine returns deterministic recommendations for risk accounts', () => {
  const now = new Date('2026-03-04T00:00:00Z');
  const account = findAccountById(accounts, 'contoso-financial-services');
  const signal = computeAccountSignals(account, requests, playbooks, programs, now);

  const result = evaluateOperatingModelEngine({
    account,
    signal,
    rules,
    playbooks,
    resources,
    now
  });

  assert.ok(Array.isArray(result.recommendations), 'recommendations should be returned');
  assert.ok(result.recommendations.length >= 2, 'risk account should trigger multiple recommendations');

  const ids = new Set(result.recommendations.map((item) => item.id));
  assert.ok(ids.has('low_adoption_expansion'), 'low adoption rule should trigger');
  assert.ok(ids.has('renewal_risk_window'), 'renewal risk rule should trigger');

  result.recommendations.forEach((item) => {
    assert.ok(item.title, 'recommendation title required');
    assert.ok(item.recommendation, 'recommendation text required');
    assert.ok(item.why, 'why explanation required');
    assert.ok(item.issue_template, 'issue template required');
    assert.ok(item.resource?.url && /^https?:\/\//.test(item.resource.url), 'resource link required');
  });
});

test('account workspace embeds operating model recommendations', () => {
  const now = new Date('2026-03-04T00:00:00Z');
  const data = { accounts, requests, playbooks, programs, resources, rules };
  const workspace = buildAccountWorkspace(data, 'contoso-financial-services', now);

  assert.ok(workspace?.operatingModel, 'workspace should include operating model');
  assert.ok((workspace.operatingModel.recommendations || []).length > 0, 'workspace should include recommendations');
  assert.ok(
    workspace.actions.immediate.some((item) => item.includes(':')),
    'immediate actions should include engine-derived recommendation lines'
  );
});
