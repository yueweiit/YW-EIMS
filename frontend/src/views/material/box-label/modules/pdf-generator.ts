import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

// Initialize pdfmake VFS with default Roboto fonts
pdfMake.addVirtualFileSystem(pdfFonts);

// Roboto font config (already in VFS)
const ROBOTO_FONT_CONFIG: TFontDictionary = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};
pdfMake.addFonts(ROBOTO_FONT_CONFIG);

const FONT = 'SimHei';
let simHeiLoadPromise: Promise<void> | null = null;
let thisSideUpImage: string | null = null;

/**
 * Load SimHei font and register it
 * Uses Promise caching to prevent concurrent fetch requests
 */
function loadSimHeiFont(): Promise<void> {
  // Return existing promise if already loading or loaded
  if (simHeiLoadPromise) {
    return simHeiLoadPromise;
  }

  // Create and cache the promise
  simHeiLoadPromise = (async () => {
    console.log('[PDF] Loading SimHei font...');
    const response = await fetch('/fonts/SimHei.ttf');

    if (!response.ok) {
      // Reset promise on failure so it can be retried
      simHeiLoadPromise = null;
      throw new Error(`Font load failed: ${response.status}`);
    }

    // Convert to base64
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Add font file to VFS
    pdfMake.addVirtualFileSystem({ 'SimHei.ttf': base64 });

    // Register font family AFTER font is in VFS
    const simHeiConfig: TFontDictionary = {
      SimHei: {
        normal: 'SimHei.ttf',
        bold: 'SimHei.ttf',
        italics: 'SimHei.ttf',
        bolditalics: 'SimHei.ttf'
      }
    };
    pdfMake.addFonts(simHeiConfig);

    console.log('[PDF] SimHei font loaded and registered');
  })();

  return simHeiLoadPromise;
}

/**
 * Load THIS-SIDE-UP image and convert to base64 data URI
 */
async function loadThisSideUpImage(): Promise<string> {
  if (thisSideUpImage) {
    return thisSideUpImage;
  }

  console.log('[PDF] Loading THIS-SIDE-UP image...');
  const response = await fetch('/images/THIS-SIDE-UP.png');

  if (!response.ok) {
    throw new Error(`Image load failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  thisSideUpImage = `data:image/png;base64,${btoa(binary)}`;

  console.log('[PDF] THIS-SIDE-UP image loaded');
  return thisSideUpImage;
}

// Fixed content for labels
const FIXED = {
  origin: 'País de origen: Hecho en China',
  importer: 'Importador: Yuewei S.A DE C.V',
  address: 'Dirección: Eje oriente poniente manzana 5 lote 1, zona industrial Tizayuca, Tizayuca Hidalgo C.P 43804 México',
  rfc: 'RFC: YUE190305H42'
};

/**
 * Generate box label PDF
 */
export async function generateBoxLabelPdf(products: BoxLabel.ProductData[]): Promise<void> {
  if (!products.length) {
    window.$message?.warning('请至少添加一个产品');
    return;
  }

  try {
    await loadSimHeiFont();
    const thisSideUpSrc = await loadThisSideUpImage();

    const content: Content[] = [];

    products.forEach((product, index) => {
      if (index > 0) {
        content.push({ text: '', pageBreak: 'before' });
      }

      content.push(
        // Main content: left text + right images
        {
          columns: [
            // Left: text content
            {
              width: '*',
              stack: [
                { text: product.dateBatchEnglishName || '-', font: FONT, fontSize: 32, bold: true, margin: [0, 0, 0, 20] },
                { text: `MODEL 型号：${product.modelCode || '-'}`, font: FONT, fontSize: 20, margin: [0, 6, 0, 6] },
                { text: `Especificaciones 规格：${product.specification || '-'}`, font: FONT, fontSize: 20, margin: [0, 6, 0, 6] },
                { text: `QTY 数量：${product.quantity || '-'} PIEZA`, font: FONT, fontSize: 20, margin: [0, 6, 0, 6] },
                { text: `GW 毛重：${product.weightKg || '-'} KG`, font: FONT, fontSize: 20, margin: [0, 6, 0, 6] },
                { text: `#NO 箱号：${product.boxNo || '-'}`, font: FONT, fontSize: 20, margin: [0, 6, 0, 0] }
              ]
            },
            // Right: QR code + THIS-SIDE-UP image
            {
              width: 180,
              stack: [
                { qr: product.modelCode || '-', fit: 150, eccLevel: 'M', alignment: 'center' },
                { image: thisSideUpSrc, fit: [150, 150], alignment: 'center', margin: [0, 16, 0, 0] }
              ]
            }
          ],
          margin: [0, 0, 0, 16]
        },

        // Separator
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 750, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 10] },

        // Product name in Spanish
        { text: 'Nombre del producto:', font: FONT, fontSize: 18, margin: [0, 10, 0, 6] },
        { text: product.spanishName || '-', font: FONT, fontSize: 20, margin: [0, 0, 0, 14] },

        // Fixed: Origin
        { text: FIXED.origin, font: FONT, fontSize: 16, margin: [0, 6, 0, 6] },

        // Content (same as quantity)
        { text: `Contenido: ${product.quantity || '-'} PIEZA`, font: FONT, fontSize: 16, margin: [0, 6, 0, 14] },

        // Separator
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 750, y2: 0, lineWidth: 1 }], margin: [0, 10, 0, 10] },

        // Fixed: Importer
        { text: FIXED.importer, font: FONT, fontSize: 16, margin: [0, 6, 0, 6] },

        // Fixed: Address
        { text: FIXED.address, font: FONT, fontSize: 16, margin: [0, 6, 0, 6] },

        // Fixed: RFC
        { text: FIXED.rfc, font: FONT, fontSize: 16, margin: [0, 6, 0, 0] }
      );
    });

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [30, 20, 30, 20],
      content,
      defaultStyle: { font: FONT, fontSize: 18 }
    };

    console.log('[PDF] Creating document...');
    pdfMake.createPdf(docDefinition).download('box-labels.pdf');
    window.$message?.success('PDF 已生成');
  } catch (err) {
    console.error('[PDF] Error:', err);
    window.$message?.error('PDF 生成失败');
  }
}
