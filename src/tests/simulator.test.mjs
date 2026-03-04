import test from 'node:test';
import assert from 'node:assert/strict';

import { readJson } from './helpers.js';
import {
  buildSimulatorExecutiveSummaryMarkdown,
  buildSimulatorIssueBodyMarkdown,
  buildSimulatorSuccessPlanMarkdown,
  buildSimulatorWorkshopPlanMarkdown,
  deriveSimulatorState,
  presetCapabilityMap,
  simulatorReferencesMinimum
} from '../lib/simulator.js';

const capabilitiesDoc = readJson('data/simulator_capabilities.json');
const rulesDoc = readJson('data/simulator_rules.json');
const capabilities = Array.isArray(capabilitiesDoc.capabilities) ? capabilitiesDoc.capabilities : [];
const rules = Array.isArray(rulesDoc.rules) ? rulesDoc.rules : [];

test('simulator preset and rules generate deterministic actions and references', () => {
  const selected = presetCapabilityMap('starter_scm_only', capabilities);
  const state = deriveSimulatorState({ capabilities, rules, selected, customerSafe: true });

  assert.ok(state.use_case_green_count >= 0);
  assert.ok(state.recommended_actions.length >= 1, 'expected at least one recommended action');
  assert.ok(state.recommended_actions.every((item) => item.resource?.url), 'each action should include a resource link');

  const requiredLinks = simulatorReferencesMinimum().map((item) => item.url.toLowerCase());
  const stateLinks = state.references.map((item) => String(item.url || '').toLowerCase());
  requiredLinks.forEach((link) => {
    assert.ok(stateLinks.includes(link), `missing baseline simulator reference: ${link}`);
  });
});

test('mature platform preset reaches >=3 green core use cases and advanced stage', () => {
  const selected = presetCapabilityMap('mature_platform', capabilities);
  const state = deriveSimulatorState({ capabilities, rules, selected, customerSafe: false });

  assert.ok(state.use_case_green_count >= 3);
  assert.ok(['Expand', 'Renew'].includes(state.journey_stage));
});

test('simulator artifact generators produce complete markdown and honor customer-safe mode', () => {
  const selected = presetCapabilityMap('cicd_adoption', capabilities);
  const state = deriveSimulatorState({ capabilities, rules, selected, customerSafe: false });

  const successPlan = buildSimulatorSuccessPlanMarkdown({
    state,
    customerSafe: false,
    customerName: 'Northwind Scenario'
  });
  const customerSafePlan = buildSimulatorSuccessPlanMarkdown({
    state,
    customerSafe: true,
    customerName: 'Northwind Scenario'
  });
  const execSummary = buildSimulatorExecutiveSummaryMarkdown({
    state,
    customerSafe: true,
    customerName: 'Northwind Scenario'
  });
  const workshopPlan = buildSimulatorWorkshopPlanMarkdown({
    state,
    capabilities,
    customerSafe: true,
    customerName: 'Northwind Scenario'
  });
  const issueBody = buildSimulatorIssueBodyMarkdown({
    state,
    customerSafe: true,
    customerName: 'Northwind Scenario'
  });

  assert.match(successPlan, /# Customer Success Plan - Northwind Scenario/);
  assert.match(successPlan, /## Internal Notes/);
  assert.ok(!customerSafePlan.includes('## Internal Notes'));
  assert.match(execSummary, /# Executive Summary - Northwind Scenario/);
  assert.match(workshopPlan, /# Workshop Plan - /);
  assert.match(issueBody, /## Acceptance Criteria/);
  assert.match(issueBody, /## References/);
});
