<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
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

const typeTextMap = computed<Record<string, string>>(() => ({
  menu: $t('page.ui.permissionTypeMenu'),
  button: $t('page.ui.permissionTypeButton'),
  api: $t('page.ui.permissionTypeApi')
}));
const statusTextMap = computed<Record<string, string>>(() => ({
  '1': $t('page.ui.enabled'),
  '2': $t('page.ui.disabled')
}));
const typeOptions = computed(() => [
  { label: $t('page.ui.permissionTypeMenu'), value: 'menu' },
  { label: $t('page.ui.permissionTypeButton'), value: 'button' },
  { label: $t('page.ui.permissionTypeApi'), value: 'api' }
]);
const statusOptions = computed(() => [
  { label: $t('page.ui.enabled'), value: '1' },
  { label: $t('page.ui.disabled'), value: '2' }
]);

const columns = computed<DataTableColumns<PermissionRecord>>(() => [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'name',
    title: $t('page.ui.permissionName'),
    minWidth: 150,
    render: row => h('div', {}, [h('div', { class: 'font-600' }, row.name), h('div', { class: 'text-12px text-gray-500' }, row.code)])
  },
  {
    key: 'type',
    title: $t('page.ui.permissionType'),
    width: 80,
    render: row => h(NTag, { size: 'small', type: row.type === 'menu' ? 'info' : row.type === 'button' ? 'success' : 'warning' }, { default: () => typeTextMap.value[row.type] })
  },
  {
    key: 'systemCode',
    title: $t('page.ui.permissionSystem'),
    width: 120,
    render: row => row.systemCode || 'EIMS'
  },
  {
    key: 'routePath',
    title: $t('page.ui.routeApiIdentifier'),
    minWidth: 220,
    ellipsis: { tooltip: true },
    render: row => row.routePath || row.parentCode || '-'
  },
  {
    key: 'status',
    title: $t('page.ui.status'),
    width: 80,
    align: 'center',
    render: row => h(NTag, { type: row.status === '1' ? 'success' : 'error', size: 'small' }, { default: () => statusTextMap.value[row.status] })
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
        h(NButton, { size: 'small', type: row.status === '1' ? 'warning' : 'success', ghost: true, onClick: () => handleToggleStatus(row) }, { default: () => row.status === '1' ? $t('page.ui.disabled') : $t('page.ui.enabled') }),
        h(NPopconfirm, {
          onPositiveClick: () => handleDelete(row)
        }, {
          trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => $t('common.delete') }),
          default: () => $t('page.ui.permissionDeleteConfirm')
        })
      ]
    })
  }
]);

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
    window.$message?.error($t('page.ui.fillPermissionCodeName'));
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
    window.$message?.success(row.status === '1' ? $t('page.ui.permissionDisabled') : $t('page.ui.permissionEnabled'));
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
          <NInput v-model:value="queryParams.name" :placeholder="$t('page.ui.permissionNameOrCode')" clearable class="w-220px" @keyup.enter="handleSearch" />
          <NSelect v-model:value="queryParams.type" :options="typeOptions" clearable :placeholder="$t('page.ui.permissionType')" class="w-130px" />
          <NSelect v-model:value="queryParams.status" :options="statusOptions" clearable :placeholder="$t('page.ui.status')" class="w-130px" />
          <NButton type="primary" @click="handleSearch">{{ $t('common.search') }}</NButton>
          <NButton @click="handleReset">{{ $t('common.reset') }}</NButton>
        </NSpace>
        <NButton type="primary" @click="handleAdd">{{ $t('page.ui.newFunctionPermission') }}</NButton>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NAlert type="info" :bordered="false" class="mb-16px">
        {{ $t('page.ui.permissionNotice') }}
      </NAlert>
      <NDataTable :columns="columns" :data="tableData" :loading="loading" :pagination="false" remote :row-key="row => row.id" striped />
      <div class="flex justify-end mt-16px">
        <NPagination v-model:page="queryParams.current" v-model:page-size="queryParams.size" :item-count="total" :page-sizes="[10, 20, 50]" show-size-picker @update:page="getData" @update:page-size="handlePageSizeChange" />
      </div>
    </NCard>

    <NDrawer v-model:show="drawerVisible" width="560px" placement="right">
      <NDrawerContent :title="drawerType === 'add' ? $t('page.ui.newFunctionPermission') : $t('page.ui.editFunctionPermission')" closable>
        <NForm label-placement="left" label-width="100">
          <NFormItem :label="$t('page.ui.permissionCode')" required>
            <NInput v-model:value="formModel.code" :disabled="drawerType === 'edit'" :placeholder="$t('page.ui.permissionCodePlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.permissionName')" required>
            <NInput v-model:value="formModel.name" :placeholder="$t('page.ui.permissionNamePlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.permissionType')">
            <NSelect v-model:value="formModel.type" :options="typeOptions" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.permissionSystem')">
            <NSelect v-model:value="formModel.systemCode" :options="systemOptions" clearable filterable :placeholder="$t('page.ui.internalEimsFunction')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.parentPermissionCode')">
            <NInput v-model:value="formModel.parentCode" :placeholder="$t('page.ui.parentPermissionPlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.routeApiIdentifier')">
            <NInput v-model:value="formModel.routePath" :placeholder="$t('page.ui.routePathPlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.functionDescription')">
            <NInput v-model:value="formModel.description" type="textarea" :rows="3" :placeholder="$t('page.ui.functionDescriptionPlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.sort')">
            <NInputNumber v-model:value="formModel.sort" :min="0" :max="999999" class="w-full" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.status')">
            <NRadioGroup v-model:value="formModel.status">
              <NRadio value="1">{{ $t('page.ui.enabled') }}</NRadio>
              <NRadio value="2">{{ $t('page.ui.disabled') }}</NRadio>
            </NRadioGroup>
          </NFormItem>
        </NForm>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="drawerVisible = false">{{ $t('common.cancel') }}</NButton>
            <NButton type="primary" :loading="loading" @click="handleSubmit">{{ $t('page.ui.save') }}</NButton>
          </NSpace>
        </template>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped></style>
