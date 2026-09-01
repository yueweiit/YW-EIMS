<script setup lang="ts">
import { h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NTag, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import {
  fetchCreatePermission,
  fetchDeletePermission,
  fetchPermissionPage,
  fetchRoleAccessCatalog,
  fetchUpdatePermission
} from '@/service/api';
import type {
  CreatePermissionParams,
  PermissionPageParams,
  PermissionRecord,
  PermissionType,
  UpdatePermissionParams
} from '@/service/api/role';
import { $t } from '@/locales';

defineOptions({
  name: 'PermissionManage'
});

const { loading, startLoading, endLoading } = useLoading(false);
const tableData = ref<PermissionRecord[]>([]);
const queryParams = reactive<PermissionPageParams>({
  current: 1,
  size: 10,
  name: undefined,
  type: undefined,
  status: undefined
});
const total = ref(0);
const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<PermissionRecord | null>(null);
const systemOptions = ref<{ label: string; value: string }[]>([]);
const formModel = reactive<CreatePermissionParams>({
  code: '',
  name: '',
  type: 'menu',
  systemCode: '',
  parentCode: '',
  routePath: '',
  description: '',
  sort: 0,
  status: '1'
});

const typeTextMap: Record<string, string> = { menu: '菜单', button: '按钮', api: '接口' };
const statusTextMap: Record<string, string> = { '1': '启用', '2': '禁用' };
const typeOptions = [
  { label: '菜单', value: 'menu' },
  { label: '按钮', value: 'button' },
  { label: '接口', value: 'api' }
];
const statusOptions = [
  { label: '启用', value: '1' },
  { label: '禁用', value: '2' }
];

const columns: DataTableColumns<PermissionRecord> = [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'name',
    title: '权限名称',
    minWidth: 150,
    render: row => h('div', {}, [h('div', { class: 'font-600' }, row.name), h('div', { class: 'text-12px text-gray-500' }, row.code)])
  },
  {
    key: 'type',
    title: '类型',
    width: 80,
    render: row => h(NTag, { size: 'small', type: row.type === 'menu' ? 'info' : row.type === 'button' ? 'success' : 'warning' }, { default: () => typeTextMap[row.type] })
  },
  {
    key: 'systemCode',
    title: '所属系统',
    width: 120,
    render: row => row.systemCode || 'EIMS'
  },
  {
    key: 'routePath',
    title: '路由/接口标识',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render: row => row.routePath || row.parentCode || '-'
  },
  {
    key: 'status',
    title: '状态',
    width: 80,
    align: 'center',
    render: row => h(NTag, { type: row.status === '1' ? 'success' : 'error', size: 'small' }, { default: () => statusTextMap[row.status] })
  },
  {
    key: 'operate',
    title: $t('common.operate'),
    width: 250,
    fixed: 'right',
    align: 'center',
    render: row => h(NSpace, { justify: 'center', size: [8, 0] }, {
      default: () => [
        h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => handleEdit(row) }, { default: () => $t('common.edit') }),
        h(NButton, { size: 'small', type: row.status === '1' ? 'warning' : 'success', ghost: true, onClick: () => handleToggleStatus(row) }, { default: () => row.status === '1' ? '禁用' : '启用' }),
        h(NPopconfirm, {
          onPositiveClick: () => handleDelete(row)
        }, {
          trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => $t('common.delete') }),
          default: () => '删除后该权限与角色的关联也会移除，确认继续？'
        })
      ]
    })
  }
];

async function getData() {
  startLoading();
  try {
    const { data } = await fetchPermissionPage({ ...queryParams });
    if (data) {
      tableData.value = data.records;
      total.value = data.total;
      queryParams.current = data.current;
      queryParams.size = data.size;
    }
  } finally {
    endLoading();
  }
}

async function loadSystems() {
  const { data } = await fetchRoleAccessCatalog();
  if (data) {
    systemOptions.value = data.systems.map(system => ({ label: `${system.name}（${system.code}）`, value: system.code }));
  }
}

function resetForm() {
  Object.assign(formModel, {
    code: '',
    name: '',
    type: 'menu' as PermissionType,
    systemCode: '',
    parentCode: '',
    routePath: '',
    description: '',
    sort: 0,
    status: '1' as Api.Common.EnableStatus
  });
}

function handleAdd() {
  drawerType.value = 'add';
  editRow.value = null;
  resetForm();
  drawerVisible.value = true;
}

function handleEdit(row: PermissionRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  Object.assign(formModel, {
    code: row.code,
    name: row.name,
    type: row.type,
    systemCode: row.systemCode || '',
    parentCode: row.parentCode || '',
    routePath: row.routePath || '',
    description: row.description || '',
    sort: row.sort,
    status: row.status
  });
  drawerVisible.value = true;
}

