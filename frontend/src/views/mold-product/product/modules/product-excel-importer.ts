import * as XLSX from 'xlsx';
import { $t } from '@/locales';

export interface ProductImportRow {
  productType: string;
  phoneShortName: string;
}

export interface ImportResult {
  rows: ProductImportRow[];
  matchedColumns: string[];
  skippedRows: number;
}

const HEADER_MAP: Record<keyof ProductImportRow, string[]> = {
  productType: ['产品类型', 'product type', 'productType'],
  phoneShortName: ['手机简称', '手机', 'phone short name', 'phoneShortName']
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s()（）]/g, '');
}

function buildHeaderIndex(headers: string[]): Map<keyof ProductImportRow, number> {
  const mapping = new Map<keyof ProductImportRow, number>();
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(HEADER_MAP) as [keyof ProductImportRow, string[]][]) {
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

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          reject(new Error($t('page.ui.excelNoWorksheet')));
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: '' });

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
                headers: [$t('page.ui.productType'), $t('page.ui.phoneShortName')].join($t('page.ui.listSeparator'))
              })
            )
          );
          return;
        }

        const requiredFields: (keyof ProductImportRow)[] = ['productType', 'phoneShortName'];
        for (const field of requiredFields) {
          if (!headerIndex.has(field)) {
            const labelMap: Record<keyof ProductImportRow, string> = {
              productType: $t('page.ui.productType'),
              phoneShortName: $t('page.ui.phoneShortName')
            };
            const label = labelMap[field];
            reject(new Error($t('page.ui.excelMissingRequiredColumns', { columns: label })));
            return;
          }
        }

        const result: ProductImportRow[] = [];
        let skippedRows = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(cell => String(cell).trim() === '')) {
            skippedRows++;
            continue;
          }

          const item: ProductImportRow = {
            productType: '',
            phoneShortName: ''
          };

          for (const [field, colIdx] of headerIndex) {
            const value = row[colIdx];
            const str = value != null ? String(value).trim() : '';
            if (str) {
              Object.assign(item, { [field]: str });
            }
          }

          if (!item.productType || !item.phoneShortName) {
            skippedRows++;
            continue;
          }

          result.push(item);
        }

        if (result.length === 0) {
          reject(new Error($t('page.ui.excelNoValidRows', { module: $t('page.ui.productRecords') })));
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

const EXPORT_HEADERS = ['产品编码', '产品类型', '产品名称', '手机简称', '手机编码', '颜色编码', '颜色名称', '项目编码'];

export function exportProducts(data: { productCode: string; productType: string; productName: string; phoneShortName: string; phoneCode: string; colorCode: string; colorName: string; itemCode: string }[]) {
  const rows = data.map(r => [
    r.productCode,
    r.productType,
    r.productName,
    r.phoneShortName,
    r.phoneCode,
    r.colorCode,
    r.colorName,
    r.itemCode
  ]);

  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
  ws['!cols'] = EXPORT_HEADERS.map((h, i) => {
    const maxLen = rows.reduce((max, row) => Math.max(max, String(row[i] || '').length), h.length);
    return { wch: maxLen + 4 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '产品数据');
  XLSX.writeFile(wb, `产品数据_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const TEMPLATE_HEADERS = ['产品类型', '手机简称'];
const TEMPLATE_SAMPLE = ['手机壳', 'iPhone16'];

export interface TemplateRefData {
  productCodes: { productType: string; productCode: string; productName: string; colorName: string; colorCode: string }[];
}

export function downloadTemplate(refData?: TemplateRefData) {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);

  ws['!cols'] = TEMPLATE_HEADERS.map((h, i) => {
    const sampleLen = String(TEMPLATE_SAMPLE[i] || '').length;
    return { wch: Math.max(h.length * 2, sampleLen) + 4 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '产品导入');

  if (refData && refData.productCodes.length > 0) {
    const codeRows = refData.productCodes.map(r => [r.productType, r.productCode, r.productName, r.colorName, r.colorCode]);
    const codeSheet = XLSX.utils.aoa_to_sheet([
      ['产品类型', '产品编码', '产品名称', '颜色名称', '颜色编码'],
      ...codeRows
    ]);
    codeSheet['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
      { wch: 12 },
      { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, codeSheet, '产品编码说明');
  }

  XLSX.writeFile(wb, '产品导入模板.xlsx');
}
