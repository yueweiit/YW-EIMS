import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

// Initialize pdfmake VFS using typed API
pdfMake.addVirtualFileSystem(pdfFonts);

// Configure font families using typed API
const fontConfig: TFontDictionary = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  },
  SimHei: {
    normal: 'SimHei.ttf',
    bold: 'SimHei.ttf',
    italics: 'SimHei.ttf',
    bolditalics: 'SimHei.ttf'
  }
};
pdfMake.addFonts(fontConfig);

const FONT = 'SimHei';

/**
 * Load SimHei font and add to VFS
 */
async function loadSimHeiFont(): Promise<void> {
  // Skip if already loaded
  if (pdfFonts['SimHei.ttf']) {
    return;
  }

  console.log('[PDF] Loading SimHei font...');
  const response = await fetch('/fonts/SimHei.ttf');
  
  if (!response.ok) {
    throw new Error(`Font load failed: ${response.status}`);
  }

  // Get font as ArrayBuffer and convert to base64
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  
  // Add to VFS using typed API
  pdfMake.addVirtualFileSystem({ 'SimHei.ttf': base64 });
  
  console.log('[PDF] SimHei font loaded');
}

/**
 * Generate box label PDF
 */
export async function generateBoxLabelPdf(products: BoxLabel.ProductData[]): Promise<void> {
  if (!products.length) {
    window.$message?.warning('请至少添加一个产品');
    return;
  }

  try {
    // Ensure font is loaded
    await loadSimHeiFont();

    const content: any[] = [];

    products.forEach((product, index) => {
      if (index > 0) {
        content.push({ text: '', pageBreak: 'before' });
      }

      content.push(
        { text: '外箱标签 / BOX LABEL', font: FONT, fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
        { text: `产品 ${index + 1} / Product ${index + 1}`, font: FONT, fontSize: 14, color: '#555', alignment: 'center', margin: [0, 0, 0, 15] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 500, y2: 0, lineWidth: 1 }] },
        { text: '产品基本信息 / Product Information', font: FONT, fontSize: 12, bold: true, margin: [0, 10, 0, 8] },
        createTable([
          ['日期/批次 Date/Batch', product.dateBatch || '-'],
          ['英文名称 English Name', product.englishName || '-'],
          ['品名编码（型号）Model Code', product.modelCode || '-'],
          ['规格 Specification', product.specification || '-'],
          ['西语名称 Spanish Name', product.spanishName || '-']
        ]),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 500, y2: 0, lineWidth: 0.5 }], margin: [0, 10, 0, 10] },
        { text: '箱号数据 / Box Data', font: FONT, fontSize: 12, bold: true, margin: [0, 0, 0, 8] },
        createTable([
          ['箱号 Box No.', product.boxNo || '-'],
          ['数量 Quantity', product.quantity || '-'],
          ['重量 Weight (KG)', product.weightKg || '-']
        ]),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 500, y2: 0, lineWidth: 1 }], margin: [0, 15, 0, 10] },
        { text: `打印日期: ${new Date().toLocaleDateString('zh-CN')}`, font: FONT, fontSize: 9, color: '#888', alignment: 'right' }
      );
    });

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A5',
      pageMargins: [30, 20, 30, 20],
      content,
      defaultStyle: { font: FONT, fontSize: 11 }
    };

    console.log('[PDF] Creating document...');
    pdfMake.createPdf(docDefinition).download('box-labels.pdf');
    window.$message?.success('PDF 已生成');
  } catch (err) {
    console.error('[PDF] Error:', err);
    window.$message?.error('PDF 生成失败');
  }
}

function createTable(rows: string[][]): any {
  return {
    table: {
      widths: ['40%', '60%'],
      body: rows.map(([label, value]) => [
        { text: label, font: FONT, margin: [0, 4, 0, 4] },
        { text: value, font: FONT, margin: [0, 4, 0, 4] }
      ])
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#ccc',
      vLineColor: () => '#ccc',
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 4,
      paddingBottom: () => 4
    }
  };
}
