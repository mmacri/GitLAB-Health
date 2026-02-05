(function () {
  'use strict';

  var DEFAULT_TIMEZONE = 'America/Los_Angeles';
  var DAY_MS = 24 * 60 * 60 * 1000;
  var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function parseISO(value) {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    }
    if (typeof value !== 'string') return null;
    var text = value.trim();
    if (!text) return null;
    var parsed = ISO_DATE_RE.test(text) ? new Date(text + 'T00:00:00Z') : new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function isValidISO(value) {
    return Boolean(parseISO(value));
  }

  function normalizeTimezone(timezone) {
    return timezone || DEFAULT_TIMEZONE;
  }

  function datePartsInTimezone(date, timezone) {
    var parsed = parseISO(date);
    if (!parsed) return null;
    var tz = normalizeTimezone(timezone);
    var formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    var parts = formatter.formatToParts(parsed);
    var year = Number(parts.find(function (item) { return item.type === 'year'; }).value);
    var month = Number(parts.find(function (item) { return item.type === 'month'; }).value);
    var day = Number(parts.find(function (item) { return item.type === 'day'; }).value);
    return { year: year, month: month, day: day };
  }

  function dateFromParts(parts) {
    if (!parts) return null;
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  }

  function startOfDay(date, timezone) {
    return dateFromParts(datePartsInTimezone(date, timezone));
  }

  function toISODate(date, timezone) {
    var parts = datePartsInTimezone(date, timezone);
    if (!parts) return null;
    return String(parts.year) + '-' + pad(parts.month) + '-' + pad(parts.day);
  }

  function diffInDays(start, end, timezone) {
    var startDay = startOfDay(start, timezone);
    var endDay = startOfDay(end, timezone);
    if (!startDay || !endDay) return null;
    return Math.round((endDay.getTime() - startDay.getTime()) / DAY_MS);
  }

  function addDays(date, days) {
    var parsed = parseISO(date);
    if (!parsed) return null;
    var next = new Date(parsed.getTime());
    next.setUTCDate(next.getUTCDate() + Number(days || 0));
    return next;
  }

  function addMonths(date, months) {
    var parsed = parseISO(date);
    if (!parsed) return null;
    var next = new Date(parsed.getTime());
    var dayOfMonth = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + Number(months || 0));
    var maxDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(dayOfMonth, maxDay));
    return next;
  }

  function quarterInfo(date, timezone) {
    var parts = datePartsInTimezone(date, timezone);
    if (!parts) return null;
    var quarter = Math.floor((parts.month - 1) / 3) + 1;
    return { year: parts.year, quarter: quarter };
  }

  function quarterIndex(date, timezone) {
    var info = quarterInfo(date, timezone);
    if (!info) return null;
    return info.year * 4 + info.quarter;
  }

  function getQuarterStart(date, timezone) {
    var info = quarterInfo(date, timezone);
    if (!info) return null;
    var startMonth = (info.quarter - 1) * 3 + 1;
    return new Date(Date.UTC(info.year, startMonth - 1, 1, 12, 0, 0));
  }

  function getQuarterEnd(date, timezone) {
    var start = getQuarterStart(date, timezone);
    if (!start) return null;
    var nextQuarter = addMonths(start, 3);
    return addDays(nextQuarter, -1);
  }

  function isSameQuarter(a, b, timezone) {
    var aIndex = quarterIndex(a, timezone);
    var bIndex = quarterIndex(b, timezone);
    if (aIndex === null || bIndex === null) return false;
    return aIndex === bIndex;
  }

  function diffInQuarters(from, to, timezone) {
    var fromIndex = quarterIndex(from, timezone);
    var toIndex = quarterIndex(to, timezone);
    if (fromIndex === null || toIndex === null) return null;
    return toIndex - fromIndex;
  }

  function quarterLabel(date, timezone) {
    var info = quarterInfo(date, timezone);
    if (!info) return 'Unknown quarter';
    return 'Q' + info.quarter + ' ' + info.year;
  }

  window.DateUtils = {
    DEFAULT_TIMEZONE: DEFAULT_TIMEZONE,
    parseISO: parseISO,
    isValidISO: isValidISO,
    diffInDays: diffInDays,
    addDays: addDays,
    addMonths: addMonths,
    getQuarterStart: getQuarterStart,
    getQuarterEnd: getQuarterEnd,
    isSameQuarter: isSameQuarter,
    diffInQuarters: diffInQuarters,
    quarterIndex: quarterIndex,
    quarterLabel: quarterLabel,
    toISODate: toISODate,
    datePartsInTimezone: datePartsInTimezone,
    startOfDay: startOfDay
  };
})();
