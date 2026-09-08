import ExcelJS from 'exceljs';

export type ExcelCellValue = string | number | boolean | Date | null | undefined;

export interface ExcelSheetDefinition {
  name: string;
  rows: readonly (readonly unknown[])[];
  columnWidths?: readonly number[];
}

export async function readExcelRows(file: File): Promise<unknown[][]> {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.csv')) {
    return parseCsv(await file.text());
  }
  if (fileName.endsWith('.xls')) {
    throw new Error('仅支持 .xlsx 和 .csv 文件，请另存为新版 Excel 文件后重试');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: true }, row => {
    const values = row.values;
    rows.push(
      Array.isArray(values)
        ? values.slice(1).map(value => normalizeReadCell(value))
        : [],
    );
  });
  return rows;
}

export async function downloadExcelFile(
  fileName: string,
  sheets: readonly ExcelSheetDefinition[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EIMS';

  for (const definition of sheets) {
    const worksheet = workbook.addWorksheet(definition.name.slice(0, 31));
    definition.rows.forEach(row => {
      worksheet.addRow(row.map(value => normalizeWriteCell(value)));
    });
    if (definition.columnWidths?.length) {
      worksheet.columns = definition.columnWidths.map(width => ({ width }));
    }
  }

  const output = await workbook.xlsx.writeBuffer();
  const blob = new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function normalizeReadCell(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  if ('result' in record) return normalizeReadCell(record.result);
  if (typeof record.text === 'string') return record.text;
  if (Array.isArray(record.richText)) {
    return record.richText
      .map(item => {
        if (typeof item !== 'object' || item === null) return '';
        const text = (item as Record<string, unknown>).text;
        return typeof text === 'string' ? text : '';
      })
      .join('');
  }
  if (typeof record.hyperlink === 'string') {
    return typeof record.text === 'string' ? record.text : record.hyperlink;
  }
  return String(value);
}

function normalizeWriteCell(value: unknown): ExcelCellValue {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return String(value);
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}
