import test from 'node:test';
import assert from 'node:assert/strict';

import { storage, STORAGE_KEYS } from '../lib/storage.js';

test('storage keys use gh_* namespace for static dashboard state', () => {
  assert.equal(STORAGE_KEYS.safeMode, 'gh_customer_safe_mode');
  assert.equal(STORAGE_KEYS.engagementLog, 'gh_engagement_log_v1');
  assert.equal(STORAGE_KEYS.accountOverrides, 'gh_user_overrides_v1');
  assert.equal(STORAGE_KEYS.gitlabBaseUrl, 'gh_gitlab_base_url');
  assert.equal(STORAGE_KEYS.gitlabProjectPath, 'gh_gitlab_project_path');
  assert.equal(STORAGE_KEYS.defaultMode, 'gh_default_mode_v1');
  assert.equal(STORAGE_KEYS.defaultPersona, 'gh_default_persona_v1');
});

test('legacy localStorage keys are read and migrated to canonical keys', () => {
  const previousWindow = globalThis.window;
  const backing = new Map();

  const localStorage = {
    getItem(key) {
      return backing.has(key) ? backing.get(key) : null;
    },
    setItem(key, value) {
      backing.set(key, String(value));
    },
    removeItem(key) {
      backing.delete(key);
    }
  };

  globalThis.window = { localStorage };
  try {
    localStorage.setItem('glh-safe-mode', JSON.stringify(true));
    assert.equal(storage.get(STORAGE_KEYS.safeMode, false), true);
    assert.equal(localStorage.getItem(STORAGE_KEYS.safeMode), 'true');

    storage.remove(STORAGE_KEYS.safeMode);
    assert.equal(localStorage.getItem(STORAGE_KEYS.safeMode), null);
    assert.equal(localStorage.getItem('glh-safe-mode'), null);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});
