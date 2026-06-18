declare namespace Api {
  /**
   * namespace User
   *
   * backend api module: "user"
   */
  namespace User {
    interface UserRecord extends Common.CommonRecord {
      /** user name */
      userName: string;
      /** real name */
      realName: string | null;
      /** role codes */
      roles: string[];
      /** button codes */
      buttons: string[];
    }

    /** query params of user page */
    interface QueryParams extends Common.CommonSearchParams {
      /** user name */
      userName?: string;
      /** enable status */
      status?: Common.EnableStatus;
    }

    /** create user params */
    interface CreateParams {
      /** user name */
      userName: string;
      /** password */
      password: string;
      /** real name */
      realName?: string;
      /** role codes */
      roles?: string[];
      /** button codes */
      buttons?: string[];
      /** enable status */
      status?: Common.EnableStatus;
    }

    /** update user params */
    interface UpdateParams {
      /** user name */
      userName?: string;
      /** password */
      password?: string;
      /** real name */
      realName?: string;
      /** role codes */
      roles?: string[];
      /** button codes */
      buttons?: string[];
      /** enable status */
      status?: Common.EnableStatus;
    }
  }
}
