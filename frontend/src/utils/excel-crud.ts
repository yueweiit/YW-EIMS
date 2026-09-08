import { $t } from '@/locales';
import { downloadExcelFile, readExcelRows } from './excel-workbook';

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

export async function parseCrudExcelFile<TRecord, TImport extends Record<string, any>>(
  file: File,
  columns: ExcelColumn<TRecord, TImport>[],
  moduleName: string
): Promise<ExcelParseResult<TImport>> {
  try {
    const rows = await readExcelRows(file);
    if (rows.length < 2) {
      throw new Error($t('page.ui.excelNeedRows'));
    }

    const headerMap = buildHeaderMap(rows[0], columns);
    const importColumns = columns.filter(column => column.importable !== false);
    const requiredColumns = importColumns.filter(column => column.required);
    const missingHeaders = requiredColumns.filter(column => !headerMap.has(column.key));

    if (missingHeaders.length) {
      throw new Error(
        $t('page.ui.excelMissingRequiredColumns', {
          columns: missingHeaders.map(column => column.label).join($t('page.ui.listSeparator'))
        })
      );
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
      throw new Error($t('page.ui.excelNoValidRows', { module: moduleName }));
    }

    return { rows: parsedRows };
  } catch (err) {
    throw new Error(
      $t('page.ui.excelParseFailure', {
        message: err instanceof Error ? err.message : String(err)
      })
    );
  }
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

  return downloadExcelFile(`${moduleName}${$t('page.ui.templateFileSuffix')}.xlsx`, [
    {
      name: `${moduleName}${$t('page.ui.importSheetSuffix')}`,
      rows: [header, example, tip],
      columnWidths: importColumns.map(column => Math.max(column.label.length * 2, 14))
    }
  ]);
}

export function exportCrudRows<TRecord, TImport>(
  rows: TRecord[],
  columns: ExcelColumn<TRecord, TImport>[],
  moduleName: string
) {
  const exportColumns = columns.filter(column => column.exportable !== false);
  const data = rows.map(row =>
    exportColumns.map(column =>
      column.exportValue ? column.exportValue(row) : (row as Record<string, CellValue>)[column.key]
    )
  );

  return downloadExcelFile(
    `${moduleName}${$t('page.ui.dataFileSuffix')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    [
      {
        name: moduleName,
        rows: [exportColumns.map(column => column.label), ...data],
        columnWidths: exportColumns.map(column => Math.max(column.label.length * 2, 14))
      }
    ]
  );
}
