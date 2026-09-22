/**
 * Safe utility to extract string and text value from ExcelJS CellValue
 */
export function getExcelCellString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value).trim();
  if (typeof value === 'object') {
    if ('text' in value && value.text !== undefined && value.text !== null) {
      return String(value.text).trim();
    }
    if (
      'result' in value &&
      value.result !== undefined &&
      value.result !== null
    ) {
      return String(value.result).trim();
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText
        .map((rt: any) => rt?.text || '')
        .join('')
        .trim();
    }
  }
  return String(value).trim();
}
