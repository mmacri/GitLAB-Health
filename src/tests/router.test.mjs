import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHref, detectBasePath, parseRoute, routePath } from '../lib/router.mjs';

test('routing resolves /account/:id', () => {
  const route = parseRoute('/account/northwind-industries');
  assert.equal(route.name, 'account');
  assert.equal(route.params.id, 'northwind-industries');
});

test('routing resolves account route with project base path', () => {
  const basePath = detectBasePath('/GitLAB-Health/account/northwind-industries');
  assert.equal(basePath, '/GitLAB-Health');

  const route = parseRoute('/GitLAB-Health/account/northwind-industries', basePath);
  assert.equal(route.name, 'account');
  assert.equal(route.params.id, 'northwind-industries');
});

test('route path builder produces account href', () => {
  assert.equal(routePath('account', { id: 'contoso-financial-services' }), '/account/contoso-financial-services');
  assert.equal(buildHref('account', { id: 'contoso-financial-services' }, '/GitLAB-Health'), '/GitLAB-Health/account/contoso-financial-services');
});
