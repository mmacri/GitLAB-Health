import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const accounts = JSON.parse(readFileSync('data/accounts.json', 'utf8')).accounts || [];

test('accounts use engagement.next_ebr_date as a single EBR source of truth', () => {
  accounts.forEach((account) => {
    assert.ok(account.engagement, `${account.id}: engagement object is required`);
    assert.ok(
      Object.prototype.hasOwnProperty.call(account.engagement, 'next_ebr_date'),
      `${account.id}: engagement.next_ebr_date is required`
    );
    assert.ok(
      !Object.prototype.hasOwnProperty.call(account, 'next_ebr_date'),
      `${account.id}: top-level next_ebr_date should not exist`
    );
  });
});
