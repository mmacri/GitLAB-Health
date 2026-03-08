import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync('src/main.js', 'utf8');

test('route wiring passes expected callbacks to pages with action handlers', () => {
  assert.ok(
    mainSource.includes('onBulkAddToProgram: onBulkAddCustomersToProgram'),
    'customers page should receive bulk add-to-program handler'
  );
  assert.ok(
    mainSource.includes('onExportManagerSummary: () => exportManagerSummaryPdf(workspaceModel)'),
    'reports page should receive manager export callback'
  );
  assert.ok(
    mainSource.includes('onExportProgramsCsv: () => exportProgramsCsv(workspaceModel)'),
    'reports page should receive programs csv callback'
  );
  assert.ok(
    mainSource.includes('onExportAccountCsv: (account, options) => exportAccountCsv(account, options)'),
    'exports page should receive account csv callback'
  );
  assert.ok(
    mainSource.includes('onCopyShare: copyShareSnapshot'),
    'exports page should receive snapshot share callback'
  );
  assert.ok(
    mainSource.includes('onLoadSamplePortfolio: onLoadSampleWorkspace'),
    'settings page should receive sample portfolio loader callback'
  );
  assert.ok(
    mainSource.includes('onCreateSnapshot: onCreateMonthlySnapshot'),
    'settings page should receive snapshot creation callback'
  );
});
