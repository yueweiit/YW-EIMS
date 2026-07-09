declare namespace Api {
  /**
   * namespace Mold
   *
   * backend api module: "mold-product/molds"
   */
  namespace Mold {
    /** mold record */
    interface MoldRecord {
      /** record id */
      id: number;
      /** mold type */
      moldType: string;
      /** mold name */
      moldName: string;
      /** mold code */
      moldCode: string;
      /** phone name */
      phoneName: string;
      /** phone code */
      phoneCode: string;
      /** material code */
      typeCode: string;
      /** material name */
      typeName: string;
      /** item code */
      itemCode: string;
    }

    /** query params of mold page */
    interface QueryParams extends Common.CommonSearchParams {
      /** mold code */
      moldCode?: string;
      /** phone name */
      phoneName?: string;
      /** item code */
      itemCode?: string;
    }

    /** create mold params */
    interface CreateParams {
      /** mold code */
      moldCode: string;
      /** phone name */
      phoneName: string;
    }

    /** update mold params */
    interface UpdateParams {
      /** mold code */
      moldCode?: string;
      /** phone name */
      phoneName?: string;
    }

    /** import mold params */
    interface ImportParams {
      /** rows to import */
      rows: { moldCode: string; phoneName: string }[];
    }
  }
}
