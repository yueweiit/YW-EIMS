<script setup lang="ts">
import { h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NTag, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import {
  fetchOAuth2BindingPage,
  fetchDeleteOAuth2Binding
} from '@/service/api';
import type { OAuth2BindingRecord } from '@/service/api/oauth2-binding';
import { $t } from '@/locales';
import OAuth2BindingOperateDrawer from './modules/oauth2-binding-operate-drawer.vue';
import OAuth2BindingSearch from './modules/oauth2-binding-search.vue';

defineOptions({
  name: 'OAuth2BindingManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<OAuth2BindingRecord[]>([]);
const queryParams = reactive({
  current: 1,
  size: 10,
  ssoUserId: undefined as number | undefined,
  clientId: undefined as string | undefined
});
const total = ref(0);

const drawerVisible = ref(false);

const columns: DataTableColumns<OAuth2BindingRecord> = [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'ssoUser',
    title: 'SSO 用户',
    minWidth: 150,
    render: row => {
      const user = row.ssoUser;
      if (!user) return '-';
      return h('span', {}, `${user.realName || user.userName} (${user.userName})`);
    }
  },
  {
    key: 'client',
    title: 'OAuth2 应用',
    minWidth: 150,
    render: row => {
      const client = row.client;
      if (!client) return row.clientId;
      return h('span', {}, `${client.name} (${client.clientId})`);
    }
  },
  {
    key: 'appUserId',
    title: '业务系统用户ID',
    width: 130,
    align: 'center'
  },
  {
    key: 'appUsername',
    title: '业务系统用户名',
    minWidth: 130,
    render: row => row.appUsername || '-'
  },
  {
    key: 'createdAt',
    title: '创建时间',
    minWidth: 170
  },
  {
    key: 'operate',
    title: $t('common.operate'),
    width: 100,
    fixed: 'right',
    align: 'center',
    render: row =>
      h(NPopconfirm, { onPositiveClick: () => handleDelete(row) }, {
        trigger: () =>
          h(
            NButton,
            { size: 'small', type: 'error', ghost: true },
            { default: () => '解绑' }
          ),
        default: () => '确认解除此绑定关系？'
      })
  }
];

async function getData() {
  startLoading();
  try {
    const { data, error } = await fetchOAuth2BindingPage({ ...queryParams });
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
  queryParams.ssoUserId = undefined;
  queryParams.clientId = undefined;
  queryParams.current = 1;
  getData();
}

function handleAdd() {
  drawerVisible.value = true;
}

async function handleDelete(row: OAuth2BindingRecord) {
  const { error } = await fetchDeleteOAuth2Binding(row.id);
  if (!error) {
    window.$message?.success('解绑成功');
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
        <OAuth2BindingSearch v-model="queryParams" @search="handleSearch" @reset="handleReset" />
        <NButton type="primary" @click="handleAdd">
          新增绑定
        </NButton>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NDataTable
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="false"
        remote
        :row-key="row => row.id"
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

    <OAuth2BindingOperateDrawer
      v-model:visible="drawerVisible"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
