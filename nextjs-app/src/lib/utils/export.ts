/**
 * CSV Export Utility
 * Functions for exporting data to CSV format
 */

/**
 * Converts a value to CSV-safe string
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape double quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, unknown>>(data: T[]): string {
  if (!data.length) return '';

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create header row
  const headerRow = headers.map(escapeCSVValue).join(',');
  
  // Create data rows
  const dataRows = data.map((row) =>
    headers.map((header) => escapeCSVValue(row[header])).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Downloads data as a CSV file
 */
export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  const csv = arrayToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file (wrapper for common usage)
 */
export function exportDataAsCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  downloadCSV(data, filename);
}
