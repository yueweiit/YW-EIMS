<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPagination, NPopconfirm, NSpace, NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchSyncLogPage, fetchRetrySyncLog } from '@/service/api';
import { $t } from '@/locales';
import SyncLogSearch from './modules/sync-log-search.vue';

defineOptions({
  name: 'ErpNextSyncLog'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.ErpNextSyncLog.SyncLogRecord[]>([]);
const queryParams = reactive<Api.ErpNextSyncLog.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const entityTypeTagMap = computed<Record<Api.ErpNextSyncLog.EntityType, { label: string; type: 'info' | 'success' | 'default' }>>(() => ({
  MOLD: { label: $t('page.ui.entityMold'), type: 'info' },
  PRODUCT: { label: $t('page.ui.entityProduct'), type: 'success' },
  MATERIAL: { label: $t('page.ui.entityMaterial'), type: 'default' }
}));

const statusTagMap = computed<Record<Api.ErpNextSyncLog.SyncLogStatus, { label: string; type: 'success' | 'error' | 'warning' | 'default' }>>(() => ({
  PENDING: { label: $t('page.ui.syncPending'), type: 'default' },
  SUCCESS: { label: $t('page.ui.syncSuccess'), type: 'success' },
  FAILED: { label: $t('page.ui.syncFailure'), type: 'error' },
  SKIPPED: { label: $t('page.ui.syncSkipped'), type: 'warning' }
}));

const columns = computed<DataTableColumns<Api.ErpNextSyncLog.SyncLogRecord>>(() => [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'entityType',
    title: $t('page.ui.entityType'),
    width: 100,
    render: row => {
      const cfg = entityTypeTagMap.value[row.entityType] || { label: row.entityType, type: 'default' as const };
      return h(NTag, { size: 'small', type: cfg.type }, { default: () => cfg.label });
    }
  },
  {
    key: 'entityCode',
    title: $t('page.ui.code'),
    minWidth: 140,
    ellipsis: { tooltip: true }
  },
  {
    key: 'entityName',
    title: $t('page.ui.name'),
    minWidth: 180,
    ellipsis: { tooltip: true }
  },
  {
    key: 'status',
    title: $t('page.ui.status'),
    width: 100,
    render: row => {
      const cfg = statusTagMap.value[row.status] || { label: row.status, type: 'default' as const };
      return h(NTag, { size: 'small', type: cfg.type }, { default: () => cfg.label });
    }
  },
  {
    key: 'message',
    title: $t('page.ui.message'),
    minWidth: 200,
    ellipsis: { tooltip: true }
  },
  {
    key: 'retryCount',
    title: $t('page.ui.retryCount'),
    width: 90,
    align: 'center'
  },
  {
    key: 'lastTriedAt',
    title: $t('page.ui.lastAttempt'),
    width: 170,
    render: row => (row.lastTriedAt ? new Date(row.lastTriedAt).toLocaleString() : '-')
  },
  {
    key: 'operate',
    title: $t('common.operate'),
    width: 100,
    fixed: 'right',
    align: 'center',
    render: row => {
      if (row.status !== 'FAILED') return null;
      return h(
        NPopconfirm,
        { onPositiveClick: () => handleRetry(row) },
        {
          trigger: () =>
            h(NButton, { size: 'small', type: 'warning', ghost: true }, { default: () => $t('page.ui.retry') }),
          default: () => $t('page.ui.confirmRetry')
        }
      );
    }
  }
]);

async function getData() {
  startLoading();
  try {
    const { data, error } = await fetchSyncLogPage({ ...queryParams });
    if (!error && data) {
      tableData.value = data.records;
      total.value = data.total;
      queryParams.current = data.current;
      queryParams.size = data.size;
    }
  } finally {
    endLoading();
  }
}

function handleSearch() {
  queryParams.current = 1;
  getData();
}

function handleReset() {
  queryParams.entityCode = undefined;
  queryParams.entityType = undefined;
  queryParams.status = undefined;
  queryParams.current = 1;
  getData();
}

async function handleRetry(row: Api.ErpNextSyncLog.SyncLogRecord) {
  const { error } = await fetchRetrySyncLog(row.id);
  if (!error) {
    window.$message?.success($t('page.ui.retryCompleted'));
    getData();
  }
}

function handlePageChange(page: number) {
  queryParams.current = page;
  getData();
}

function handlePageSizeChange(size: number) {
  queryParams.current = 1;
  queryParams.size = size;
  getData();
}

getData();
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false">
      <NSpace justify="space-between" align="center" wrap>
        <SyncLogSearch v-model="queryParams" @search="handleSearch" @reset="handleReset" />
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NDataTable
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="false"
        remote
        :row-key="(row: Api.ErpNextSyncLog.SyncLogRecord) => row.id"
        striped
      />
      <div class="flex justify-end mt-16px">
        <NPagination
          v-model:page="queryParams.current"
          v-model:page-size="queryParams.size"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </NCard>
  </NSpace>
</template>
