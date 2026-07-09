declare namespace Api {
  /**
   * namespace Product
   *
   * backend api module: "mold-product/products"
   */
  namespace Product {
    /** product record */
    interface ProductRecord {
      /** record id */
      id: number;
      /** product type */
      productType: string;
      /** product name */
      productName: string;
      /** product code */
      productCode: string;
      /** phone short name */
      phoneShortName: string;
      /** phone code */
      phoneCode: string;
      /** color name */
      colorName: string;
      /** color code */
      colorCode: string;
      /** item code */
      itemCode: string;
    }

    /** query params of product page */
    interface QueryParams extends Common.CommonSearchParams {
      /** product type */
      productType?: string;
      /** phone short name */
      phoneShortName?: string;
      /** item code */
      itemCode?: string;
    }

    /** create product params */
    interface CreateParams {
      /** product type */
      productType: string;
      /** phone short name */
      phoneShortName: string;
    }

    /** update product params */
    interface UpdateParams {
      /** product type */
      productType?: string;
      /** phone short name */
      phoneShortName?: string;
    }

    /** import product params */
    interface ImportParams {
      /** rows to import */
      rows: { productType: string; phoneShortName: string }[];
    }
  }
}
