<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchDeleteProduct, fetchImportProducts, fetchProductCodePage, fetchProductPage } from '@/service/api';
import { $t } from '@/locales';
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

const columns = computed<DataTableColumns<Api.Product.ProductRecord>>(() => [
  {
    key: 'index',
    title: $t('page.ui.serialNumber'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'productCode',
    title: $t('page.ui.productCode'),
    minWidth: 140,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'productType',
    title: $t('page.ui.productType'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.productType || '-'
  },
  {
    key: 'productName',
    title: $t('page.ui.productName'),
    minWidth: 160,
    ellipsis: {
      tooltip: true
    },
    render: row => row.productName || '-'
  },
  {
    key: 'phoneShortName',
    title: $t('page.ui.phoneShortName'),
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.phoneShortName || '-'
  },
  {
    key: 'phoneCode',
    title: $t('page.ui.phoneCode'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.phoneCode || '-'
  },
  {
    key: 'colorCode',
    title: $t('page.ui.colorCode'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.colorCode || '-'
  },
  {
    key: 'colorName',
    title: $t('page.ui.colorName'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.colorName || '-'
  },
  {
    key: 'itemCode',
    title: $t('page.ui.projectCode'),
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.itemCode || '-'
  },
  {
    key: 'operate',
    title: $t('page.ui.operation'),
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
              default: () => $t('page.ui.confirmDelete')
            }
          )
        ]
      })
  }
]);

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
  const exportParams = { ...queryParams, current: 1, size: 100 };
  const { data, error } = await fetchProductPage(exportParams);
  if (!error && data) {
    exportProducts(data.records);
    window.$message?.success($t('page.ui.exportedCount', { count: data.records.length }));
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
      let msg = $t('page.ui.importedCount', { count: data.success });
      if (data.failed > 0) {
        msg = $t('page.ui.importCompleted', { success: data.success, failed: data.failed });
        window.$message?.warning(msg, { duration: 8000, closable: true });
      } else {
        window.$message?.success(msg);
      }
      getData();
    }
  } catch (e) {
    window.$message?.error(e instanceof Error ? e.message : $t('page.ui.importFailure'));
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
          <NButton type="info" ghost :loading="importing" @click="triggerFileInput">{{ $t('page.ui.importExcel') }}</NButton>
          <NButton type="default" ghost @click="handleDownloadTemplate">{{ $t('page.ui.downloadTemplate') }}</NButton>
          <NButton type="success" ghost @click="handleExport">{{ $t('page.ui.exportExcel') }}</NButton>
          <NButton type="primary" @click="handleAdd">{{ $t('page.ui.addRecord') }}</NButton>
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
