import test from 'node:test';
import assert from 'node:assert/strict';

import { serializeCsv } from '../utils/exportHelpers.js';

test('serializeCsv builds header and rows', () => {
  const csv = serializeCsv(
    [
      { account: 'Acme', type: 'WEBINAR' },
      { account: 'Northwind', type: 'OFFICE_HOURS' }
    ],
    [
      { label: 'Account', value: (row) => row.account },
      { label: 'Type', value: (row) => row.type }
    ]
  );
  assert.ok(csv.startsWith('Account,Type'));
  assert.ok(csv.includes('Acme,WEBINAR'));
  assert.ok(csv.includes('Northwind,OFFICE_HOURS'));
});

test('serializeCsv escapes commas and quotes', () => {
  const csv = serializeCsv(
    [{ note: 'Quote "and", comma' }],
    [{ label: 'Note', value: (row) => row.note }]
  );
  assert.equal(csv, 'Note\n"Quote ""and"", comma"');
});

