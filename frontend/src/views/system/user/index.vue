<script setup lang="ts">
import { h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NTag, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchDeleteUser, fetchUserPage } from '@/service/api';
import { $t } from '@/locales';
import UserOperateDrawer from './modules/user-operate-drawer.vue';
import UserSearch from './modules/user-search.vue';

defineOptions({
  name: 'UserManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.User.UserRecord[]>([]);
const queryParams = reactive<Api.User.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.User.UserRecord | null>(null);

const statusTextMap: Record<string, string> = {
  '1': '启用',
  '2': '禁用'
};

const columns: DataTableColumns<Api.User.UserRecord> = [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'userName',
    title: '用户名',
    minWidth: 120,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'realName',
    title: '真实姓名',
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.realName || '-'
  },
  {
    key: 'dingTalkSubject',
    title: '钉钉绑定',
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.dingTalkSubject || '-'
  },
  {
    key: 'roles',
    title: '角色',
    minWidth: 180,
    render: row =>
      h(
        NSpace,
        { wrap: true, size: [4, 4] },
        {
          default: () =>
            row.roles.map(role =>
              h(
                NTag,
                { type: 'primary', size: 'small', bordered: false },
                { default: () => role }
              )
            )
        }
      )
  },
  {
    key: 'status',
    title: '状态',
    width: 80,
    align: 'center',
    render: row => statusTextMap[row.status ?? '2']
  },
  {
    key: 'createTime',
    title: '创建时间',
    minWidth: 170
  },
  {
    key: 'operate',
    title: $t('common.operate'),
    width: 160,
    fixed: 'right',
    align: 'center',
    render: row =>
      h(NSpace, { justify: 'center', size: [8, 0] }, {
        default: () => [
          h(
            NButton,
            { size: 'small', type: 'primary', ghost: true, onClick: () => handleEdit(row) },
            { default: () => $t('common.edit') }
          ),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row) },
            {
              trigger: () =>
                h(
                  NButton,
                  { size: 'small', type: 'error', ghost: true },
                  { default: () => $t('common.delete') }
                ),
              default: () => $t('common.confirmDelete')
            }
          )
        ]
      })
  }
];

async function getData() {
  startLoading();
  try {
    const { data, error } = await fetchUserPage({ ...queryParams });
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
  queryParams.userName = undefined;
  queryParams.status = undefined;
  queryParams.current = 1;
  getData();
}

function handleAdd() {
  drawerType.value = 'add';
  editRow.value = null;
  drawerVisible.value = true;
}

function handleEdit(row: Api.User.UserRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.User.UserRecord) {
  const { error } = await fetchDeleteUser(row.id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
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
        <UserSearch v-model="queryParams" @search="handleSearch" @reset="handleReset" />
        <NButton type="primary" @click="handleAdd">
          {{ $t('common.add') }}
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

    <UserOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
