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
    mainSource.includes('onBulkApplyPlaybook: onWorkspaceBulkApplyPlaybook'),
    'risks page should receive bulk playbook apply callback'
  );
  assert.ok(
    mainSource.includes('currentMode: state.viewMode'),
    'mode tabs should receive currentMode prop'
  );
  assert.ok(
    mainSource.includes('onSelect: (mode) => setViewMode(mode)'),
    'mode tabs should receive onSelect callback'
  );
  assert.ok(
    mainSource.includes('deep: (workspacePortfolio.expansionCandidates || []).length'),
    'mode tabs deep count should map to deep key'
  );
  assert.ok(
    mainSource.includes("onSelectCustomer: (customerId) => {"),
    'exports page should receive customer selection callback'
  );
  assert.ok(
    mainSource.includes('onExportVocCsv: () => exportVocCsv(workspaceModel)'),
    'exports page should receive voc export callback'
  );
  assert.ok(
    mainSource.includes("if (typeof target === 'string') {"),
    'exports page account export callback should support workspace customer ids'
  );
  assert.ok(
    mainSource.includes('return exportAccountCsv(workspaceModel, { ...options, customerId: target });'),
    'exports page should resolve customer id exports through workspace model'
  );
  assert.ok(
    mainSource.includes('onExportManagerSummary: () => exportManagerSummaryPdf(workspaceModel)'),
    'exports page should receive manager summary export callback'
  );
  assert.ok(
    mainSource.includes('return exportAccountSummaryPdf(workspaceModel, { ...options, customerId: target });'),
    'exports page should resolve customer pdf exports through workspace model'
  );
  assert.ok(
    mainSource.includes('onExportProgramsCsv: () => exportProgramsCsv(workspaceModel)'),
    'exports page should receive programs export callback'
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
