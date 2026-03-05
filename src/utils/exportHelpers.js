const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const serializeCsv = (rows, columns) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeColumns = Array.isArray(columns) ? columns : [];
  const header = safeColumns.map((column) => csvEscape(column.label)).join(',');
  const body = safeRows
    .map((row) =>
      safeColumns
        .map((column) => {
          const value = typeof column.value === 'function' ? column.value(row) : row?.[column.key];
          return csvEscape(value);
        })
        .join(',')
    )
    .join('\n');
  return `${header}\n${body}`;
};

export const downloadTextFile = (filename, content, mimeType = 'text/plain;charset=utf-8') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

