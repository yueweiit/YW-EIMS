<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NCard, NDataTable, NPopconfirm, NSpace, NTag, NPagination } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import {
  fetchCreateRole,
  fetchDeleteRole,
  fetchRole,
  fetchRoleAccessCatalog,
  fetchRolePage,
  fetchUpdateRole,
  fetchUpdateRoleAccess
} from '@/service/api';
import type {
  CreateRoleParams,
  PermissionRecord,
  RoleAccessCatalog,
  RoleRecord,
  UpdateRoleParams
} from '@/service/api/role';
import { $t } from '@/locales';

defineOptions({
  name: 'RoleManage'
});

const { loading, startLoading, endLoading } = useLoading(false);
const tableData = ref<RoleRecord[]>([]);
const queryParams = reactive({
  current: 1,
  size: 10,
  name: undefined as string | undefined,
  status: undefined as Api.Common.EnableStatus | undefined
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<RoleRecord | null>(null);
const formModel = reactive<CreateRoleParams>({
  code: '',
  name: '',
  description: '',
  sort: 0,
  status: '1'
});

const accessVisible = ref(false);
const accessLoading = ref(false);
const accessRole = ref<RoleRecord | null>(null);
const accessCatalog = ref<RoleAccessCatalog>({ systems: [], permissions: [] });
const accessForm = reactive({ systemCodes: [] as string[], permissionCodes: [] as string[] });

const statusTextMap: Record<string, string> = { '1': '启用', '2': '禁用' };
const permissionTypeText: Record<string, string> = { menu: '菜单', button: '按钮', api: '接口' };

const activeSystems = computed(() => accessCatalog.value.systems.filter(system => system.status === '1'));
const activePermissions = computed(() => accessCatalog.value.permissions.filter(permission => permission.status === '1'));
const menuPermissions = computed(() => activePermissions.value.filter(permission => permission.type === 'menu'));
const buttonPermissions = computed(() => activePermissions.value.filter(permission => permission.type === 'button'));
const apiPermissions = computed(() => activePermissions.value.filter(permission => permission.type === 'api'));

const defaultForm = () => ({
  code: '',
  name: '',
  description: '',
  sort: 0,
  status: '1' as Api.Common.EnableStatus
});

const columns: DataTableColumns<RoleRecord> = [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'name',
    title: '角色名称',
    minWidth: 160,
    render: row =>
      h('div', {}, [
        h('div', { class: 'font-600' }, row.name),
        h('div', { class: 'text-12px text-gray-500' }, row.code)
      ])
  },
  {
    key: 'description',
    title: '说明',
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: row => row.description || '-'
  },
  {
    key: 'systemCodes',
    title: '可访问系统',
    minWidth: 190,
    render: row => (row.systemCodes.length ? row.systemCodes.join('、') : '未单独配置')
  },
  {
    key: 'permissionCodes',
    title: '功能权限数',
    width: 110,
    align: 'center',
    render: row => (row.code === 'R_SUPER' ? '全部' : row.permissionCodes.length)
  },
  {
    key: 'status',
    title: '状态',
    width: 80,
    align: 'center',
    render: row =>
      h(
        NTag,
        { type: row.status === '1' ? 'success' : 'error', size: 'small' },
        { default: () => statusTextMap[row.status] }
      )
  },
  {
    key: 'operate',
    title: $t('common.operate'),
    width: 280,
    fixed: 'right',
    align: 'center',
    render: row =>
      h(NSpace, { justify: 'center', size: [8, 0] }, {
        default: () => [
          h(NButton, { size: 'small', type: 'info', ghost: true, onClick: () => handleAccess(row) }, { default: () => '系统/功能' }),
          h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => handleEdit(row) }, { default: () => $t('common.edit') }),
          h(NButton, { size: 'small', type: row.status === '1' ? 'warning' : 'success', ghost: true, onClick: () => handleToggleStatus(row) }, { default: () => row.status === '1' ? '禁用' : '启用' }),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row) },
            {
              trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true, disabled: row.builtIn }, { default: () => $t('common.delete') }),
              default: () => (row.builtIn ? '内置角色不能删除' : '确认删除此角色？')
            }
          )
        ]
      })
  }
];

