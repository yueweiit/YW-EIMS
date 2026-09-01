<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchCreateProductCode, fetchDeleteProductCode, fetchProductCodePage } from '@/service/api';
import { $t } from '@/locales';
import {
  downloadCrudTemplate,
  exportCrudRows,
  parseCrudExcelFile,
  type ExcelColumn
} from '@/utils/excel-crud';
import ProductCodeOperateDrawer from './modules/product-code-operate-drawer.vue';
import ProductCodeSearch from './modules/product-code-search.vue';

defineOptions({
  name: 'ProductCodeManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.ProductCode.ProductCodeRecord[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const queryParams = reactive<Api.ProductCode.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.ProductCode.ProductCodeRecord | null>(null);

const excelColumns: ExcelColumn<Api.ProductCode.ProductCodeRecord, Api.ProductCode.CreateParams>[] = [
  { key: 'productCode', label: $t('page.ui.productCode'), required: true, example: 'P001' },
  { key: 'productType', label: $t('page.ui.productType'), required: true, example: 'Phone case' },
  { key: 'productName', label: $t('page.ui.productName'), required: true, example: 'Transparent phone case' },
  { key: 'colorCode', label: $t('page.ui.colorCode'), required: true, example: 'BK' },
  { key: 'colorName', label: $t('page.ui.colorName'), required: true, example: 'Black' }
];

const columns = computed<DataTableColumns<Api.ProductCode.ProductCodeRecord>>(() => [
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
    },
    render: row => row.productCode || '-'
  },
  {
    key: 'productType',
    title: $t('page.ui.productType'),
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.productType || '-'
  },
  {
    key: 'productName',
    title: $t('page.ui.productName'),
    minWidth: 180,
    ellipsis: {
      tooltip: true
    },
    render: row => row.productName || '-'
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
    window.$message?.success($t('common.deleteSuccess'));
    getData();
  }
}

async function fetchExportRows() {
  const { data, error } = await fetchProductCodePage({ ...queryParams, current: 1, size: 10000 });
  if (error || !data) return [];
  return data.records;
}

function handleDownloadTemplate() {
  downloadCrudTemplate(excelColumns, $t('page.ui.productCode'), {
    productCode: 'P001',
    productType: 'Phone case',
    productName: 'Transparent phone case',
    colorCode: 'BK',
    colorName: 'Black'
  });
}

async function handleExport() {
  const rows = await fetchExportRows();
  exportCrudRows(rows, excelColumns, $t('page.ui.productCode'));
  window.$message?.success($t('page.ui.exportedCount', { count: rows.length }));
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  importing.value = true;
  try {
    const result = await parseCrudExcelFile(file, excelColumns, $t('page.ui.productCode'));
    let success = 0;
    const errors: string[] = [];

    for (const [index, row] of result.rows.entries()) {
      const { error } = await fetchCreateProductCode(row);
      if (error) errors.push($t('page.ui.importRowFailed', { row: index + 2 }));
      else success += 1;
    }

    window.$message?.[errors.length ? 'warning' : 'success'](
      errors.length
        ? $t('page.ui.importCompleted', { success, failed: errors.length })
        : $t('page.ui.importedCount', { count: success })
    );
    if (errors.length) window.$message?.error(errors.slice(0, 3).join('；'));
    getData();
  } catch (err) {
    window.$message?.error(err instanceof Error ? err.message : $t('page.ui.importFailure'));
  } finally {
    importing.value = false;
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
        <NSpace align="center" wrap>
          <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.csv" style="display: none" @change="handleFileChange" />
          <NButton type="info" ghost :loading="importing" @click="triggerFileInput">{{ $t('page.ui.importExcel') }}</NButton>
          <NButton ghost @click="handleDownloadTemplate">{{ $t('page.ui.downloadTemplate') }}</NButton>
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

    <ProductCodeOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
