export interface ApiResponse<T = unknown> {
  code: string;
  msg: string;
  data: T;
}

export const SUCCESS_CODE = '0000';