async function getData() {
  startLoading();
  try {
    const { data } = await fetchRolePage({ ...queryParams });
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

function handleSearch() {
  queryParams.current = 1;
  void getData();
}

function handleReset() {
  queryParams.name = undefined;
  queryParams.status = undefined;
  queryParams.current = 1;
  void getData();
}

function handleAdd() {
  drawerType.value = 'add';
  editRow.value = null;
  Object.assign(formModel, defaultForm());
  drawerVisible.value = true;
}

function handleEdit(row: RoleRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  Object.assign(formModel, {
    code: row.code,
    name: row.name,
    description: row.description || '',
    sort: row.sort,
    status: row.status
  });
  drawerVisible.value = true;
}

async function handleSubmit() {
  if (!formModel.name?.trim() || (drawerType.value === 'add' && !formModel.code?.trim())) {
    window.$message?.error('请填写角色编码和角色名称');
    return;
  }
  startLoading();
  try {
    if (drawerType.value === 'add') {
      const { error } = await fetchCreateRole({ ...formModel, code: formModel.code.trim(), name: formModel.name.trim() });
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        drawerVisible.value = false;
        void getData();
      }
    } else if (editRow.value) {
      const updateData: UpdateRoleParams = {
        name: formModel.name.trim(),
        description: formModel.description,
        sort: formModel.sort,
        status: formModel.status
      };
      const { error } = await fetchUpdateRole(editRow.value.id, updateData);
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

async function handleToggleStatus(row: RoleRecord) {
  if (row.code === 'R_SUPER') {
    window.$message?.warning('超级管理员角色不能禁用');
    return;
  }
  const { error } = await fetchUpdateRole(row.id, { status: row.status === '1' ? '2' : '1' });
  if (!error) {
    window.$message?.success(row.status === '1' ? '角色已禁用' : '角色已启用');
    void getData();
  }
}

async function handleDelete(row: RoleRecord) {
  if (row.builtIn) return;
  const { error } = await fetchDeleteRole(row.id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    void getData();
  }
}

async function handleAccess(row: RoleRecord) {
  accessRole.value = row;
  accessLoading.value = true;
  accessVisible.value = true;
  try {
    const [roleResult, catalogResult] = await Promise.all([fetchRole(row.id), fetchRoleAccessCatalog()]);
    if (roleResult.data && catalogResult.data) {
      accessRole.value = roleResult.data;
      accessCatalog.value = catalogResult.data;
      accessForm.systemCodes = [...roleResult.data.systemCodes];
      accessForm.permissionCodes = [...roleResult.data.permissionCodes];
    }
  } finally {
    accessLoading.value = false;
  }
}

function togglePermission(code: string, checked: boolean) {
  if (checked && !accessForm.permissionCodes.includes(code)) accessForm.permissionCodes.push(code);
  if (!checked) accessForm.permissionCodes = accessForm.permissionCodes.filter(item => item !== code);
}

async function saveAccess() {
  if (!accessRole.value) return;
  accessLoading.value = true;
  try {
    const { error } = await fetchUpdateRoleAccess(accessRole.value.id, {
      systemCodes: accessForm.systemCodes,
      permissionCodes: accessForm.permissionCodes
    });
    if (!error) {
      window.$message?.success('角色访问权限已保存');
      accessVisible.value = false;
      void getData();
    }
  } finally {
    accessLoading.value = false;
  }
}

function permissionChecked(code: string) {
  return accessForm.permissionCodes.includes(code);
}

void getData();
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false">
      <NSpace justify="space-between" align="center" wrap>
        <NSpace :size="12" wrap>
          <NInput v-model:value="queryParams.name" placeholder="角色名称或编码" clearable class="w-220px" @keyup.enter="handleSearch" />
          <NSelect v-model:value="queryParams.status" :options="[{ label: '启用', value: '1' }, { label: '禁用', value: '2' }]" clearable placeholder="状态" class="w-130px" />
          <NButton type="primary" @click="handleSearch">搜索</NButton>
          <NButton @click="handleReset">重置</NButton>
        </NSpace>
        <NButton type="primary" @click="handleAdd">新增角色</NButton>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NAlert type="info" :bordered="false" class="mb-16px">
        角色编码会写入用户账号并参与权限校验，创建后不建议修改。R_SUPER 为系统保留角色，不能禁用或删除。
      </NAlert>
      <NDataTable :columns="columns" :data="tableData" :loading="loading" :pagination="false" remote :row-key="row => row.id" striped />
      <div class="flex justify-end mt-16px">
        <NPagination v-model:page="queryParams.current" v-model:page-size="queryParams.size" :item-count="total" :page-sizes="[10, 20, 50]" show-size-picker @update:page="getData" @update:page-size="handleSearch" />
      </div>
    </NCard>

    <NDrawer v-model:show="drawerVisible" width="480px" placement="right">
      <NDrawerContent :title="drawerType === 'add' ? '新增角色' : '编辑角色'" closable>
        <NForm label-placement="left" label-width="90">
          <NFormItem label="角色编码" required>
            <NInput v-model:value="formModel.code" :disabled="drawerType === 'edit'" placeholder="如 R_PURCHASE" />
          </NFormItem>
          <NFormItem label="角色名称" required>
            <NInput v-model:value="formModel.name" placeholder="如 采购人员" />
          </NFormItem>
          <NFormItem label="角色说明">
            <NInput v-model:value="formModel.description" type="textarea" :rows="3" placeholder="说明该角色负责的业务范围" />
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

    <NDrawer v-model:show="accessVisible" width="720px" placement="right">
      <NDrawerContent :title="`配置权限：${accessRole?.name || ''}`" closable>
        <NSpin :show="accessLoading">
          <NAlert type="info" :bordered="false" class="mb-16px">
            系统权限控制首页入口，功能权限控制 EIMS 菜单、按钮和接口。按角色授权的系统可在此配置；“全员开放”系统由外部系统目录控制。R_SUPER 自动拥有全部权限。
          </NAlert>
          <NForm label-placement="top">
            <NFormItem label="允许访问的业务系统">
              <NCheckboxGroup v-model:value="accessForm.systemCodes">
                <NGrid :cols="2" :x-gap="16" :y-gap="8">
                  <NGi v-for="system in activeSystems" :key="system.code">
                    <NCheckbox :value="system.code" :disabled="system.accessMode === 'all'">
                      {{ system.name }}（{{ system.code }}）
                      <NTag v-if="system.accessMode === 'all'" size="small" type="success" :bordered="false">全员开放</NTag>
                    </NCheckbox>
                  </NGi>
                </NGrid>
              </NCheckboxGroup>
              <div v-if="!activeSystems.length" class="text-12px text-gray-500">暂无启用的外部系统</div>
              <div v-else class="mt-8px text-12px text-gray-500">“全员开放”系统由外部系统目录的访问策略控制，不受单个角色取消勾选影响。</div>
            </NFormItem>

            <NFormItem label="菜单权限">
              <NGrid :cols="2" :x-gap="16" :y-gap="8">
                <NGi v-for="permission in menuPermissions" :key="permission.code">
                  <NCheckbox :checked="permissionChecked(permission.code)" @update:checked="value => togglePermission(permission.code, value)">
                    {{ permission.name }}
                  </NCheckbox>
                </NGi>
              </NGrid>
            </NFormItem>

            <NFormItem v-if="buttonPermissions.length" label="按钮权限">
              <NGrid :cols="2" :x-gap="16" :y-gap="8">
                <NGi v-for="permission in buttonPermissions" :key="permission.code">
                  <NCheckbox :checked="permissionChecked(permission.code)" @update:checked="value => togglePermission(permission.code, value)">
                    {{ permission.name }}
                  </NCheckbox>
                </NGi>
              </NGrid>
            </NFormItem>

            <NFormItem v-if="apiPermissions.length" label="接口权限">
              <NGrid :cols="2" :x-gap="16" :y-gap="8">
                <NGi v-for="permission in apiPermissions" :key="permission.code">
                  <NCheckbox :checked="permissionChecked(permission.code)" @update:checked="value => togglePermission(permission.code, value)">
                    {{ permission.name }}
                  </NCheckbox>
                </NGi>
              </NGrid>
            </NFormItem>
          </NForm>
        </NSpin>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="accessVisible = false">取消</NButton>
            <NButton type="primary" :loading="accessLoading" @click="saveAccess">保存权限</NButton>
          </NSpace>
        </template>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped></style>
