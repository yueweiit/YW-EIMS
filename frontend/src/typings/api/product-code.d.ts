declare namespace Api {
  /**
   * namespace ProductCode
   *
   * backend api module: "mold-product/product-codes"
   */
  namespace ProductCode {
    /** product code record */
    interface ProductCodeRecord {
      /** record id */
      id: number;
      /** product code */
      productCode: string;
      /** product type */
      productType: string;
      /** product name */
      productName: string;
      /** color code */
      colorCode: string;
      /** color name */
      colorName: string;
    }

    /** query params of product code page */
    interface QueryParams extends Common.CommonSearchParams {
      /** product code */
      productCode?: string;
      /** product type */
      productType?: string;
      /** product name */
      productName?: string;
    }

    /** create product code params */
    interface CreateParams {
      /** product code */
      productCode: string;
      /** product type */
      productType: string;
      /** product name */
      productName: string;
      /** color code */
      colorCode: string;
      /** color name */
      colorName: string;
    }

    /** update product code params */
    interface UpdateParams {
      /** product code */
      productCode?: string;
      /** product type */
      productType?: string;
      /** product name */
      productName?: string;
      /** color code */
      colorCode?: string;
      /** color name */
      colorName?: string;
    }
  }
}
