<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination, useDialog } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { $t } from '@/locales';
import { fetchDeleteMaterial, fetchMaterialPage, fetchImportMaterials, fetchUnitPage, fetchCodeRulePage, fetchSyncFromErp } from '@/service/api';
import MaterialOperateDrawer from './modules/material-operate-drawer.vue';
import MaterialSearch from './modules/material-search.vue';
import { parseExcelFile, downloadTemplate, exportMaterials } from './modules/material-excel-importer';

defineOptions({
  name: 'MaterialManage'
});

const { loading, startLoading, endLoading } = useLoading(false);
const dialog = useDialog();

const tableData = ref<Api.Material.MaterialRecord[]>([]);
const queryParams = reactive<Api.Material.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.Material.MaterialRecord | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const syncing = ref(false);

const columns = computed<DataTableColumns<Api.Material.MaterialRecord>>(() => [
  {
    key: 'index',
    title: $t('page.ui.serialNumber'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'applicant',
    title: $t('page.ui.applicant'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'applicationDate',
    title: $t('page.ui.applicationDate'),
    minWidth: 140,
    render: row => row.applicationDate || '-'
  },
  {
    key: 'materialName',
    title: $t('page.ui.materialName'),
    minWidth: 180,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'specifications',
    title: $t('page.ui.specifications'),
    minWidth: 160,
    ellipsis: {
      tooltip: true
    },
    render: row => row.specifications || '-'
  },
  {
    key: 'unit',
    title: $t('page.ui.unitLabel'),
    width: 100,
    render: row => row.unit || '-'
  },
  {
    key: 'code',
    title: $t('page.ui.code'),
    minWidth: 140,
    ellipsis: {
      tooltip: true
    },
    render: row => row.code || '-'
  },
  {
    key: 'codePrefix',
    title: $t('page.ui.codePrefix'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.codePrefix || '-'
  },
  {
    key: 'explainContent',
    title: $t('page.ui.prefixDescription'),
    minWidth: 160,
    ellipsis: {
      tooltip: true
    },
    render: row => row.explainContent || '-'
  },
  {
    key: 'unitCode',
    title: $t('page.ui.unitCode'),
    minWidth: 120,
    ellipsis: {
      tooltip: true
    },
    render: row => row.unitCode || '-'
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
    const { data, error } = await fetchMaterialPage({ ...queryParams });
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
  queryParams.applicant = undefined;
  queryParams.materialName = undefined;
  queryParams.code = undefined;
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

function handleEdit(row: Api.Material.MaterialRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.Material.MaterialRecord) {
  const { error } = await fetchDeleteMaterial(row.id);
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

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleExport() {
  const hasFilter = !!(queryParams.applicant || queryParams.materialName || queryParams.code);

  if (hasFilter) {
    dialog.info({
      title: $t('page.ui.exportTitle'),
      content: $t('page.ui.exportQuestion'),
      positiveText: $t('page.ui.exportWithFilter'),
      negativeText: $t('page.ui.exportAll'),
      onPositiveClick: () => doExport(true),
      onNegativeClick: () => doExport(false)
    });
  } else {
    doExport(false);
  }
}

async function doExport(useFilter: boolean) {
  startLoading();
  try {
    const params: Api.Material.QueryParams = useFilter
      ? { ...queryParams, current: 1, size: 100 }
      : { current: 1, size: 100 };
    const { data, error } = await fetchMaterialPage(params);
    if (!error && data) {
      exportMaterials(data.records);
      window.$message?.success($t('page.ui.exportedCount', { count: data.records.length }));
    }
  } finally {
    endLoading();
  }
}

async function handleDownloadTemplate() {
  try {
    const [unitRes, ruleRes] = await Promise.all([
      fetchUnitPage({ current: 1, size: 100 }),
      fetchCodeRulePage({ current: 1, size: 100 })
    ]);
    const refData = {
      units: unitRes.data?.records ?? [],
      codeRules: ruleRes.data?.records ?? []
    };
    downloadTemplate(refData);
  } catch {
    downloadTemplate();
  }
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importing.value = true;
  try {
    const result = await parseExcelFile(file);
    const { data, error } = await fetchImportMaterials(result.rows);
    if (!error && data) {
      const parts = [$t('page.ui.importedCount', { count: data.success })];
      if (data.failed > 0) {
        parts.push($t('page.ui.failedCount', { count: data.failed }));
      }
      window.$message?.success(parts.join('，'));
      if (data.errors.length > 0) {
        window.$message?.warning(data.errors.join('\n'), { duration: 8000 });
      }
      getData();
    }
  } catch (err) {
    window.$message?.error(err instanceof Error ? err.message : $t('page.ui.importFailure'));
  } finally {
    input.value = '';
    importing.value = false;
  }
}

async function handleSyncFromErp() {
  syncing.value = true;
  try {
    const { data, error } = await fetchSyncFromErp();
    if (!error && data) {
      window.$message?.success(
        $t('page.ui.syncCompleted', { total: data.total, created: data.created, skipped: data.skipped }) +
        (data.failed > 0 ? `, ${$t('page.ui.failedCount', { count: data.failed })}` : '')
      );
      if (data.errors.length > 0) {
        window.$message?.warning($t('page.ui.failureDetails', { details: data.errors.join('; ') }), { duration: 10000 });
      }
      getData();
    }
  } catch (err) {
    window.$message?.error(err instanceof Error ? err.message : $t('page.ui.syncFailureCheckErp'));
  } finally {
    syncing.value = false;
  }
}

getData();
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false">
      <NSpace justify="space-between" align="center" wrap>
        <MaterialSearch v-model:model-value="queryParams" @search="handleSearch" @reset="handleReset" />
        <NSpace>
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx,.xls,.csv"
            style="display: none"
            @change="handleFileChange"
          />
          <NButton type="info" ghost :loading="importing" @click="triggerFileInput">
            {{ $t('page.ui.importExcel') }}
          </NButton>
          <NButton type="default" ghost @click="handleDownloadTemplate">
            {{ $t('page.ui.downloadTemplate') }}
          </NButton>
          <NButton type="success" ghost @click="handleExport">
            {{ $t('page.ui.exportExcel') }}
          </NButton>
          <NButton type="warning" ghost :loading="syncing" @click="handleSyncFromErp">
            {{ $t('page.ui.syncErp') }}
          </NButton>
          <NButton type="primary" @click="handleAdd">
            {{ $t('page.ui.addRecord') }}
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

    <MaterialOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
