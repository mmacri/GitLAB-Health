export const CUSTOMER_SAFE_FIELDS = {
  hidden: [
    'arr',
    'renewalRisk',
    'churnProbability',
    'internalNotes',
    'healthRawScore',
    'licenseCount',
    'contractEndDate',
    'npsScore',
    'escalationFlag',
    'ownerEmail'
  ],
  anonymized: ['accountName', 'cseName']
};

export const CUSTOMER_SAFE_LABELS = {
  arr: 'ARR',
  renewalRisk: 'Renewal Risk',
  churnProbability: 'Churn Probability',
  internalNotes: 'Internal Notes',
  healthRawScore: 'Raw Health Score',
  licenseCount: 'License Count',
  contractEndDate: 'Contract End Date',
  npsScore: 'NPS Score',
  escalationFlag: 'Escalation Flag',
  ownerEmail: 'Owner Email',
  accountName: 'Account Name',
  cseName: 'CSE Name'
};

export const CUSTOMER_SAFE_ANONYMIZED_VALUES = {
  accountName: 'Your Organization',
  cseName: 'Your GitLab CSE'
};

