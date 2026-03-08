import test from 'node:test';
import assert from 'node:assert/strict';

import { programIdsMatch, toProgramLookupKey } from '../lib/programIdentity.js';

test('toProgramLookupKey normalizes legacy and workspace program IDs to a shared key', () => {
  assert.equal(toProgramLookupKey('PGM-2026-001'), 'prog_pgm_2026_001');
  assert.equal(toProgramLookupKey('prog_pgm_2026_001'), 'prog_pgm_2026_001');
  assert.equal(toProgramLookupKey('  PGM 2026 001  '), 'prog_pgm_2026_001');
});

test('programIdsMatch handles mixed legacy/workspace formats', () => {
  assert.equal(programIdsMatch('PGM-2026-001', 'prog_pgm_2026_001'), true);
  assert.equal(programIdsMatch('prog_cicd_adoption_lab_q2', 'cicd adoption lab q2'), true);
  assert.equal(programIdsMatch('PGM-2026-001', 'PGM-2026-002'), false);
  assert.equal(programIdsMatch('', 'PGM-2026-002'), false);
});
