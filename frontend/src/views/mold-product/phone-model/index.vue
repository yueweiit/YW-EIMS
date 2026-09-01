<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchBatchDeletePhoneModels, fetchCreatePhoneModel, fetchDeletePhoneModel, fetchPhoneModelPage } from '@/service/api';
import { $t } from '@/locales';
import {
  downloadCrudTemplate,
  exportCrudRows,
  parseCrudExcelFile,
  type ExcelColumn
} from '@/utils/excel-crud';
import PhoneModelOperateDrawer from './modules/phone-model-operate-drawer.vue';
import PhoneModelSearch from './modules/phone-model-search.vue';

defineOptions({
  name: 'PhoneModelManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.PhoneModel.PhoneModelRecord[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const checkedRowKeys = ref<number[]>([]);
const batchDeleting = ref(false);
const queryParams = reactive<Api.PhoneModel.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.PhoneModel.PhoneModelRecord | null>(null);

const excelColumns: ExcelColumn<Api.PhoneModel.PhoneModelRecord, any>[] = [
  { key: 'phoneCode', label: $t('page.ui.phoneCode'), importable: false },
  { key: 'phoneName', label: $t('page.ui.phoneName'), required: true, example: 'iPhone 15' },
  { key: 'phoneShortName', label: $t('page.ui.phoneShortName'), example: 'IP15' }
];

const columns = computed<DataTableColumns<Api.PhoneModel.PhoneModelRecord>>(() => [
  {
    type: 'selection'
  },
  {
    key: 'index',
    title: $t('page.ui.serialNumber'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'phoneCode',
    title: $t('page.ui.phoneCode'),
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.phoneCode || '-'
  },
  {
    key: 'phoneName',
    title: $t('page.ui.phoneName'),
    minWidth: 180,
    ellipsis: {
      tooltip: true
    }
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
    const { data, error } = await fetchPhoneModelPage({ ...queryParams });
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
  queryParams.phoneName = undefined;
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

function handleEdit(row: Api.PhoneModel.PhoneModelRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.PhoneModel.PhoneModelRecord) {
  const { error } = await fetchDeletePhoneModel(row.id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    getData();
  }
}

async function handleBatchDelete() {
  if (!checkedRowKeys.value.length) {
    window.$message?.warning($t('page.ui.selectPhoneToDelete'));
    return;
  }
  batchDeleting.value = true;
  try {
    const { data, error } = await fetchBatchDeletePhoneModels({ ids: checkedRowKeys.value });
    if (error || !data) return;

    if (data.errors.length) {
      window.$message?.warning(
        $t('page.ui.batchDeleteCompleted', { deleted: data.deleted, failed: data.failed })
      );
      window.$message?.error(data.errors.slice(0, 5).join('；'));
    } else {
      window.$message?.success($t('page.ui.deletedPhoneModels', { count: data.deleted }));
    }
    checkedRowKeys.value = [];
    getData();
  } finally {
    batchDeleting.value = false;
  }
}

async function handleSelectAll() {
  const rows = await fetchExportRows();
  checkedRowKeys.value = rows.map(r => r.id);
}

function handleCheckedRowKeysUpdate(keys: Array<string | number>) {
  checkedRowKeys.value = keys.filter((key): key is number => typeof key === 'number');
}

async function fetchExportRows() {
  const allRecords: Api.PhoneModel.PhoneModelRecord[] = [];
  let page = 1;
  const pageSize = 100; // 后端最大限制
  while (true) {
    const { data, error } = await fetchPhoneModelPage({ ...queryParams, current: page, size: pageSize });
    if (error || !data) break;
    allRecords.push(...data.records);
    if (allRecords.length >= data.total) break;
    page++;
  }
  return allRecords;
}

function handleDownloadTemplate() {
  downloadCrudTemplate(excelColumns, $t('page.ui.phoneName'), { phoneName: 'iPhone 15', phoneShortName: 'IP15' });
}

async function handleExport() {
  const rows = await fetchExportRows();
  exportCrudRows(rows, excelColumns, $t('page.ui.phoneName'));
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
    const result = await parseCrudExcelFile(file, excelColumns, $t('page.ui.phoneName'));
    let success = 0;
    const errors: string[] = [];

    for (const [index, row] of result.rows.entries()) {
      const { error } = await fetchCreatePhoneModel({
        phoneName: row.phoneName,
        phoneShortName: row.phoneShortName
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
        <PhoneModelSearch v-model:model-value="queryParams" @search="handleSearch" @reset="handleReset" />
        <NSpace align="center" wrap>
          <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.csv" style="display: none" @change="handleFileChange" />
          <NButton type="info" ghost :loading="importing" @click="triggerFileInput">{{ $t('page.ui.importExcel') }}</NButton>
          <NButton ghost @click="handleDownloadTemplate">{{ $t('page.ui.downloadTemplate') }}</NButton>
          <NButton type="success" ghost @click="handleExport">{{ $t('page.ui.exportExcel') }}</NButton>
          <NButton type="primary" @click="handleAdd">{{ $t('page.ui.addRecord') }}</NButton>
          <NButton v-if="total > queryParams.size" type="warning" ghost size="small" @click="handleSelectAll">
            {{ $t('page.ui.selectAllRecords', { total }) }}
          </NButton>
          <NButton type="error" ghost :loading="batchDeleting" :disabled="!checkedRowKeys.length" @click="handleBatchDelete">
            {{ $t('page.ui.batchDelete') }}{{ checkedRowKeys.length ? ` (${checkedRowKeys.length})` : '' }}
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
        :checked-row-keys="checkedRowKeys"
        striped
        @update:checked-row-keys="handleCheckedRowKeysUpdate"
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

    <PhoneModelOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
