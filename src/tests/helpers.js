import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

export const readJson = (relativePath) =>
  JSON.parse(readFileSync(path.resolve(repoRoot, relativePath), 'utf8'));
