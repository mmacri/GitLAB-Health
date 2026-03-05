import test from 'node:test';
import assert from 'node:assert/strict';

import { toastStore } from '../stores/toastStore.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('toastStore shows and dismisses notifications', async () => {
  let latest = [];
  const unsubscribe = toastStore.subscribe((toasts) => {
    latest = toasts;
  });

  const id = toastStore.show({ message: 'Snapshot copied', type: 'success', duration: 3000 });
  await wait(10);

  assert.equal(latest.some((toast) => toast.id === id), true);
  toastStore.dismiss(id);
  await wait(260);
  assert.equal(latest.some((toast) => toast.id === id), false);

  unsubscribe();
});
