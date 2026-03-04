import { toIsoDate } from './date.js';
import { redactObjectForCustomer } from './redaction.js';
import { storage, STORAGE_KEYS } from './storage.js';

const sanitizeText = (value) => String(value || '').trim();

const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const loadEngagementLog = () => {
  const entries = storage.get(STORAGE_KEYS.engagementLog, []);
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((item) => item && typeof item === 'object')
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
};

export const saveEngagementLog = (entries) => {
  storage.set(STORAGE_KEYS.engagementLog, Array.isArray(entries) ? entries : []);
};

export const addEngagementLogEntry = (entry) => {
  const current = loadEngagementLog();
  const now = new Date();
  const normalized = {
    id: entry?.id || `eng-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    account_id: sanitizeText(entry?.account_id),
    account_name: sanitizeText(entry?.account_name),
    date: sanitizeText(entry?.date) || toIsoDate(now),
    type: sanitizeText(entry?.type) || 'cadence call',
    notes_customer_safe: sanitizeText(entry?.notes_customer_safe),
    notes_internal: sanitizeText(entry?.notes_internal),
    created_at: entry?.created_at || now.toISOString()
  };
  const next = [normalized, ...current].slice(0, 500);
  saveEngagementLog(next);
  return normalized;
};

export const listEngagementEventsForAccount = (accountId, options = {}) => {
  const customerSafe = Boolean(options.customerSafe);
  const items = loadEngagementLog().filter((item) => item.account_id === accountId);
  if (!customerSafe) return items;
  return items.map((item) => redactObjectForCustomer(item));
};

export const buildEngagementLogJson = (entries, options = {}) => {
  const customerSafe = Boolean(options.customerSafe);
  const safeEntries = customerSafe ? (entries || []).map((item) => redactObjectForCustomer(item)) : entries || [];
  return JSON.stringify(safeEntries, null, 2);
};

export const buildEngagementLogCsv = (entries, options = {}) => {
  const customerSafe = Boolean(options.customerSafe);
  const columns = customerSafe
    ? ['id', 'account_id', 'account_name', 'date', 'type', 'notes_customer_safe', 'created_at']
    : ['id', 'account_id', 'account_name', 'date', 'type', 'notes_customer_safe', 'notes_internal', 'created_at'];
  const rows = (entries || []).map((item) => (customerSafe ? redactObjectForCustomer(item) : item));
  const header = columns.map((column) => csvEscape(column)).join(',');
  const body = rows.map((row) => columns.map((column) => csvEscape(row?.[column])).join(',')).join('\n');
  return `${header}\n${body}`;
};
