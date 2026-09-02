<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchCreateUnit, fetchDeleteUnit, fetchUnitPage } from '@/service/api';
import { $t } from '@/locales';
import {
  downloadCrudTemplate,
  exportCrudRows,
  parseCrudExcelFile,
  type ExcelColumn
} from '@/utils/excel-crud';
import UnitOperateDrawer from './modules/unit-operate-drawer.vue';
import UnitSearch from './modules/unit-search.vue';

defineOptions({
  name: 'UnitManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.Unit.UnitRecord[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const queryParams = reactive<Api.Unit.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.Unit.UnitRecord | null>(null);

const excelColumns: ExcelColumn<Api.Unit.UnitRecord, Api.Unit.CreateParams>[] = [
  { key: 'unitCode', label: $t('page.ui.unitCode'), required: true, example: 'PCS' },
  { key: 'unit', label: $t('page.ui.unitName'), required: true, example: 'PCS' }
];

const columns = computed<DataTableColumns<Api.Unit.UnitRecord>>(() => [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'unitCode',
    title: $t('page.ui.unitCode'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'unit',
    title: $t('page.ui.unitName'),
    minWidth: 180,
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
]);

async function getData() {
  startLoading();
  try {
    const { data, error } = await fetchUnitPage({ ...queryParams });
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
  queryParams.unitCode = undefined;
  queryParams.unit = undefined;
  queryParams.current = 1;
  getData();
}

function handleAdd() {
  drawerType.value = 'add';
  editRow.value = null;
  drawerVisible.value = true;
}

function handleEdit(row: Api.Unit.UnitRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.Unit.UnitRecord) {
  const { error } = await fetchDeleteUnit(row.unitCode);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    getData();
  }
}

async function fetchExportRows() {
  const { data, error } = await fetchUnitPage({ ...queryParams, current: 1, size: 10000 });
  if (error || !data) return [];
  return data.records;
}

function handleDownloadTemplate() {
  downloadCrudTemplate(excelColumns, $t('page.ui.unitLabel'), { unitCode: 'PCS', unit: 'PCS' });
}

async function handleExport() {
  const rows = await fetchExportRows();
  exportCrudRows(rows, excelColumns, $t('page.ui.unitLabel'));
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
    const result = await parseCrudExcelFile(file, excelColumns, $t('page.ui.unitLabel'));
    let success = 0;
    const errors: string[] = [];

    for (const [index, row] of result.rows.entries()) {
      const { error } = await fetchCreateUnit(row);
      if (error) {
        errors.push($t('page.ui.importRowFailed', { row: index + 2 }));
      } else {
        success += 1;
      }
    }

    const message = errors.length
      ? $t('page.ui.importCompleted', { success, failed: errors.length })
      : $t('page.ui.importedCount', { count: success });
    window.$message?.[errors.length ? 'warning' : 'success'](message);
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
        <UnitSearch v-model="queryParams" @search="handleSearch" @reset="handleReset" />
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
        :row-key="row => row.unitCode"
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

    <UnitOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
