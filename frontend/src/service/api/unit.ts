import { request } from '../request';

/** get unit page */
export function fetchUnitPage(params: Api.Unit.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.Unit.UnitRecord>>({
    url: '/unit/page',
    method: 'get',
    params
  });
}

/** create unit */
export function fetchCreateUnit(data: Api.Unit.CreateParams) {
  return request<Api.Unit.UnitRecord>({
    url: '/unit',
    method: 'post',
    data
  });
}

/** update unit */
export function fetchUpdateUnit(unitCode: string, data: Api.Unit.UpdateParams) {
  return request<Api.Unit.UnitRecord>({
    url: `/unit/${unitCode}`,
    method: 'put',
    data
  });
}

/** delete unit */
export function fetchDeleteUnit(unitCode: string) {
  return request<null>({
    url: `/unit/${unitCode}`,
    method: 'delete'
  });
}

/** get unit detail */
export function fetchGetUnit(unitCode: string) {
  return request<Api.Unit.UnitRecord>({
    url: `/unit/${unitCode}`,
    method: 'get'
  });
}
