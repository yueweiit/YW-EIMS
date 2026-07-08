declare namespace Api {
  /**
   * namespace CodeRule
   *
   * backend api module: "material-code-rule"
   */
  namespace CodeRule {
    /** code rule record */
    interface CodeRuleRecord {
      /** code prefix */
      codePrefix: string;
      /** explain content */
      explainContent: string;
      /** prefix length for code generation (null = use full prefix) */
      prefixLength: number | null;
    }

    /** query params of code rule page */
    interface QueryParams extends Common.CommonSearchParams {
      /** code prefix */
      codePrefix?: string;
      /** explain content */
      explainContent?: string;
    }

    /** create code rule params */
    interface CreateParams {
      /** code prefix */
      codePrefix: string;
      /** explain content */
      explainContent: string;
      /** prefix length for code generation */
      prefixLength?: number;
    }

    /** update code rule params */
    interface UpdateParams {
      /** explain content */
      explainContent?: string;
      /** prefix length for code generation */
      prefixLength?: number;
    }
  }
}
