import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureWorkspaceShape } from '../lib/model.js';
import { deriveRiskSignals, scoreBreakdown } from '../lib/scoring.js';

const buildWorkspace = () =>
  ensureWorkspaceShape({
    version: '3.0.0',
    updatedAt: '2026-03-01T00:00:00.000Z',
    customers: [
      {
        id: 'cust_test',
        name: 'Test Customer',
        tier: 'Premium',
        renewalDate: '2026-12-01',
        arrBand: '$100K-$250K',
        stage: 'Enable',
        primaryUseCase: 'CI/CD',
        contacts: [],
        notes: '',
        tags: []
      }
    ],
    adoption: {
      cust_test: {
        devsecopsStages: {
          Plan: 'Adopted',
          Create: 'Adopted',
          Verify: 'Adopted',
          Package: 'In Progress',
          Secure: 'Not Started',
          Release: 'In Progress',
          Configure: 'Planned',
          Monitor: 'Planned'
        },
        useCases: {
          SCM: { percent: 80, evidence: 'Active' },
          CICD: { percent: 72, evidence: 'Active' },
          Security: { percent: 24, evidence: 'Low' },
          Compliance: { percent: 20, evidence: 'Low' },
          ReleaseAutomation: { percent: 60, evidence: 'Moderate' },
          Observability: { percent: 30, evidence: 'Low' }
        },
        timeToValue: [
          { milestone: 'First repo created', date: '2026-01-10', status: 'Done' },
          { milestone: 'First pipeline run', date: '2026-01-20', status: 'Done' }
        ]
      }
    },
    successPlans: { cust_test: { outcomes: [], milestones: [] } },
    engagements: {
      cust_test: [{ id: 'eng_1', ts: '2026-02-20T12:00:00.000Z', type: '1:1', summary: 'check-in', tags: [], nextSteps: [], owner: 'CSE' }]
    },
    risk: {
      cust_test: { signals: [], playbook: [], dismissals: [], overrideHealth: null }
    },
    expansion: { cust_test: [] },
    voc: [],
    programs: [],
    team: { cseMembers: [] },
    snapshots: [],
    settings: {
      scoringWeights: { adoption: 70, engagement: 20, risk: 10 },
      riskPlaybookTemplates: [],
      programTemplates: []
    }
  });

test('deriveRiskSignals adds secure stage gap signal when CICD is high and Secure is not started', () => {
  const workspace = buildWorkspace();
  const signals = deriveRiskSignals(workspace, 'cust_test', new Date('2026-03-01T00:00:00.000Z'));
  assert.ok(signals.some((item) => item.code === 'STAGE_GAP_SECURE'));
});

test('deriveRiskSignals respects active dismissals', () => {
  const workspace = buildWorkspace();
  workspace.risk.cust_test.dismissals = [
    {
      code: 'STAGE_GAP_SECURE',
      dismissedAt: '2026-02-28T00:00:00.000Z',
      dismissedUntil: '2026-04-01T00:00:00.000Z'
    }
  ];
  const signals = deriveRiskSignals(workspace, 'cust_test', new Date('2026-03-01T00:00:00.000Z'));
  assert.ok(!signals.some((item) => item.code === 'STAGE_GAP_SECURE'));
});

test('scoreBreakdown exposes normalized scoring weights in explainable output', () => {
  const workspace = buildWorkspace();
  const breakdown = scoreBreakdown(workspace, 'cust_test', new Date('2026-03-01T00:00:00.000Z'));
  assert.equal(breakdown.weights.adoption + breakdown.weights.engagement + breakdown.weights.risk, 100);
  assert.ok(breakdown.why.some((line) => line.includes('weight')));
  assert.equal(typeof breakdown.pteScore, 'number');
  assert.equal(typeof breakdown.ptcScore, 'number');
  assert.match(String(breakdown.pteBand), /High|Medium|Low/);
  assert.match(String(breakdown.ptcBand), /High|Medium|Low/);
});
