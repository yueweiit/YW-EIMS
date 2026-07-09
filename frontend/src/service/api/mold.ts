import { request } from '../request';

/** get mold page */
export function fetchMoldPage(params: Api.Mold.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.Mold.MoldRecord>>({
    url: '/mold-product/molds/page',
    method: 'get',
    params
  });
}

/** create mold */
export function fetchCreateMold(data: Api.Mold.CreateParams) {
  return request<Api.Mold.MoldRecord>({
    url: '/mold-product/molds',
    method: 'post',
    data
  });
}

/** update mold */
export function fetchUpdateMold(id: number, data: Api.Mold.UpdateParams) {
  return request<Api.Mold.MoldRecord>({
    url: `/mold-product/molds/${id}`,
    method: 'put',
    data
  });
}

/** delete mold */
export function fetchDeleteMold(id: number) {
  return request<null>({
    url: `/mold-product/molds/${id}`,
    method: 'delete'
  });
}

/** get mold detail */
export function fetchGetMold(id: number) {
  return request<Api.Mold.MoldRecord>({
    url: `/mold-product/molds/${id}`,
    method: 'get'
  });
}

/** import molds from excel */
export function fetchImportMolds(data: Api.Mold.ImportParams) {
  return request<{ success: number; failed: number; errors: string[] }>({
    url: '/mold-product/molds/import',
    method: 'post',
    data
  });
}
