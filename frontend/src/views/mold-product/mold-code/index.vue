<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchCreateMoldCode, fetchDeleteMoldCode, fetchMoldCodePage } from '@/service/api';
import { $t } from '@/locales';
import {
  downloadCrudTemplate,
  exportCrudRows,
  parseCrudExcelFile,
  type ExcelColumn
} from '@/utils/excel-crud';
import MoldCodeOperateDrawer from './modules/mold-code-operate-drawer.vue';
import MoldCodeSearch from './modules/mold-code-search.vue';

defineOptions({
  name: 'MoldCodeManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.MoldCode.MoldCodeRecord[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const queryParams = reactive<Api.MoldCode.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.MoldCode.MoldCodeRecord | null>(null);

const excelColumns: ExcelColumn<Api.MoldCode.MoldCodeRecord, any>[] = [
  { key: 'moldCode', label: $t('page.ui.moldCode'), importable: false },
  { key: 'moldType', label: $t('page.ui.moldType'), required: true, example: 'Phone case' },
  { key: 'moldName', label: $t('page.ui.moldName'), required: true, example: 'Rear cover mold' },
  { key: 'moldPrefix', label: $t('page.ui.moldPrefix'), required: true, example: 'HG' },
  { key: 'typeCode', label: $t('page.ui.materialTypeCode'), importable: false },
  {
    key: 'materialName',
    label: $t('page.ui.materialName'),
    required: true,
    example: 'ABS plastic',
    exportValue: row => row.typeName
  }
];

const columns = computed<DataTableColumns<Api.MoldCode.MoldCodeRecord>>(() => [
  {
    key: 'index',
    title: $t('page.ui.serialNumber'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'moldCode',
    title: $t('page.ui.moldCode'),
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.moldCode || '-'
  },
  {
    key: 'moldType',
    title: $t('page.ui.moldType'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.moldType || '-'
  },
  {
    key: 'moldName',
    title: $t('page.ui.moldName'),
    minWidth: 160,
    ellipsis: {
      tooltip: true
    },
    render: row => row.moldName || '-'
  },
  {
    key: 'moldPrefix',
    title: $t('page.ui.moldPrefix'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.moldPrefix || '-'
  },
  {
    key: 'typeCode',
    title: $t('page.ui.materialTypeCode'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.typeCode || '-'
  },
  {
    key: 'typeName',
    title: $t('page.ui.materialTypeName'),
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.typeName || '-'
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
    const { data, error } = await fetchMoldCodePage({ ...queryParams });
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
  queryParams.moldCode = undefined;
  queryParams.moldType = undefined;
  queryParams.moldName = undefined;
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

function handleEdit(row: Api.MoldCode.MoldCodeRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.MoldCode.MoldCodeRecord) {
  const { error } = await fetchDeleteMoldCode(row.id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    getData();
  }
}

async function fetchExportRows() {
  const { data, error } = await fetchMoldCodePage({ ...queryParams, current: 1, size: 10000 });
  if (error || !data) return [];
  return data.records;
}

function handleDownloadTemplate() {
  downloadCrudTemplate(excelColumns, $t('page.ui.moldCode'), {
    moldType: 'Phone case',
    moldName: 'Rear cover mold',
    moldPrefix: 'HG',
    materialName: 'ABS plastic'
  });
}

async function handleExport() {
  const rows = await fetchExportRows();
  exportCrudRows(rows, excelColumns, $t('page.ui.moldCode'));
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
    const result = await parseCrudExcelFile(file, excelColumns, $t('page.ui.moldCode'));
    let success = 0;
    const errors: string[] = [];

    for (const [index, row] of result.rows.entries()) {
      const { error } = await fetchCreateMoldCode({
        moldType: row.moldType,
        moldName: row.moldName,
        moldPrefix: row.moldPrefix,
        materialName: row.materialName
      });
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
        <MoldCodeSearch v-model:model-value="queryParams" @search="handleSearch" @reset="handleReset" />
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

    <MoldCodeOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
