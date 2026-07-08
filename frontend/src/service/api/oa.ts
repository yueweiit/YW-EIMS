import { request } from '../request';

/** fetch approval detail by OA code */
export function fetchApprovalDetail(data: { oa_code: string }) {
  return request<Api.Oa.ApprovalDetail | null>({
    url: '/oa/approval/detail',
    method: 'post',
    data
  });
}

/** push purchase order to ERP */
export function fetchSyncToErp(data: Api.Oa.SyncErpParams) {
  return request<Api.Oa.ErpPushResult>({
    url: '/oa/approval/sync-erp',
    method: 'post',
    data
  });
}

/** search suppliers */
export function fetchSearchSupplier(keyword: string) {
  return request<any[]>({
    url: '/oa/search/supplier',
    method: 'get',
    params: { keyword }
  });
}

/** search materials */
export function fetchSearchMaterial(keyword: string) {
  return request<any[]>({
    url: '/oa/search/material',
    method: 'get',
    params: { keyword }
  });
}

/** search units */
export function fetchSearchUnit(keyword?: string) {
  return request<any[]>({
    url: '/oa/search/unit',
    method: 'get',
    params: { keyword }
  });
}

/** search tax rates */
export function fetchSearchTax(keyword?: string) {
  return request<any[]>({
    url: '/oa/search/tax',
    method: 'get',
    params: { keyword }
  });
}
