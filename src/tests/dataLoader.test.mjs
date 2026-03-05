import test from 'node:test';
import assert from 'node:assert/strict';

import { loadDashboardData } from '../lib/dataLoader.js';

const buildResponse = (body) => ({
  ok: true,
  json: async () => body
});

test('loadDashboardData resolves project base path for deep routes', async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;

  const urls = [];

  globalThis.window = {
    location: { pathname: '/GitLAB-Health/playbooks' }
  };

  globalThis.fetch = async (url) => {
    const text = String(url);
    urls.push(text);

    if (text.endsWith('/data/accounts.json')) {
      return buildResponse({ accounts: [{ id: 'acc-1', name: 'Northwind', segment: 'Enterprise' }] });
    }
    if (text.endsWith('/data/requests.json')) {
      return buildResponse({ requests: [{ request_id: 'REQ-1' }] });
    }
    if (text.endsWith('/data/programs.json')) {
      return buildResponse({ programs: [{ program_id: 'PGM-1' }] });
    }
    if (text.endsWith('/data/playbooks.json')) {
      return buildResponse({ playbooks: [{ id: 'PB-1' }] });
    }
    if (text.endsWith('/data/resources.json')) {
      return buildResponse({ categories: [{ id: 'health' }], resources: [{ id: 'res-1' }] });
    }
    if (text.endsWith('/data/templates.json')) {
      return buildResponse({ templates: { issue_default_description: 'Example' } });
    }
    if (text.endsWith('/data/cheatsheet.json')) {
      return buildResponse({ title: 'Cheatsheet' });
    }
    if (text.endsWith('/data/rules.json')) {
      return buildResponse({ rules: [{ id: 'rule-1' }] });
    }
    if (text.endsWith('/data/simulator_capabilities.json')) {
      return buildResponse({ capabilities: [{ id: 'cap-1' }] });
    }
    if (text.endsWith('/data/simulator_rules.json')) {
      return buildResponse({ rules: [{ id: 'sim-rule-1' }] });
    }
    if (text.endsWith('/data/workspace.sample.json')) {
      return buildResponse({
        workspace: {
          version: '3.0.0',
          updatedAt: '2026-03-04T00:00:00.000Z',
          portfolio: { name: 'Sample' },
          customers: [{ id: 'cust-1', name: 'Northwind', tier: 'Premium', renewalDate: '2026-10-10', stage: 'Enable' }],
          adoption: {},
          successPlans: {},
          programs: [],
          engagements: {},
          risk: {},
          expansion: {},
          voc: [],
          team: { cseMembers: [] },
          snapshots: [],
          settings: { scoringWeights: { adoption: 45, engagement: 30, risk: 25 } }
        }
      });
    }

    throw new Error(`Unexpected fetch URL: ${text}`);
  };

  try {
    const loaded = await loadDashboardData();

    assert.equal(urls.length, 11);
    assert.ok(urls.every((url) => url.startsWith('/GitLAB-Health/data/')));
    assert.equal(loaded.accounts.length, 1);
    assert.equal(loaded.requests.length, 1);
    assert.equal(loaded.programs.length, 1);
    assert.equal(loaded.playbooks.length, 1);
    assert.equal(loaded.resources.length, 1);
    assert.equal(loaded.categories.length, 1);
    assert.equal(loaded.templates.issue_default_description, 'Example');
    assert.equal(loaded.cheatsheet.title, 'Cheatsheet');
    assert.equal(loaded.rules.length, 1);
    assert.equal(loaded.simulatorCapabilities.length, 1);
    assert.equal(loaded.simulatorRules.length, 1);
    assert.ok(Array.isArray(loaded.workspace?.customers));
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});
