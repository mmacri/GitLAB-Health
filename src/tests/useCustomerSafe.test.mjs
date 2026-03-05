import test from 'node:test';
import assert from 'node:assert/strict';

import { setCustomerSafeMode, useCustomerSafe } from '../composables/useCustomerSafe.js';

test('maskField returns null for hidden fields in customer-safe mode', () => {
  const safe = useCustomerSafe();
  setCustomerSafeMode(true);
  assert.equal(safe.maskField('arr', 120000), null);
});

test('maskField anonymizes account and cse names in customer-safe mode', () => {
  const safe = useCustomerSafe();
  setCustomerSafeMode(true);
  assert.equal(safe.maskField('accountName', 'Acme Corp'), 'Your Organization');
  assert.equal(safe.maskField('cseName', 'Erin Walters'), 'Your GitLab CSE');
});

test('maskField returns original value for non-protected fields and when safe mode is off', () => {
  const safe = useCustomerSafe();
  setCustomerSafeMode(true);
  assert.equal(safe.maskField('engagementType', 'WEBINAR'), 'WEBINAR');
  setCustomerSafeMode(false);
  assert.equal(safe.maskField('arr', 120000), 120000);
  assert.equal(safe.hiddenFieldCount, 0);
});