async function handleSubmit() {
  if (!formModel.name?.trim() || (drawerType.value === 'add' && !formModel.code?.trim())) {
    window.$message?.error('请填写权限编码和权限名称');
    return;
  }
  startLoading();
  try {
    if (drawerType.value === 'add') {
      const { error } = await fetchCreatePermission({ ...formModel, code: formModel.code.trim(), name: formModel.name.trim() });
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        drawerVisible.value = false;
        void getData();
      }
    } else if (editRow.value) {
      const updateData: UpdatePermissionParams = {
        name: formModel.name.trim(),
        type: formModel.type,
        systemCode: formModel.systemCode,
        parentCode: formModel.parentCode,
        routePath: formModel.routePath,
        description: formModel.description,
        sort: formModel.sort,
        status: formModel.status
      };
      const { error } = await fetchUpdatePermission(editRow.value.id, updateData);
      if (!error) {
        window.$message?.success($t('common.updateSuccess'));
        drawerVisible.value = false;
        void getData();
      }
    }
  } finally {
    endLoading();
  }
}

async function handleToggleStatus(row: PermissionRecord) {
  const { error } = await fetchUpdatePermission(row.id, { status: row.status === '1' ? '2' : '1' });
  if (!error) {
    window.$message?.success(row.status === '1' ? '权限已禁用' : '权限已启用');
    void getData();
  }
}

async function handleDelete(row: PermissionRecord) {
  const { error } = await fetchDeletePermission(row.id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    void getData();
  }
}

function handleSearch() {
  queryParams.current = 1;
  void getData();
}

function handleReset() {
  queryParams.name = undefined;
  queryParams.type = undefined;
  queryParams.status = undefined;
  queryParams.current = 1;
  void getData();
}

function handlePageSizeChange(size: number) {
  queryParams.current = 1;
  queryParams.size = size;
  void getData();
}

void loadSystems();
void getData();
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false">
      <NSpace justify="space-between" align="center" wrap>
        <NSpace :size="12" wrap>
          <NInput v-model:value="queryParams.name" placeholder="权限名称或编码" clearable class="w-220px" @keyup.enter="handleSearch" />
          <NSelect v-model:value="queryParams.type" :options="typeOptions" clearable placeholder="权限类型" class="w-130px" />
          <NSelect v-model:value="queryParams.status" :options="statusOptions" clearable placeholder="状态" class="w-130px" />
          <NButton type="primary" @click="handleSearch">搜索</NButton>
          <NButton @click="handleReset">重置</NButton>
        </NSpace>
        <NButton type="primary" @click="handleAdd">新增功能权限</NButton>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NAlert type="info" :bordered="false" class="mb-16px">
        菜单权限控制页面显示，按钮和接口权限供业务页面及后端接口校验使用。禁用权限后，已分配角色也不会再获得该权限。
      </NAlert>
      <NDataTable :columns="columns" :data="tableData" :loading="loading" :pagination="false" remote :row-key="row => row.id" striped />
      <div class="flex justify-end mt-16px">
        <NPagination v-model:page="queryParams.current" v-model:page-size="queryParams.size" :item-count="total" :page-sizes="[10, 20, 50]" show-size-picker @update:page="getData" @update:page-size="handlePageSizeChange" />
      </div>
    </NCard>

    <NDrawer v-model:show="drawerVisible" width="560px" placement="right">
      <NDrawerContent :title="drawerType === 'add' ? '新增功能权限' : '编辑功能权限'" closable>
        <NForm label-placement="left" label-width="100">
          <NFormItem label="权限编码" required>
            <NInput v-model:value="formModel.code" :disabled="drawerType === 'edit'" placeholder="如 eims:material:material:create" />
          </NFormItem>
          <NFormItem label="权限名称" required>
            <NInput v-model:value="formModel.name" placeholder="如 物料新增" />
          </NFormItem>
          <NFormItem label="权限类型">
            <NSelect v-model:value="formModel.type" :options="typeOptions" />
          </NFormItem>
          <NFormItem label="所属系统">
            <NSelect v-model:value="formModel.systemCode" :options="systemOptions" clearable filterable placeholder="留空表示 EIMS 内部功能" />
          </NFormItem>
          <NFormItem label="父级权限编码">
            <NInput v-model:value="formModel.parentCode" placeholder="按钮权限可填写所属菜单编码" />
          </NFormItem>
          <NFormItem label="路由/接口标识">
            <NInput v-model:value="formModel.routePath" placeholder="如 /material/material" />
          </NFormItem>
          <NFormItem label="功能说明">
            <NInput v-model:value="formModel.description" type="textarea" :rows="3" placeholder="说明该权限的用途" />
          </NFormItem>
          <NFormItem label="排序">
            <NInputNumber v-model:value="formModel.sort" :min="0" :max="999999" class="w-full" />
          </NFormItem>
          <NFormItem label="状态">
            <NRadioGroup v-model:value="formModel.status">
              <NRadio value="1">启用</NRadio>
              <NRadio value="2">禁用</NRadio>
            </NRadioGroup>
          </NFormItem>
        </NForm>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="drawerVisible = false">取消</NButton>
            <NButton type="primary" :loading="loading" @click="handleSubmit">保存</NButton>
          </NSpace>
        </template>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped></style>
