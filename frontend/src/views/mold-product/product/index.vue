<script setup lang="ts">
import { h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchDeleteProduct, fetchImportProducts, fetchProductCodePage, fetchProductPage } from '@/service/api';
import ProductOperateDrawer from './modules/product-operate-drawer.vue';
import ProductSearch from './modules/product-search.vue';
import { downloadTemplate, exportProducts, parseExcelFile } from './modules/product-excel-importer';

defineOptions({
  name: 'ProductManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.Product.ProductRecord[]>([]);
const queryParams = reactive<Api.Product.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.Product.ProductRecord | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);

const columns: DataTableColumns<Api.Product.ProductRecord> = [
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
    }
  },
  {
    key: 'productType',
    title: '产品类型',
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.productType || '-'
  },
  {
    key: 'productName',
    title: '产品名称',
    minWidth: 160,
    ellipsis: {
      tooltip: true
    },
    render: row => row.productName || '-'
  },
  {
    key: 'phoneShortName',
    title: '手机简称',
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.phoneShortName || '-'
  },
  {
    key: 'phoneCode',
    title: '手机编码',
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.phoneCode || '-'
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
    key: 'itemCode',
    title: '项目编码',
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.itemCode || '-'
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
    const { data, error } = await fetchProductPage({ ...queryParams });
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
  queryParams.productType = undefined;
  queryParams.phoneShortName = undefined;
  queryParams.itemCode = undefined;
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

function handleEdit(row: Api.Product.ProductRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.Product.ProductRecord) {
  const { error } = await fetchDeleteProduct(row.id);
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

async function handleDownloadTemplate() {
  try {
    const { data, error } = await fetchProductCodePage({ current: 1, size: 100 });
    if (!error && data) {
      downloadTemplate({
        productCodes: data.records.map(r => ({
          productType: r.productType,
          productCode: r.productCode,
          productName: r.productName,
          colorName: r.colorName,
          colorCode: r.colorCode
        }))
      });
    } else {
      downloadTemplate();
    }
  } catch {
    downloadTemplate();
  }
}

async function handleExport() {
  const { data, error } = await fetchProductPage({ current: 1, size: 100, ...queryParams });
  if (!error && data) {
    exportProducts(data.records);
    window.$message?.success('导出成功');
  }
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importing.value = true;
  try {
    const result = await parseExcelFile(file);
    const { data, error } = await fetchImportProducts({ rows: result.rows });
    if (!error && data) {
      let msg = `导入完成：成功 ${data.success} 条`;
      if (data.failed > 0) {
        msg += `，失败 ${data.failed} 条`;
        window.$message?.warning(msg, { duration: 8000, closable: true });
      } else {
        window.$message?.success(msg);
      }
      getData();
    }
  } catch (e) {
    window.$message?.error(e instanceof Error ? e.message : '导入失败');
  } finally {
    importing.value = false;
    input.value = '';
  }
}
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false">
      <NSpace justify="space-between" align="center" wrap>
        <ProductSearch v-model:model-value="queryParams" @search="handleSearch" @reset="handleReset" />
        <NSpace>
          <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.csv" style="display: none" @change="handleFileChange" />
          <NButton type="info" ghost :loading="importing" @click="triggerFileInput">导入 Excel</NButton>
          <NButton type="default" ghost @click="handleDownloadTemplate">下载模板</NButton>
          <NButton type="success" ghost @click="handleExport">导出 Excel</NButton>
          <NButton type="primary" @click="handleAdd">新增</NButton>
        </NSpace>
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

    <ProductOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
