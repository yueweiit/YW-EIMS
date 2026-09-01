import * as XLSX from 'xlsx';
import { $t } from '@/locales';

type CellValue = string | number | null | undefined;

export interface ExcelColumn<TRecord, TImport = TRecord> {
  key: keyof TImport & string;
  label: string;
  aliases?: string[];
  required?: boolean;
  importable?: boolean;
  exportable?: boolean;
  example?: CellValue;
  exportValue?: (row: TRecord) => CellValue;
  parseValue?: (value: string) => TImport[keyof TImport];
}

export interface ExcelParseResult<T> {
  rows: T[];
}

function normalizeHeader(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function getCellText(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function buildHeaderMap<TRecord, TImport>(headers: unknown[], columns: ExcelColumn<TRecord, TImport>[]) {
  const map = new Map<keyof TImport & string, number>();

  columns.filter(column => column.importable !== false).forEach(column => {
    const candidates = [column.label, column.key, ...(column.aliases || [])].map(normalizeHeader);
    const index = headers.findIndex(header => candidates.includes(normalizeHeader(header)));
    if (index >= 0) {
      map.set(column.key, index);
    }
  });

  return map;
}

export function parseCrudExcelFile<TRecord, TImport extends Record<string, any>>(
  file: File,
  columns: ExcelColumn<TRecord, TImport>[],
  moduleName: string
): Promise<ExcelParseResult<TImport>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          reject(new Error($t('page.ui.excelNoWorksheet')));
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });

        if (rows.length < 2) {
          reject(new Error($t('page.ui.excelNeedRows')));
          return;
        }

        const headerMap = buildHeaderMap(rows[0], columns);
        const importColumns = columns.filter(column => column.importable !== false);
        const requiredColumns = importColumns.filter(column => column.required);
        const missingHeaders = requiredColumns.filter(column => !headerMap.has(column.key));

        if (missingHeaders.length) {
          reject(
            new Error(
              $t('page.ui.excelMissingRequiredColumns', {
                columns: missingHeaders.map(column => column.label).join($t('page.ui.listSeparator'))
              })
            )
          );
          return;
        }

        const parsedRows: TImport[] = [];

        rows.slice(1).forEach((row, rowIndex) => {
          const item: Record<string, unknown> = {};

          importColumns.forEach(column => {
            const index = headerMap.get(column.key);
            if (index === undefined) return;

            const rawValue = getCellText(row[index]);
            if (!rawValue) return;

            item[column.key] = column.parseValue ? column.parseValue(rawValue) : rawValue;
          });

          const missingValues = requiredColumns.filter(column => !getCellText(item[column.key]));
          if (!Object.keys(item).length) return;

          if (missingValues.length) {
            throw new Error(
              $t('page.ui.excelMissingRowValues', {
                row: rowIndex + 2,
                fields: missingValues.map(column => column.label).join($t('page.ui.listSeparator'))
              })
            );
          }

          parsedRows.push(item as TImport);
        });

        if (!parsedRows.length) {
          reject(new Error($t('page.ui.excelNoValidRows', { module: moduleName })));
          return;
        }

        resolve({ rows: parsedRows });
      } catch (err) {
        reject(new Error($t('page.ui.excelParseFailure', { message: err instanceof Error ? err.message : String(err) })));
      }
    };

    reader.onerror = () => reject(new Error($t('page.ui.excelReadFailure')));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadCrudTemplate<TRecord, TImport>(
  columns: ExcelColumn<TRecord, TImport>[],
  moduleName: string,
  sample?: Partial<TImport>
) {
  const importColumns = columns.filter(column => column.importable !== false);
  const header = importColumns.map(column => column.label);
  const example = importColumns.map(column => {
    const sampleValue = sample?.[column.key as keyof TImport];
    return sampleValue ?? column.example ?? '';
  });
  const tip = importColumns.map(column => (column.required ? $t('page.ui.requiredField') : $t('page.ui.optionalField')));

  const worksheet = XLSX.utils.aoa_to_sheet([header, example, tip]);
  worksheet['!cols'] = importColumns.map(column => ({ wch: Math.max(column.label.length * 2, 14) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${moduleName}${$t('page.ui.importSheetSuffix')}`);
  XLSX.writeFile(workbook, `${moduleName}${$t('page.ui.templateFileSuffix')}.xlsx`);
}

export function exportCrudRows<TRecord, TImport>(
  rows: TRecord[],
  columns: ExcelColumn<TRecord, TImport>[],
  moduleName: string
) {
  const exportColumns = columns.filter(column => column.exportable !== false);
  const data = rows.map(row => {
    const item: Record<string, CellValue> = {};

    exportColumns.forEach(column => {
      item[column.label] = column.exportValue ? column.exportValue(row) : (row as Record<string, CellValue>)[column.key];
    });

    return item;
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { header: exportColumns.map(column => column.label) });
  worksheet['!cols'] = exportColumns.map(column => ({ wch: Math.max(column.label.length * 2, 14) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, moduleName);
  XLSX.writeFile(workbook, `${moduleName}${$t('page.ui.dataFileSuffix')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
