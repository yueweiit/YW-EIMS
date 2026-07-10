import { request } from '../request';

export function fetchSyncLogPage(params: Api.ErpNextSyncLog.QueryParams) {
  return request<Api.Common.PaginatingQueryRecord<Api.ErpNextSyncLog.SyncLogRecord>>({
    url: '/erpnext-sync-log/page',
    method: 'get',
    params,
  });
}

export function fetchRetrySyncLog(id: number) {
  return request<Api.ErpNextSyncLog.SyncLogRecord>({
    url: `/erpnext-sync-log/${id}/retry`,
    method: 'post',
  });
}
