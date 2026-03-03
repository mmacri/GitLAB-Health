import { formatDate } from './date.mjs';

const safe = (value) => (value ? String(value).trim() : 'Not provided');

export const buildIssueBody = (request, account) => {
  const lines = [
    '# CSE On-Demand Engagement Request',
    '',
    `- Account: ${safe(account?.name || request.account_id)}`,
    `- Account ID: ${safe(request.account_id)}`,
    `- Requestor Role: ${safe(request.requestor_role)}`,
    `- Lifecycle Stage: ${safe(request.stage)}`,
    `- Topic: ${safe(request.topic)}`,
    `- Due Date: ${formatDate(request.due_date)}`,
    `- Assigned To: ${safe(request.assigned_to || 'CSE Pool')}`,
    '',
    '## Desired Outcome',
    safe(request.desired_outcome),
    '',
    '## Definition of Done',
    safe(request.definition_of_done),
    '',
    '## Notes',
    safe(request.notes || 'None'),
    '',
    '## Delivery Plan',
    '- [ ] Confirm triage owner and kickoff date',
    '- [ ] Select 1:many program (webinar/lab/office hours) to accelerate adoption',
    '- [ ] Log measurable adoption and outcome deltas before close'
  ];
  return lines.join('\n');
};

export const buildCustomerAgenda = (request, account) => {
  const lines = [
    `Meeting Agenda: ${safe(account?.name || request.account_id)} CSE Session`,
    '',
    '1. Confirm outcome goals and success criteria',
    `   - Stage: ${safe(request.stage)}`,
    `   - Topic: ${safe(request.topic)}`,
    '2. Review current adoption and engagement baseline',
    `3. Define execution plan for: ${safe(request.desired_outcome)}`,
    `4. Agree definition of done: ${safe(request.definition_of_done)}`,
    `5. Confirm timeline and owners (target: ${formatDate(request.due_date)})`,
    '6. Confirm next check-in and required evidence'
  ];
  return lines.join('\n');
};

export const buildFollowupEmail = (request, account) => {
  const subject = `Subject: Follow-up | ${safe(account?.name || request.account_id)} ${safe(request.topic)} On-Demand Session`;
  const lines = [
    subject,
    '',
    `Hi team,`,
    '',
    `Thank you for joining todays session for ${safe(account?.name || request.account_id)}.`,
    '',
    'Agreed outcome',
    safe(request.desired_outcome),
    '',
    'Definition of done',
    safe(request.definition_of_done),
    '',
    'Next actions',
    '- Confirm owners and dates for each implementation task',
    '- Track adoption and outcome evidence in your collaboration project',
    `- Target completion date: ${formatDate(request.due_date)}`,
    '',
    'Please reply with any blockers so we can route support through the pooled CSE queue.',
    '',
    'Regards,',
    'GitLab Customer Success Engineering'
  ];
  return lines.join('\n');
};