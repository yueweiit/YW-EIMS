<script setup lang="ts">
import { h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchCodeRulePage, fetchDeleteCodeRule } from '@/service/api';
import { $t } from '@/locales';
import CodeRuleOperateDrawer from './modules/code-rule-operate-drawer.vue';
import CodeRuleSearch from './modules/code-rule-search.vue';

defineOptions({
  name: 'CodeRuleManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.CodeRule.CodeRuleRecord[]>([]);
const queryParams = reactive<Api.CodeRule.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.CodeRule.CodeRuleRecord | null>(null);

const columns: DataTableColumns<Api.CodeRule.CodeRuleRecord> = [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'codePrefix',
    title: '编码前缀',
    minWidth: 120,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'explainContent',
    title: '前缀说明',
    minWidth: 180,
    ellipsis: {
      tooltip: true
    },
    render: row => row.explainContent || '-'
  },
  {
    key: 'prefixLength',
    title: '编码位数',
    width: 100,
    align: 'center',
    render: row => row.prefixLength ?? '完整前缀'
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
    const { data, error } = await fetchCodeRulePage({ ...queryParams });
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
  queryParams.codePrefix = undefined;
  queryParams.explainContent = undefined;
  queryParams.current = 1;
  getData();
}

function handleAdd() {
  drawerType.value = 'add';
  editRow.value = null;
  drawerVisible.value = true;
}

function handleEdit(row: Api.CodeRule.CodeRuleRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.CodeRule.CodeRuleRecord) {
  const { error } = await fetchDeleteCodeRule(row.codePrefix);
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
        <CodeRuleSearch v-model="queryParams" @search="handleSearch" @reset="handleReset" />
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
        :row-key="row => row.codePrefix"
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

    <CodeRuleOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
