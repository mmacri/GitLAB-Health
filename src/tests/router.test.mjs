import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHref, detectBasePath, parseRoute, routePath } from '../lib/router.js';

test('routing resolves /account/:id', () => {
  const route = parseRoute('/account/northwind-industries');
  assert.equal(route.name, 'account');
  assert.equal(route.params.id, 'northwind-industries');
});

test('routing resolves / to home', () => {
  const route = parseRoute('/');
  assert.equal(route.name, 'home');
});

test('routing resolves /today to home', () => {
  const route = parseRoute('/today');
  assert.equal(route.name, 'home');
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
  assert.equal(routePath('home'), '/today');
});

test('router supports playbooks and exports routes', () => {
  assert.equal(parseRoute('/simulator').name, 'simulator');
  assert.equal(parseRoute('/toolkit').name, 'toolkit');
  assert.equal(parseRoute('/success-plans').name, 'toolkit');
  assert.equal(parseRoute('/playbooks').name, 'playbooks');
  assert.equal(parseRoute('/cheatsheet').name, 'cheatsheet');
  assert.equal(parseRoute('/exports').name, 'exports');
  assert.equal(parseRoute('/journey').name, 'journey');
  assert.equal(parseRoute('/journey/northwind-industries').name, 'journey');
  assert.equal(routePath('toolkit'), '/toolkit');
  assert.equal(routePath('success-plans'), '/success-plans');
  assert.equal(routePath('playbooks'), '/playbooks');
  assert.equal(routePath('simulator'), '/simulator');
  assert.equal(routePath('cheatsheet'), '/cheatsheet');
  assert.equal(routePath('exports'), '/exports');
  assert.equal(routePath('journey'), '/journey');
  assert.equal(routePath('journey', { id: 'northwind-industries' }), '/journey/northwind-industries');
});
