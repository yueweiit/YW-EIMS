/** Box Label Generator types */
declare namespace BoxLabel {
  /** Product data for box label */
  interface ProductData {
    /** 日期/批次 */
    dateBatch: string;
    /** 英文名称 */
    englishName: string;
    /** 品名编码（型号） */
    modelCode: string;
    /** 规格 */
    specification: string;
    /** 西语名称 */
    spanishName: string;
    /** 箱号 */
    boxNo: string;
    /** 数量 */
    quantity: string;
    /** 重量 (KG) */
    weightKg: string;
  }
}
