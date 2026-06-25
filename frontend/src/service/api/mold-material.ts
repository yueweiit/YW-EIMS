import { request } from '../request';

/** get mold material page */
export function fetchMoldMaterialPage(params: Api.MoldMaterial.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.MoldMaterial.MoldMaterialRecord>>({
    url: '/mold-product/mold-materials/page',
    method: 'get',
    params
  });
}

/** create mold material */
export function fetchCreateMoldMaterial(data: Api.MoldMaterial.CreateParams) {
  return request<Api.MoldMaterial.MoldMaterialRecord>({
    url: '/mold-product/mold-materials',
    method: 'post',
    data
  });
}

/** update mold material */
export function fetchUpdateMoldMaterial(id: number, data: Api.MoldMaterial.UpdateParams) {
  return request<Api.MoldMaterial.MoldMaterialRecord>({
    url: `/mold-product/mold-materials/${id}`,
    method: 'put',
    data
  });
}

/** delete mold material */
export function fetchDeleteMoldMaterial(id: number) {
  return request<null>({
    url: `/mold-product/mold-materials/${id}`,
    method: 'delete'
  });
}

/** get mold material detail */
export function fetchGetMoldMaterial(id: number) {
  return request<Api.MoldMaterial.MoldMaterialRecord>({
    url: `/mold-product/mold-materials/${id}`,
    method: 'get'
  });
}
