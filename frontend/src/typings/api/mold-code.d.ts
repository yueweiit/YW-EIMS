declare namespace Api {
  /**
   * namespace MoldCode
   *
   * backend api module: "mold-product/mold-codes"
   */
  namespace MoldCode {
    /** mold code record */
    interface MoldCodeRecord {
      /** record id */
      id: number;
      /** mold code */
      moldCode: string;
      /** mold type */
      moldType: string;
      /** mold name */
      moldName: string;
      /** mold prefix */
      moldPrefix: string;
      /** material name */
      typeName: string;
      /** material code */
      typeCode: string;
    }

    /** query params of mold code page */
    interface QueryParams extends Common.CommonSearchParams {
      /** mold code */
      moldCode?: string;
      /** mold type */
      moldType?: string;
      /** mold name */
      moldName?: string;
    }

    /** create mold code params */
    interface CreateParams {
      /** mold type */
      moldType: string;
      /** mold name */
      moldName: string;
      /** mold prefix */
      moldPrefix: string;
      /** material name */
      materialName: string;
    }

    /** update mold code params */
    interface UpdateParams {
      /** mold type */
      moldType?: string;
      /** mold name */
      moldName?: string;
      /** mold prefix */
      moldPrefix?: string;
      /** material name */
      materialName?: string;
    }
  }
}
