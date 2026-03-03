import test from 'node:test';
import assert from 'node:assert/strict';

import { loadDashboardData } from '../lib/dataLoader.mjs';

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

    throw new Error(`Unexpected fetch URL: ${text}`);
  };

  try {
    const loaded = await loadDashboardData();

    assert.equal(urls.length, 5);
    assert.ok(urls.every((url) => url.startsWith('/GitLAB-Health/data/')));
    assert.equal(loaded.accounts.length, 1);
    assert.equal(loaded.requests.length, 1);
    assert.equal(loaded.programs.length, 1);
    assert.equal(loaded.playbooks.length, 1);
    assert.equal(loaded.resources.length, 1);
    assert.equal(loaded.categories.length, 1);
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});
