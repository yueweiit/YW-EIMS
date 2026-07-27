import { request } from '../request';

/** get material page */
export function fetchMaterialPage(params: Api.Material.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.Material.MaterialRecord>>({
    url: '/material/page',
    method: 'get',
    params
  });
}

/** create material */
export function fetchCreateMaterial(data: Api.Material.CreateParams) {
  return request<Api.Material.MaterialRecord>({
    url: '/material',
    method: 'post',
    data
  });
}

/** update material */
export function fetchUpdateMaterial(id: number, data: Api.Material.UpdateParams) {
  return request<Api.Material.MaterialRecord>({
    url: `/material/${id}`,
    method: 'put',
    data
  });
}

/** delete material */
export function fetchDeleteMaterial(id: number) {
  return request<null>({
    url: `/material/${id}`,
    method: 'delete'
  });
}

/** get material detail */
export function fetchGetMaterial(id: number) {
  return request<Api.Material.MaterialRecord>({
    url: `/material/${id}`,
    method: 'get'
  });
}

/** import materials from excel */
export function fetchImportMaterials(data: Api.Material.CreateParams[]) {
  return request<Api.Material.ImportResult>({
    url: '/material/import',
    method: 'post',
    data
  });
}

/** lookup material by code (local first, then DeepLinkERP) */
export function fetchLookupMaterial(code: string) {
  return request<Api.Material.LookupResult>({
    url: `/material/lookup/${encodeURIComponent(code)}`,
    method: 'get'
  });
}

/** sync all materials from ERP to local */
export function fetchSyncFromErp() {
  return request<Api.Material.SyncResult>({
    url: '/material/sync-from-erp',
    method: 'post'
  });
}
