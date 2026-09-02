<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPagination, NPopconfirm, NSpace, NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchCreateErpNextMapping, fetchDeleteErpNextMapping, fetchErpNextMappingPage } from '@/service/api';
import { $t } from '@/locales';
import {
  downloadCrudTemplate,
  exportCrudRows,
  parseCrudExcelFile,
  type ExcelColumn
} from '@/utils/excel-crud';
import ErpNextMappingOperateDrawer from './modules/erpnext-mapping-operate-drawer.vue';
import ErpNextMappingSearch from './modules/erpnext-mapping-search.vue';
import { getErpNextMappingTypeLabel } from './modules/options';

defineOptions({
  name: 'ErpNextMappingManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.ErpNextMapping.ErpNextMappingRecord[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const queryParams = reactive<Api.ErpNextMapping.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.ErpNextMapping.ErpNextMappingRecord | null>(null);

const excelColumns: ExcelColumn<Api.ErpNextMapping.ErpNextMappingRecord, Api.ErpNextMapping.CreateParams>[] = [
  {
    key: 'type',
    label: $t('page.ui.mappingType'),
    required: true,
    example: 'ITEM_GROUP',
    exportValue: row => row.type
  },
  { key: 'sourceKey', label: $t('page.ui.sourceValue'), required: true, example: 'Product' },
  { key: 'targetValue', label: $t('page.ui.erpNextTargetValue'), required: true, example: 'Products' }
];

const columns = computed<DataTableColumns<Api.ErpNextMapping.ErpNextMappingRecord>>(() => [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'type',
    title: $t('page.ui.mappingType'),
    width: 150,
    render: row =>
      h(
        NTag,
        { size: 'small', type: row.type === 'UNIT' ? 'info' : 'success' },
        { default: () => getErpNextMappingTypeLabel(row.type) }
      )
  },
  {
    key: 'sourceKey',
    title: $t('page.ui.sourceValue'),
    minWidth: 180,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'targetValue',
    title: $t('page.ui.erpNextTargetValue'),
    minWidth: 240,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'operate',
    title: $t('common.operate'),
    width: 160,
    fixed: 'right',
    align: 'center',
    render: row =>
      h(
        NSpace,
        { justify: 'center', size: [8, 0] },
        {
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
        }
      )
  }
]);

async function getData() {
  startLoading();
  try {
    const { data, error } = await fetchErpNextMappingPage({ ...queryParams });
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
  queryParams.type = undefined;
  queryParams.sourceKey = undefined;
  queryParams.current = 1;
  getData();
}

function handleAdd() {
  drawerType.value = 'add';
  editRow.value = null;
  drawerVisible.value = true;
}

function handleEdit(row: Api.ErpNextMapping.ErpNextMappingRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.ErpNextMapping.ErpNextMappingRecord) {
  const { error } = await fetchDeleteErpNextMapping(row.id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    getData();
  }
}

async function fetchExportRows() {
  const { data, error } = await fetchErpNextMappingPage({ ...queryParams, current: 1, size: 10000 });
  if (error || !data) return [];
  return data.records;
}

function handleDownloadTemplate() {
  downloadCrudTemplate(excelColumns, $t('page.ui.erpNextMapping'), {
    type: 'ITEM_GROUP',
    sourceKey: 'Product',
    targetValue: 'Products'
  });
}

async function handleExport() {
  const rows = await fetchExportRows();
  exportCrudRows(rows, excelColumns, $t('page.ui.erpNextMapping'));
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
    const result = await parseCrudExcelFile(file, excelColumns, $t('page.ui.erpNextMapping'));
    let success = 0;
    const errors: string[] = [];

    for (const [index, row] of result.rows.entries()) {
      const { error } = await fetchCreateErpNextMapping(row);
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
        <ErpNextMappingSearch v-model="queryParams" @search="handleSearch" @reset="handleReset" />
        <NSpace align="center" wrap>
          <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.csv" style="display: none" @change="handleFileChange" />
          <NButton type="info" ghost :loading="importing" @click="triggerFileInput">{{ $t('page.ui.importExcel') }}</NButton>
          <NButton ghost @click="handleDownloadTemplate">{{ $t('page.ui.downloadTemplate') }}</NButton>
          <NButton type="success" ghost @click="handleExport">{{ $t('page.ui.exportExcel') }}</NButton>
          <NButton type="primary" @click="handleAdd">
            {{ $t('common.add') }}
          </NButton>
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

    <ErpNextMappingOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>
