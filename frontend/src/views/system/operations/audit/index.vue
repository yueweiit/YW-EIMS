<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NAlert, NButton, NCard, NDataTable, NInput, NPagination, NSelect, NSpace, NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchSecurityAuditPage } from '@/service/api';
import type { SecurityAuditRecord } from '@/service/api/audit';
import { $t } from '@/locales';

defineOptions({ name: 'SecurityAuditManage' });

const { loading, startLoading, endLoading } = useLoading(false);
const tableData = ref<SecurityAuditRecord[]>([]);
const total = ref(0);
const queryParams = reactive({
  current: 1,
  size: 20,
  event: undefined as string | undefined,
  result: undefined as string | undefined
});

const resultOptions = computed(() => [
  { label: $t('page.ui.auditSuccess'), value: 'success' },
  { label: $t('page.ui.auditFailure'), value: 'failure' },
  { label: $t('page.ui.auditDenied'), value: 'denied' }
]);
const resultText = computed<Record<string, string>>(() => ({
  success: $t('page.ui.auditSuccess'),
  failure: $t('page.ui.auditFailure'),
  denied: $t('page.ui.auditDenied')
}));
const resultType: Record<string, 'success' | 'error' | 'warning'> = {
  success: 'success',
  failure: 'error',
  denied: 'warning'
};

const columns = computed<DataTableColumns<SecurityAuditRecord>>(() => [
  { key: 'createdAt', title: $t('page.ui.auditTime'), width: 175 },
  {
    key: 'event',
    title: $t('page.ui.auditEvent'),
    width: 210,
    render: row => h('span', { class: 'font-600' }, row.event)
  },
  {
    key: 'result',
    title: $t('page.ui.auditResult'),
    width: 80,
    align: 'center',
    render: row => h(NTag, { size: 'small', type: resultType[row.result] || 'default' }, { default: () => resultText.value[row.result] || row.result })
  },
  { key: 'userName', title: $t('page.ui.auditUser'), width: 130, render: row => row.userName || '-' },
  { key: 'clientId', title: $t('page.ui.auditClient'), width: 180, render: row => row.clientId || '-' },
  { key: 'systemCode', title: $t('page.ui.auditSystem'), width: 110, render: row => row.systemCode || '-' },
  { key: 'ipAddress', title: 'IP', width: 140, render: row => row.ipAddress || '-' },
  {
    key: 'detail',
    title: $t('page.ui.auditDescription'),
    minWidth: 180,
    ellipsis: { tooltip: true },
    render: row => (row.detail ? JSON.stringify(row.detail) : '-')
  }
]);

async function getData() {
  startLoading();
  try {
    const { data } = await fetchSecurityAuditPage({ ...queryParams });
    if (data) {
      tableData.value = data.records;
      total.value = data.total;
      queryParams.current = data.current;
      queryParams.size = data.size;
    }
  } finally {
    endLoading();
  }
}

function search() {
  queryParams.current = 1;
  void getData();
}

function reset() {
  queryParams.event = undefined;
  queryParams.result = undefined;
  search();
}

void getData();
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false">
      <NSpace align="center" wrap>
        <NInput v-model:value="queryParams.event" clearable :placeholder="$t('page.ui.eventName')" class="w-220px" @keyup.enter="search" />
        <NSelect v-model:value="queryParams.result" :options="resultOptions" clearable :placeholder="$t('page.ui.auditResult')" class="w-130px" />
        <NButton type="primary" @click="search">{{ $t('common.search') }}</NButton>
        <NButton @click="reset">{{ $t('common.reset') }}</NButton>
      </NSpace>
    </NCard>
    <NCard :bordered="false">
      <NAlert type="info" :bordered="false" class="mb-16px">{{ $t('page.ui.auditNotice') }}</NAlert>
      <NDataTable :columns="columns" :data="tableData" :loading="loading" :pagination="false" remote :row-key="row => row.id" striped />
      <div class="flex justify-end mt-16px">
        <NPagination v-model:page="queryParams.current" v-model:page-size="queryParams.size" :item-count="total" :page-sizes="[20, 50, 100]" show-size-picker @update:page="getData" @update:page-size="search" />
      </div>
    </NCard>
  </NSpace>
</template>
