import { request } from '../request';

/** get ERPNext mapping page */
export function fetchErpNextMappingPage(params: Api.ErpNextMapping.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.ErpNextMapping.ErpNextMappingRecord>>({
    url: '/erpnext-mapping/page',
    method: 'get',
    params
  });
}

/** create ERPNext mapping */
export function fetchCreateErpNextMapping(data: Api.ErpNextMapping.CreateParams) {
  return request<Api.ErpNextMapping.ErpNextMappingRecord>({
    url: '/erpnext-mapping',
    method: 'post',
    data
  });
}

/** update ERPNext mapping */
export function fetchUpdateErpNextMapping(id: number, data: Api.ErpNextMapping.UpdateParams) {
  return request<Api.ErpNextMapping.ErpNextMappingRecord>({
    url: `/erpnext-mapping/${id}`,
    method: 'put',
    data
  });
}

/** delete ERPNext mapping */
export function fetchDeleteErpNextMapping(id: number) {
  return request<null>({
    url: `/erpnext-mapping/${id}`,
    method: 'delete'
  });
}

/** get ERPNext mapping detail */
export function fetchGetErpNextMapping(id: number) {
  return request<Api.ErpNextMapping.ErpNextMappingRecord>({
    url: `/erpnext-mapping/${id}`,
    method: 'get'
  });
}
