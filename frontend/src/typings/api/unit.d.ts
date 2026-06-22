declare namespace Api {
  /**
   * namespace Unit
   *
   * backend api module: "unit"
   */
  namespace Unit {
    /** unit record */
    interface UnitRecord {
      /** unit code */
      unitCode: string;
      /** unit */
      unit: string;
    }

    /** query params of unit page */
    interface QueryParams extends Common.CommonSearchParams {
      /** unit code */
      unitCode?: string;
      /** unit */
      unit?: string;
    }

    /** create unit params */
    interface CreateParams {
      /** unit code */
      unitCode: string;
      /** unit */
      unit: string;
    }

    /** update unit params */
    interface UpdateParams {
      /** unit */
      unit?: string;
    }
  }
}
