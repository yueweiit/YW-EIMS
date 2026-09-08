import { $t } from '@/locales';
import {
  downloadExcelFile,
  readExcelRows,
  type ExcelSheetDefinition
} from '@/utils/excel-workbook';

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
                headers: [$t('page.ui.applicant'), $t('page.ui.materialName'), $t('page.ui.codePrefix')].join($t('page.ui.listSeparator'))
              })
            )
          );
          return;
        }

        const requiredFields: (keyof MaterialImportRow)[] = ['applicant', 'materialName', 'codePrefix'];
        for (const field of requiredFields) {
          if (!headerIndex.has(field)) {
            const labelMap: Record<keyof MaterialImportRow, string> = {
              applicant: $t('page.ui.applicant'),
              materialName: $t('page.ui.materialName'),
              codePrefix: $t('page.ui.codePrefix'),
              unit: $t('page.ui.unitLabel'),
              specifications: $t('page.ui.specifications')
            };
            const label = labelMap[field];
            reject(new Error($t('page.ui.excelMissingRequiredColumns', { columns: label })));
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
              Object.assign(item, { [field]: str });
            }
          }

          if (!item.applicant || !item.materialName || !item.codePrefix) {
            skippedRows++;
            continue;
          }

          result.push(item);
        }

        if (result.length === 0) {
          reject(new Error($t('page.ui.excelNoValidRows', { module: $t('page.ui.materialRecords') })));
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

  const columnWidths = EXPORT_HEADERS.map((header, index) => {
    const maxLen = rows.reduce(
      (max, row) => Math.max(max, String(row[index] || '').length),
      header.length
    );
    return maxLen + 4;
  });

  return downloadExcelFile(`物料数据_${new Date().toISOString().slice(0, 10)}.xlsx`, [
    { name: '物料数据', rows: [EXPORT_HEADERS, ...rows], columnWidths }
  ]);
}

const TEMPLATE_HEADERS = ['申请人', '物料名称', '编码前缀', '单位', '规格型号'];
const TEMPLATE_SAMPLE = ['张三', 'LED灯珠', 'FL', '个', '白色/3W'];

export interface TemplateRefData {
  units: { unitCode: string; unit: string }[];
  codeRules: { codePrefix: string; explainContent: string; prefixLength: number | null }[];
}

export function downloadTemplate(refData?: TemplateRefData) {
  const sheets: ExcelSheetDefinition[] = [
    {
      name: '物料导入',
      rows: [TEMPLATE_HEADERS, TEMPLATE_SAMPLE],
      columnWidths: TEMPLATE_HEADERS.map((header, index) => {
        const sampleLen = String(TEMPLATE_SAMPLE[index] || '').length;
        return Math.max(header.length * 2, sampleLen) + 4;
      })
    }
  ];
  if (refData) {
    const prefixRows = refData.codeRules.map(r => {
      const effectivePrefix = r.prefixLength ? r.codePrefix.substring(0, r.prefixLength) : r.codePrefix;
      return [r.codePrefix, r.prefixLength ?? '', effectivePrefix, r.explainContent];
    });
    sheets.push({
      name: '前缀说明',
      rows: [
        ['编码前缀', '编码位数', '实际生成前缀', '前缀说明'],
        ...prefixRows
      ],
      columnWidths: [12, 10, 14, 30]
    });

    const unitRows = refData.units.map(u => [u.unitCode, u.unit]);
    sheets.push({
      name: '单位列表',
      rows: [['单位编码', '单位名称'], ...unitRows],
      columnWidths: [10, 16]
    });
  }

  return downloadExcelFile('物料导入模板.xlsx', sheets);
}
