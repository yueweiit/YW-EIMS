declare namespace Api {
  /**
   * namespace Material
   *
   * backend api module: "material"
   */
  namespace Material {
    /** material record */
    interface MaterialRecord {
      /** record id */
      id: number;
      /** applicant */
      applicant: string;
      /** application date */
      applicationDate: string | null;
      /** material name */
      materialName: string;
      /** specifications */
      specifications: string | null;
      /** unit */
      unit: string | null;
      /** material code */
      code: string | null;
      /** code prefix */
      codePrefix: string | null;
      /** explain content */
      explainContent: string | null;
      /** unit code */
      unitCode: string | null;
    }

    /** query params of material page */
    interface QueryParams extends Common.CommonSearchParams {
      /** applicant */
      applicant?: string;
      /** material name */
      materialName?: string;
      /** material code */
      code?: string;
      /** code prefix */
      codePrefix?: string;
      /** unit code */
      unitCode?: string;
      /** unit */
      unit?: string;
    }

    /** create material params */
    interface CreateParams {
      /** applicant */
      applicant: string;
      /** material name */
      materialName: string;
      /** code prefix */
      codePrefix: string;
      /** unit */
      unit?: string;
      /** specifications */
      specifications?: string;
    }

    /** update material params */
    interface UpdateParams {
      /** applicant */
      applicant?: string;
      /** material name */
      materialName?: string;
      /** specifications */
      specifications?: string;
      /** unit */
      unit?: string;
      /** code prefix */
      codePrefix?: string;
    }

    /** import result */
    interface ImportResult {
      success: number;
      failed: number;
      errors: string[];
    }
  }
}
