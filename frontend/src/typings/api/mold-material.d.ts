declare namespace Api {
  /**
   * namespace MoldMaterial
   *
   * backend api module: "mold-product/mold-materials"
   */
  namespace MoldMaterial {
    /** mold material record */
    interface MoldMaterialRecord {
      /** record id */
      id: number;
      /** material code */
      typeCode: string;
      /** material name */
      typeName: string;
    }

    /** query params of mold material page */
    interface QueryParams extends Common.CommonSearchParams {
      /** material code */
      typeCode?: string;
      /** material name */
      typeName?: string;
    }

    /** create mold material params */
    interface CreateParams {
      /** material code */
      typeCode: string;
      /** material name */
      typeName: string;
    }

    /** update mold material params */
    interface UpdateParams {
      /** material code */
      typeCode?: string;
      /** material name */
      typeName?: string;
    }
  }
}
