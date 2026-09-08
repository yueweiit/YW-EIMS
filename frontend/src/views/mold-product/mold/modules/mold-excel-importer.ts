import { $t } from '@/locales';
import {
  downloadExcelFile,
  readExcelRows,
  type ExcelSheetDefinition
} from '@/utils/excel-workbook';

export interface MoldImportRow {
  moldCode: string;
  phoneName: string;
}

export interface ImportResult {
  rows: MoldImportRow[];
  matchedColumns: string[];
  skippedRows: number;
}

const HEADER_MAP: Record<keyof MoldImportRow, string[]> = {
  moldCode: ['模具编码', 'mold code', 'moldCode'],
  phoneName: ['手机名称', '手机', 'phone name', 'phoneName']
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s()（）]/g, '');
}

function buildHeaderIndex(headers: string[]): Map<keyof MoldImportRow, number> {
  const mapping = new Map<keyof MoldImportRow, number>();
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(HEADER_MAP) as [keyof MoldImportRow, string[]][]) {
    const idx = normalizedHeaders.findIndex(h => aliases.some(a => normalizeHeader(a) === h));
    if (idx !== -1) {
      mapping.set(field, idx);
    }
  }

  return mapping;
}

export function parseExcelFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const rows = await readExcelRows(file);
        if (!rows.length) {
          reject(new Error($t('page.ui.excelNoWorksheet')));
          return;
        }

        if (rows.length < 2) {
          reject(new Error($t('page.ui.excelNeedRows')));
          return;
        }

        const headers = rows[0].map(h => String(h));
        const headerIndex = buildHeaderIndex(headers);

        if (headerIndex.size === 0) {
          reject(
            new Error(
              $t('page.ui.excelRequiredHeaderHint', {
                headers: [$t('page.ui.moldCode'), $t('page.ui.phoneName')].join($t('page.ui.listSeparator'))
              })
            )
          );
          return;
        }

        const requiredFields: (keyof MoldImportRow)[] = ['moldCode', 'phoneName'];
        for (const field of requiredFields) {
          if (!headerIndex.has(field)) {
            const labelMap: Record<keyof MoldImportRow, string> = {
              moldCode: $t('page.ui.moldCode'),
              phoneName: $t('page.ui.phoneName')
            };
            const label = labelMap[field];
            reject(new Error($t('page.ui.excelMissingRequiredColumns', { columns: label })));
            return;
          }
        }

        const result: MoldImportRow[] = [];
        let skippedRows = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(cell => String(cell).trim() === '')) {
            skippedRows++;
            continue;
          }

          const item: MoldImportRow = {
            moldCode: '',
            phoneName: ''
          };

          for (const [field, colIdx] of headerIndex) {
            const value = row[colIdx];
            const str = value != null ? String(value).trim() : '';
            if (str) {
              Object.assign(item, { [field]: str });
            }
          }

          if (!item.moldCode || !item.phoneName) {
            skippedRows++;
            continue;
          }

          result.push(item);
        }

        if (result.length === 0) {
          reject(new Error($t('page.ui.excelNoValidRows', { module: $t('page.ui.moldRecords') })));
          return;
        }

        const matchedColumns = [...headerIndex.keys()].map(field => {
          const aliases = HEADER_MAP[field];
          const colIdx = headerIndex.get(field)!;
          return `${headers[colIdx]} → ${aliases[0]}`;
        });

        resolve({ rows: result, matchedColumns, skippedRows });
      } catch (err) {
        reject(new Error($t('page.ui.excelParseFailure', { message: err instanceof Error ? err.message : String(err) })));
      }
    };

    reader.onerror = () => reject(new Error($t('page.ui.excelReadFailure')));
    reader.readAsArrayBuffer(file);
  });
}

const EXPORT_HEADERS = ['模具编码', '模具类型', '模具名称', '手机名称', '手机编码', '材质编码', '材质名称', '项目编码'];

export function exportMolds(data: { moldCode: string; moldType: string; moldName: string; phoneName: string; phoneCode: string; typeCode: string; typeName: string; itemCode: string }[]) {
  const rows = data.map(r => [
    r.moldCode,
    r.moldType,
    r.moldName,
    r.phoneName,
    r.phoneCode,
    r.typeCode,
    r.typeName,
    r.itemCode
  ]);

  const columnWidths = EXPORT_HEADERS.map((header, index) => {
    const maxLen = rows.reduce(
      (max, row) => Math.max(max, String(row[index] || '').length),
      header.length
    );
    return maxLen + 4;
  });

  return downloadExcelFile(`模具数据_${new Date().toISOString().slice(0, 10)}.xlsx`, [
    { name: '模具数据', rows: [EXPORT_HEADERS, ...rows], columnWidths }
  ]);
}

const TEMPLATE_HEADERS = ['模具编码', '手机名称'];
const TEMPLATE_SAMPLE = ['TM01', 'iPhone 16 Pro'];

export interface TemplateRefData {
  moldCodes: { moldCode: string; moldType: string; moldName: string; typeName: string }[];
}

export function downloadTemplate(refData?: TemplateRefData) {
  const sheets: ExcelSheetDefinition[] = [
    {
      name: '模具导入',
      rows: [TEMPLATE_HEADERS, TEMPLATE_SAMPLE],
      columnWidths: TEMPLATE_HEADERS.map((header, index) => {
        const sampleLen = String(TEMPLATE_SAMPLE[index] || '').length;
        return Math.max(header.length * 2, sampleLen) + 4;
      })
    }
  ];
  if (refData && refData.moldCodes.length > 0) {
    const codeRows = refData.moldCodes.map(r => [r.moldCode, r.moldType, r.moldName, r.typeName]);
    sheets.push({
      name: '模具编码说明',
      rows: [
        ['模具编码', '模具类型', '模具名称', '材质名称'],
        ...codeRows
      ],
      columnWidths: [12, 16, 20, 16]
    });
  }

  return downloadExcelFile('模具导入模板.xlsx', sheets);
}
