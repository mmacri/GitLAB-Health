import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWorkspaceIntegrity } from '../src/lib/validators.js';
import { ensureWorkspaceShape } from '../src/lib/model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const samplePath = path.join(root, 'data', 'workspace.sample.json');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const main = () => {
  const sampleDoc = readJson(samplePath);
  const candidate = sampleDoc?.workspace || sampleDoc;
  const workspace = ensureWorkspaceShape(candidate);
  const result = validateWorkspaceIntegrity(workspace);

  if (result.warnings.length) {
    console.log('Workspace integrity warnings:');
    result.warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (!result.ok) {
    console.error('Workspace integrity check failed:');
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log('Workspace integrity check passed.');
};

main();

