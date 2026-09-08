import { $t } from '@/locales';
import { downloadExcelFile, readExcelRows } from '@/utils/excel-workbook';

/** Column header aliases mapped to ProductData fields */
const HEADER_MAP: Record<keyof BoxLabel.ProductData, string[]> = {
  dateBatchEnglishName: ['日期/批次/英文名称', '日期', '批次', '英文名称', 'date', 'batch', 'english name', 'dateBatchEnglishName'],
  modelCode: ['品名编码', '品名编码（型号）', '型号', 'model', 'model code', 'modelCode'],
  specification: ['规格/颜色', '规格', '颜色', 'spec', 'specification', 'color'],
  spanishName: ['西语名称', '西班牙语名称', 'spanish', 'spanish name', 'spanishName'],
  boxNo: ['箱号', 'box no', 'box number', 'boxNo'],
  quantity: ['数量', 'qty', 'quantity'],
  weightKg: ['重量', '重量(kg)', '重量（kg）', 'weight', 'weight kg', 'weightKg']
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s()（）]/g, '');
}

function buildHeaderIndex(headers: string[]): Map<keyof BoxLabel.ProductData, number> {
  const mapping = new Map<keyof BoxLabel.ProductData, number>();
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(HEADER_MAP) as [keyof BoxLabel.ProductData, string[]][]) {
    const idx = normalizedHeaders.findIndex(h => aliases.some(a => normalizeHeader(a) === h));
    if (idx !== -1) {
      mapping.set(field, idx);
    }
  }

  return mapping;
}

function createEmptyProduct(): BoxLabel.ProductData {
  return {
    dateBatchEnglishName: '',
    modelCode: '',
    specification: '',
    spanishName: '',
    boxNo: '',
    quantity: '',
    weightKg: ''
  };
}

export interface ImportResult {
  products: BoxLabel.ProductData[];
  matchedColumns: string[];
  skippedRows: number;
}

/**
 * Parse an Excel file and extract product data.
 * Expects the first row to be headers. Supports .xlsx and .csv.
 */
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
                headers: Object.keys(HEADER_MAP)
                  .map(key => $t(`page.ui.${key}`))
                  .join($t('page.ui.listSeparator'))
              })
            )
          );
          return;
        }

        const products: BoxLabel.ProductData[] = [];
        let skippedRows = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Skip empty rows
          if (!row || row.every(cell => String(cell).trim() === '')) {
            skippedRows++;
            continue;
          }

          const product = createEmptyProduct();
          for (const [field, colIdx] of headerIndex) {
            const value = row[colIdx];
            product[field] = value != null ? String(value).trim() : '';
          }
          products.push(product);
        }

        if (products.length === 0) {
          reject(new Error($t('page.ui.excelNoValidRows', { module: $t('page.ui.boxLabelRecords') })));
          return;
        }

        const matchedColumns = [...headerIndex.keys()].map(field => {
          const aliases = HEADER_MAP[field];
          const colIdx = headerIndex.get(field)!;
          return `${headers[colIdx]} → ${aliases[0]}`;
        });

        resolve({ products, matchedColumns, skippedRows });
      } catch (err) {
        reject(new Error($t('page.ui.excelParseFailure', { message: err instanceof Error ? err.message : String(err) })));
      }
    };

    reader.onerror = () => reject(new Error($t('page.ui.excelReadFailure')));
    reader.readAsArrayBuffer(file);
  });
}

const TEMPLATE_HEADERS = [
  '日期/批次/英文名称',
  '品名编码（型号）',
  '规格/颜色',
  '西语名称',
  '箱号',
  '数量',
  '重量 (KG)'
];

const TEMPLATE_SAMPLE = [
  '20260701 / BATCH-001 / LED Light',
  'YW-LED-001',
  '白色 / 30cm',
  'Luz LED',
  '001',
  '100',
  '12.5'
];

/**
 * Generate and download an Excel template file with headers and one sample row.
 */
export function downloadTemplate() {
  return downloadExcelFile('外箱标签导入模板.xlsx', [
    {
      name: '外箱标签',
      rows: [TEMPLATE_HEADERS, TEMPLATE_SAMPLE],
      columnWidths: TEMPLATE_HEADERS.map((header, index) => {
        const sampleLen = String(TEMPLATE_SAMPLE[index] || '').length;
        return Math.max(header.length * 2, sampleLen) + 4;
      })
    }
  ]);
}
