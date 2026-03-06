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

test('routing resolves hash-style URLs used by static pages', () => {
  assert.equal(parseRoute('#/today').name, 'home');
  assert.equal(parseRoute('/#/portfolio').name, 'portfolio');
  assert.equal(parseRoute('/#/account/northwind-industries').name, 'account');
  assert.equal(parseRoute('/#/account/northwind-industries').params.id, 'northwind-industries');
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
  assert.equal(parseRoute('/customers').name, 'customers');
  assert.equal(parseRoute('/customer').name, 'customer');
  assert.equal(parseRoute('/customer/cust_acme').name, 'customer');
  assert.equal(parseRoute('/customer/cust_acme').params.id, 'cust_acme');
  assert.equal(parseRoute('/manager').name, 'manager');
  assert.equal(parseRoute('/simulator').name, 'simulator');
  assert.equal(parseRoute('/toolkit').name, 'toolkit');
  assert.equal(parseRoute('/success-plans').name, 'toolkit');
  assert.equal(parseRoute('/playbooks').name, 'playbooks');
  assert.equal(parseRoute('/program').name, 'program');
  assert.equal(parseRoute('/program/prog_cicd_lab_q2').name, 'program');
  assert.equal(parseRoute('/risks').name, 'risks');
  assert.equal(parseRoute('/expansion').name, 'expansion');
  assert.equal(parseRoute('/voc').name, 'voc');
  assert.equal(parseRoute('/reports').name, 'reports');
  assert.equal(parseRoute('/propensity').name, 'propensity');
  assert.equal(parseRoute('/settings').name, 'settings');
  assert.equal(parseRoute('/cheatsheet').name, 'cheatsheet');
  assert.equal(parseRoute('/exports').name, 'exports');
  assert.equal(parseRoute('/journey').name, 'journey');
  assert.equal(parseRoute('/journey/northwind-industries').name, 'journey');
  assert.equal(routePath('customers'), '/customers');
  assert.equal(routePath('customer', { id: 'cust_acme' }), '/customer/cust_acme');
  assert.equal(routePath('program', { id: 'prog_cicd_lab_q2' }), '/program/prog_cicd_lab_q2');
  assert.equal(routePath('risks'), '/risks');
  assert.equal(routePath('expansion'), '/expansion');
  assert.equal(routePath('voc'), '/voc');
  assert.equal(routePath('reports'), '/reports');
  assert.equal(routePath('propensity'), '/propensity');
  assert.equal(routePath('settings'), '/settings');
  assert.equal(routePath('toolkit'), '/toolkit');
  assert.equal(routePath('success-plans'), '/success-plans');
  assert.equal(routePath('playbooks'), '/playbooks');
  assert.equal(routePath('simulator'), '/simulator');
  assert.equal(routePath('manager'), '/manager');
  assert.equal(routePath('cheatsheet'), '/cheatsheet');
  assert.equal(routePath('exports'), '/exports');
  assert.equal(routePath('journey'), '/journey');
  assert.equal(routePath('journey', { id: 'northwind-industries' }), '/journey/northwind-industries');
});
