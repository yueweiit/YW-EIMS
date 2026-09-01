<script setup lang="ts">
import { h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NAlert, NButton, NCard, NDataTable, NInput, NPagination, NSelect, NSpace, NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchSecurityAuditPage } from '@/service/api';
import type { SecurityAuditRecord } from '@/service/api/audit';

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

const resultOptions = [
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failure' },
  { label: '拒绝', value: 'denied' }
];
const resultText: Record<string, string> = { success: '成功', failure: '失败', denied: '拒绝' };
const resultType: Record<string, 'success' | 'error' | 'warning'> = {
  success: 'success',
  failure: 'error',
  denied: 'warning'
};

const columns: DataTableColumns<SecurityAuditRecord> = [
  { key: 'createdAt', title: '时间', width: 175 },
  {
    key: 'event',
    title: '事件',
    width: 210,
    render: row => h('span', { class: 'font-600' }, row.event)
  },
  {
    key: 'result',
    title: '结果',
    width: 80,
    align: 'center',
    render: row => h(NTag, { size: 'small', type: resultType[row.result] || 'default' }, { default: () => resultText[row.result] || row.result })
  },
  { key: 'userName', title: '用户', width: 130, render: row => row.userName || '-' },
  { key: 'clientId', title: 'OAuth 客户端', width: 180, render: row => row.clientId || '-' },
  { key: 'systemCode', title: '系统', width: 110, render: row => row.systemCode || '-' },
  { key: 'ipAddress', title: 'IP', width: 140, render: row => row.ipAddress || '-' },
  {
    key: 'detail',
    title: '说明',
    minWidth: 180,
    ellipsis: { tooltip: true },
    render: row => (row.detail ? JSON.stringify(row.detail) : '-')
  }
];

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
        <NInput v-model:value="queryParams.event" clearable placeholder="事件名称" class="w-220px" @keyup.enter="search" />
        <NSelect v-model:value="queryParams.result" :options="resultOptions" clearable placeholder="结果" class="w-130px" />
        <NButton type="primary" @click="search">搜索</NButton>
        <NButton @click="reset">重置</NButton>
      </NSpace>
    </NCard>
    <NCard :bordered="false">
      <NAlert type="info" :bordered="false" class="mb-16px">审计记录不保存密码、Token、Secret、授权码或 state。</NAlert>
      <NDataTable :columns="columns" :data="tableData" :loading="loading" :pagination="false" remote :row-key="row => row.id" striped />
      <div class="flex justify-end mt-16px">
        <NPagination v-model:page="queryParams.current" v-model:page-size="queryParams.size" :item-count="total" :page-sizes="[20, 50, 100]" show-size-picker @update:page="getData" @update:page-size="search" />
      </div>
    </NCard>
  </NSpace>
</template>
