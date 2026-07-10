<script setup lang="ts">
import { h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchCreateMoldMaterial, fetchDeleteMoldMaterial, fetchMoldMaterialPage } from '@/service/api';
import {
  downloadCrudTemplate,
  exportCrudRows,
  parseCrudExcelFile,
  type ExcelColumn
} from '@/utils/excel-crud';
import MoldMaterialOperateDrawer from './modules/mold-material-operate-drawer.vue';
import MoldMaterialSearch from './modules/mold-material-search.vue';

defineOptions({
  name: 'MoldMaterialManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<Api.MoldMaterial.MoldMaterialRecord[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const queryParams = reactive<Api.MoldMaterial.QueryParams>({
  current: 1,
  size: 10
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<Api.MoldMaterial.MoldMaterialRecord | null>(null);

const excelColumns: ExcelColumn<Api.MoldMaterial.MoldMaterialRecord, Api.MoldMaterial.CreateParams>[] = [
  { key: 'typeCode', label: '材质编码', required: true, example: 'ABS' },
  { key: 'typeName', label: '材质名称', required: true, example: 'ABS塑料' }
];

const columns: DataTableColumns<Api.MoldMaterial.MoldMaterialRecord> = [
  {
    key: 'index',
    title: '序号',
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'typeCode',
    title: '材质编码',
    minWidth: 140,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'typeName',
    title: '材质名称',
    minWidth: 180,
    ellipsis: {
      tooltip: true
    }
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
    const { data, error } = await fetchMoldMaterialPage({ ...queryParams });
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
  queryParams.typeCode = undefined;
  queryParams.typeName = undefined;
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

function handleEdit(row: Api.MoldMaterial.MoldMaterialRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  drawerVisible.value = true;
}

async function handleDelete(row: Api.MoldMaterial.MoldMaterialRecord) {
  const { error } = await fetchDeleteMoldMaterial(row.id);
  if (!error) {
    window.$message?.success('删除成功');
    getData();
  }
}

async function fetchExportRows() {
  const { data, error } = await fetchMoldMaterialPage({ ...queryParams, current: 1, size: 10000 });
  if (error || !data) return [];
  return data.records;
}

function handleDownloadTemplate() {
  downloadCrudTemplate(excelColumns, '材质', { typeCode: 'ABS', typeName: 'ABS塑料' });
}

async function handleExport() {
  const rows = await fetchExportRows();
  exportCrudRows(rows, excelColumns, '材质');
  window.$message?.success(`已导出 ${rows.length} 条数据`);
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
    const result = await parseCrudExcelFile(file, excelColumns, '材质');
    let success = 0;
    const errors: string[] = [];

    for (const [index, row] of result.rows.entries()) {
      const { error } = await fetchCreateMoldMaterial(row);
      if (error) errors.push(`第 ${index + 2} 行导入失败`);
      else success += 1;
    }

    window.$message?.[errors.length ? 'warning' : 'success'](
      errors.length ? `导入完成：成功 ${success} 条，失败 ${errors.length} 条` : `成功导入 ${success} 条`
    );
    if (errors.length) window.$message?.error(errors.slice(0, 3).join('；'));
    getData();
  } catch (err) {
    window.$message?.error(err instanceof Error ? err.message : '导入失败');
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
        <MoldMaterialSearch v-model:model-value="queryParams" @search="handleSearch" @reset="handleReset" />
        <NSpace align="center" wrap>
          <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.csv" style="display: none" @change="handleFileChange" />
          <NButton type="info" ghost :loading="importing" @click="triggerFileInput">导入 Excel</NButton>
          <NButton ghost @click="handleDownloadTemplate">下载模板</NButton>
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

    <MoldMaterialOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped></style>
