declare namespace Api {
  /**
   * namespace Color
   *
   * backend api module: "mold-product/colors"
   */
  namespace Color {
    /** color record */
    interface ColorRecord {
      /** record id */
      id: number;
      /** color code */
      colorCode: string;
      /** color name */
      colorName: string;
    }

    /** query params of color page */
    interface QueryParams extends Common.CommonSearchParams {
      /** color code */
      colorCode?: string;
      /** color name */
      colorName?: string;
    }

    /** create color params */
    interface CreateParams {
      /** color code */
      colorCode: string;
      /** color name */
      colorName: string;
    }

    /** update color params */
    interface UpdateParams {
      /** color code */
      colorCode?: string;
      /** color name */
      colorName?: string;
    }
  }
}
