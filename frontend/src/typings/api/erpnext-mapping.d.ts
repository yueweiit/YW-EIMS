declare namespace Api {
  /**
   * namespace ErpNextMapping
   *
   * backend api module: "erpnext-mapping"
   */
  namespace ErpNextMapping {
    type MappingType = 'ITEM_GROUP' | 'MOLD_ITEM_GROUP' | 'PRODUCT_ITEM_GROUP' | 'UNIT';

    /** ERPNext mapping record */
    interface ErpNextMappingRecord {
      id: number;
      type: MappingType;
      sourceKey: string;
      targetValue: string;
    }

    /** query params of ERPNext mapping page */
    interface QueryParams extends Common.CommonSearchParams {
      type?: MappingType;
      sourceKey?: string;
    }

    /** create ERPNext mapping params */
    interface CreateParams {
      type: MappingType;
      sourceKey: string;
      targetValue: string;
    }

    /** update ERPNext mapping params */
    interface UpdateParams {
      type?: MappingType;
      sourceKey?: string;
      targetValue?: string;
    }
  }
}
