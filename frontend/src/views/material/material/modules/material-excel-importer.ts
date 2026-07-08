import * as XLSX from 'xlsx';

export interface MaterialImportRow {
  applicant: string;
  materialName: string;
  codePrefix: string;
  unit?: string;
  specifications?: string;
}

export interface ImportResult {
  rows: MaterialImportRow[];
  matchedColumns: string[];
  skippedRows: number;
}

const HEADER_MAP: Record<keyof MaterialImportRow, string[]> = {
  applicant: ['申请人', 'applicant'],
  materialName: ['物料名称', '物料名', 'material name', 'materialName'],
  codePrefix: ['编码前缀', '前缀', 'code prefix', 'codePrefix'],
  unit: ['单位', 'unit'],
  specifications: ['规格型号', '规格', 'specifications', 'spec']
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s()（）]/g, '');
}

function buildHeaderIndex(headers: string[]): Map<keyof MaterialImportRow, number> {
  const mapping = new Map<keyof MaterialImportRow, number>();
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(HEADER_MAP) as [keyof MaterialImportRow, string[]][]) {
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
          reject(new Error('未匹配到任何列，请确保表头包含：申请人、物料名称、编码前缀'));
          return;
        }

        const requiredFields: (keyof MaterialImportRow)[] = ['applicant', 'materialName', 'codePrefix'];
        for (const field of requiredFields) {
          if (!headerIndex.has(field)) {
            const label = HEADER_MAP[field][0];
            reject(new Error(`缺少必填列：${label}`));
            return;
          }
        }

        const result: MaterialImportRow[] = [];
        let skippedRows = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(cell => String(cell).trim() === '')) {
            skippedRows++;
            continue;
          }

          const item: MaterialImportRow = {
            applicant: '',
            materialName: '',
            codePrefix: ''
          };

          for (const [field, colIdx] of headerIndex) {
            const value = row[colIdx];
            const str = value != null ? String(value).trim() : '';
            if (str) {
              (item as Record<string, string>)[field] = str;
            }
          }

          if (!item.applicant || !item.materialName || !item.codePrefix) {
            skippedRows++;
            continue;
          }

          result.push(item);
        }

        if (result.length === 0) {
          reject(new Error('Excel 文件中没有有效数据行（申请人、物料名称、编码前缀不能为空）'));
          return;
        }

        const matchedColumns = [...headerIndex.keys()].map(field => {
          const aliases = HEADER_MAP[field];
          const colIdx = headerIndex.get(field)!;
          return `${headers[colIdx]} → ${aliases[0]}`;
        });

        resolve({ rows: result, matchedColumns, skippedRows });
      } catch (err) {
        reject(new Error(`解析 Excel 文件失败: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsArrayBuffer(file);
  });
}

const EXPORT_HEADERS = ['申请人', '申请日期', '物料名称', '规格型号', '单位', '编码', '编码前缀', '前缀说明', '单位编码'];

export function exportMaterials(data: { applicant: string; applicationDate: string | null; materialName: string; specifications: string | null; unit: string | null; code: string | null; codePrefix: string | null; explainContent: string | null; unitCode: string | null }[]) {
  const rows = data.map(r => [
    r.applicant,
    r.applicationDate || '',
    r.materialName,
    r.specifications || '',
    r.unit || '',
    r.code || '',
    r.codePrefix || '',
    r.explainContent || '',
    r.unitCode || ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
  ws['!cols'] = EXPORT_HEADERS.map((h, i) => {
    const maxLen = rows.reduce((max, row) => Math.max(max, String(row[i] || '').length), h.length);
    return { wch: maxLen + 4 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '物料数据');
  XLSX.writeFile(wb, `物料数据_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const TEMPLATE_HEADERS = ['申请人', '物料名称', '编码前缀', '单位', '规格型号'];
const TEMPLATE_SAMPLE = ['张三', 'LED灯珠', 'FL', '个', '白色/3W'];

export interface TemplateRefData {
  units: { unitCode: string; unit: string }[];
  codeRules: { codePrefix: string; explainContent: string; prefixLength: number | null }[];
}

export function downloadTemplate(refData?: TemplateRefData) {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);

  ws['!cols'] = TEMPLATE_HEADERS.map((h, i) => {
    const sampleLen = String(TEMPLATE_SAMPLE[i] || '').length;
    return { wch: Math.max(h.length * 2, sampleLen) + 4 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '物料导入');

  if (refData) {
    const prefixRows = refData.codeRules.map(r => {
      const effectivePrefix = r.prefixLength ? r.codePrefix.substring(0, r.prefixLength) : r.codePrefix;
      return [r.codePrefix, r.prefixLength ?? '', effectivePrefix, r.explainContent];
    });
    const prefixSheet = XLSX.utils.aoa_to_sheet([
      ['编码前缀', '编码位数', '实际生成前缀', '前缀说明'],
      ...prefixRows
    ]);
    prefixSheet['!cols'] = [
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, prefixSheet, '前缀说明');

    const unitRows = refData.units.map(u => [u.unitCode, u.unit]);
    const unitSheet = XLSX.utils.aoa_to_sheet([
      ['单位编码', '单位名称'],
      ...unitRows
    ]);
    unitSheet['!cols'] = [
      { wch: 10 },
      { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, unitSheet, '单位列表');
  }

  XLSX.writeFile(wb, '物料导入模板.xlsx');
}
