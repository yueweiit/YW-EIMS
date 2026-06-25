declare namespace Api {
  /**
   * namespace PhoneModel
   *
   * backend api module: "mold-product/phone-models"
   */
  namespace PhoneModel {
    /** phone model record */
    interface PhoneModelRecord {
      /** record id */
      id: number;
      /** phone code */
      phoneCode: string;
      /** phone name */
      phoneName: string;
      /** phone short name */
      phoneShortName: string | null;
    }

    /** query params of phone model page */
    interface QueryParams extends Common.CommonSearchParams {
      /** phone name */
      phoneName?: string;
    }

    /** create phone model params */
    interface CreateParams {
      /** phone name */
      phoneName: string;
      /** phone short name */
      phoneShortName?: string;
    }

    /** update phone model params */
    interface UpdateParams {
      /** phone name */
      phoneName?: string;
      /** phone short name */
      phoneShortName?: string;
    }
  }
}
