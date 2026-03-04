import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeDuplicateAccountContent } from '../lib/dataLoader.js';

const baseAccount = (id, name) => ({
  id,
  name,
  lifecycle_stage: 'enable',
  health: { lifecycle_stage: 'enable' },
  adoption: { platform_adoption_level: '1 of 4 use cases green' },
  outcomes: {
    objectives: [
      { title: 'Increase CI reliability and reduce failed pipelines' },
      { title: 'Expand Secure controls to critical repositories' }
    ],
    executive_summary: `${name} summary`
  },
  internal_only: {
    sentiment_notes: 'Delivery sentiment stable; continue value narrative updates.',
    expansion_hypotheses: ['A', 'B']
  }
});

test('duplicate objective and sentiment content is diversified', () => {
  const accounts = [
    baseAccount('a1', 'Account 1'),
    baseAccount('a2', 'Account 2'),
    baseAccount('a3', 'Account 3'),
    baseAccount('a4', 'Account 4')
  ];

  const normalized = normalizeDuplicateAccountContent(accounts);
  const titles = normalized.flatMap((account) => account.outcomes.objectives.map((objective) => objective.title));
  const sentiments = normalized.map((account) => account.internal_only.sentiment_notes);

  assert.ok(new Set(titles).size > 2);
  assert.ok(new Set(sentiments).size > 1);
  assert.ok(normalized.every((account) => account.outcomes.executive_summary.includes(account.name)));
});
