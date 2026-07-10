declare namespace Api.ErpNextSyncLog {
  type SyncLogStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  type EntityType = 'MOLD' | 'PRODUCT' | 'MATERIAL';

  interface SyncLogRecord {
    id: number;
    entityType: EntityType;
    entityCode: string;
    entityName: string | null;
    itemGroup: string | null;
    status: SyncLogStatus;
    message: string | null;
    requestPayload: any;
    responseData: any;
    retryCount: number;
    lastTriedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }

  interface QueryParams extends Api.Common.CommonSearchParams {
    entityType?: EntityType;
    status?: SyncLogStatus;
    entityCode?: string;
  }
}
