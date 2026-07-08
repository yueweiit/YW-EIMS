import * as XLSX from 'xlsx';

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
 * Expects the first row to be headers. Supports .xlsx, .xls, .csv.
 */
export function parseExcelFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          reject(new Error('Excel 文件中没有工作表'));
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: '' });

        if (rows.length < 2) {
          reject(new Error('Excel 文件至少需要表头行和一行数据'));
          return;
        }

        const headers = rows[0].map(h => String(h));
        const headerIndex = buildHeaderIndex(headers);

        if (headerIndex.size === 0) {
          reject(new Error('未匹配到任何列，请确保表头包含以下字段之一：' +
            Object.values(HEADER_MAP).flat().slice(0, 10).join('、') + ' 等'));
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
          reject(new Error('Excel 文件中没有有效数据行'));
          return;
        }

        const matchedColumns = [...headerIndex.keys()].map(field => {
          const aliases = HEADER_MAP[field];
          const colIdx = headerIndex.get(field)!;
          return `${headers[colIdx]} → ${aliases[0]}`;
        });

        resolve({ products, matchedColumns, skippedRows });
      } catch (err) {
        reject(new Error(`解析 Excel 文件失败: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    reader.onerror = () => reject(new Error('读取文件失败'));
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
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);

  // Auto-fit column widths
  ws['!cols'] = TEMPLATE_HEADERS.map((h, i) => {
    const sampleLen = String(TEMPLATE_SAMPLE[i] || '').length;
    return { wch: Math.max(h.length * 2, sampleLen) + 4 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '外箱标签');
  XLSX.writeFile(wb, '外箱标签导入模板.xlsx');
}
