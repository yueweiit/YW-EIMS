<script setup lang="ts">
import { h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchDeleteProductCode, fetchProductCodePage } from '@/service/api';
import ProductCodeOperateDrawer from './modules/product-code-operate-drawer.vue';
import ProductCodeSearch from './modules/product-code-search.vue';

defineOptions({
  name: 'ProductCodeManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.ProductCode.ProductCodeRecord[]>([]);
const queryParams = reactive<Api.ProductCode.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.ProductCode.ProductCodeRecord | null>(null);

const columns: DataTableColumns<Api.ProductCode.ProductCodeRecord> = [
  {
    key: 'index',
    title: '序号',
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'productCode',
    title: '产品编码',
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.productCode || '-'
  },
  {
    key: 'productType',
    title: '产品类型',
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.productType || '-'
  },
  {
    key: 'productName',
    title: '产品名称',
    minWidth: 180,
    ellipsis: {
      tooltip: true
    },
    render: row => row.productName || '-'
  },
  {
    key: 'colorCode',
    title: '颜色编码',
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.colorCode || '-'
  },
  {
    key: 'colorName',
    title: '颜色名称',
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.colorName || '-'
  },
  {
    key: 'operate',
    title: '操作',
    width: 160,
    fixed: 'right',
    align: 'center',
    render: row =>
      h(NSpace, { justify: 'center', size: [8, 0] }, {
        default: () => [
          h(
            NButton,
            { size: 'small', type: 'primary', ghost: true, onClick: () => handleEdit(row) },
            { default: () => '编辑' }
          ),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row) },
            {
              trigger: () =>
                h(
                  NButton,
                  { size: 'small', type: 'error', ghost: true },
                  { default: () => '删除' }
                ),
              default: () => '确认删除？'
            }
          )
        ]
      })
  }
];

async function getData() {
  startLoading();
  try {
    const { data, error } = await fetchProductCodePage({ ...queryParams });
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

function resetParams() {
  queryParams.productCode = undefined;
  queryParams.productType = undefined;
  queryParams.productName = undefined;
  queryParams.current = 1;
}

function handleReset() {
  resetParams();
  getData();
}

function handleAdd() {
  drawerType.value = 'add';
  editRow.value = null;
  drawerVisible.value = true;
}

function handleEdit(row: Api.ProductCode.ProductCodeRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.ProductCode.ProductCodeRecord) {
  const { error } = await fetchDeleteProductCode(row.id);
  if (!error) {
    window.$message?.success('删除成功');
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
        <ProductCodeSearch v-model:model-value="queryParams" @search="handleSearch" @reset="handleReset" />
        <NButton type="primary" @click="handleAdd">
          新增
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

    <ProductCodeOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
