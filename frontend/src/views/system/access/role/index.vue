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

const statusTextMap = computed<Record<string, string>>(() => ({
  '1': $t('page.ui.enabled'),
  '2': $t('page.ui.disabled')
}));

const activeSystems = computed(() => accessCatalog.value.systems.filter(system => system.status === '1'));
const activePermissions = computed(() => accessCatalog.value.permissions.filter(permission => permission.status === '1'));

const permissionModuleDefinitions = [
  { key: 'material', prefix: 'eims:material:', labelKey: 'page.ui.permissionModuleMaterial' },
  { key: 'mold', prefix: 'eims:mold:', labelKey: 'page.ui.permissionModuleMold' },
  { key: 'oa', prefix: 'eims:oa:', labelKey: 'page.ui.permissionModuleOa' },
  { key: 'system', prefix: 'eims:system:', labelKey: 'page.ui.permissionModuleSystem' }
] as const;

function getPermissionSubmoduleCode(permission: PermissionRecord) {
  if (permission.type === 'menu') return permission.code;
  if (permission.parentCode) return permission.parentCode;

  const segments = permission.code.split(':');
  return segments.length > 1 ? segments.slice(0, -1).join(':') : permission.code;
}

function buildPermissionSubmodule(key: string, permissions: PermissionRecord[]) {
  const menu = permissions.find(permission => permission.type === 'menu');

  return {
    key,
    label: menu?.name || permissions[0]?.name || key,
    permissions,
    menu: permissions.filter(permission => permission.type === 'menu'),
    button: permissions.filter(permission => permission.type === 'button'),
    api: permissions.filter(permission => permission.type === 'api')
  };
}

function buildPermissionGroup(key: string, label: string, permissions: PermissionRecord[]) {
  return {
    key,
    label,
    permissions,
    submodules: Array.from(
      permissions.reduce((groups, permission) => {
        const submoduleCode = getPermissionSubmoduleCode(permission);
        const submodulePermissions = groups.get(submoduleCode) || [];
        submodulePermissions.push(permission);
        groups.set(submoduleCode, submodulePermissions);
        return groups;
      }, new Map<string, PermissionRecord[]>())
    ).map(([submoduleCode, submodulePermissions]) => buildPermissionSubmodule(submoduleCode, submodulePermissions))
  };
}

const permissionGroups = computed(() => {
  const assignedCodes = new Set<string>();
  const groups = permissionModuleDefinitions
    .map(definition => {
      const permissions = activePermissions.value.filter(permission => permission.code.startsWith(definition.prefix));
      permissions.forEach(permission => assignedCodes.add(permission.code));

      return buildPermissionGroup(definition.key, $t(definition.labelKey), permissions);
    })
    .filter(group => group.permissions.length > 0);

  const otherPermissions = activePermissions.value.filter(permission => !assignedCodes.has(permission.code));
  if (otherPermissions.length) {
    groups.push(buildPermissionGroup('other', $t('page.ui.permissionModuleOther'), otherPermissions));
  }

  return groups;
});

const defaultForm = () => ({
  code: '',
  name: '',
  description: '',
  sort: 0,
  status: '1' as Api.Common.EnableStatus
});

const columns = computed<DataTableColumns<RoleRecord>>(() => [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'name',
    title: $t('page.ui.roleName'),
    minWidth: 160,
    render: row =>
      h('div', {}, [
        h('div', { class: 'font-600' }, row.name),
        h('div', { class: 'text-12px text-gray-500' }, row.code)
      ])
  },
  {
    key: 'description',
    title: $t('page.ui.systemDescription'),
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: row => row.description || '-'
  },
  {
    key: 'systemCodes',
    title: $t('page.ui.accessibleSystems'),
    minWidth: 190,
    render: row => (row.systemCodes.length ? row.systemCodes.join('、') : $t('page.ui.notConfiguredSeparately'))
  },
  {
    key: 'permissionCodes',
    title: $t('page.ui.permissionCount'),
    width: 110,
    align: 'center',
    render: row => (row.code === 'R_SUPER' ? $t('page.ui.allPermissions') : row.permissionCodes.length)
  },
  {
    key: 'status',
    title: $t('page.ui.status'),
    width: 80,
    align: 'center',
    render: row =>
      h(
        NTag,
        { type: row.status === '1' ? 'success' : 'error', size: 'small' },
        { default: () => statusTextMap.value[row.status] }
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
          h(NButton, { size: 'small', type: 'info', ghost: true, onClick: () => handleAccess(row) }, { default: () => $t('page.ui.systemFunction') }),
          h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => handleEdit(row) }, { default: () => $t('common.edit') }),
          h(NButton, { size: 'small', type: row.status === '1' ? 'warning' : 'success', ghost: true, onClick: () => handleToggleStatus(row) }, { default: () => row.status === '1' ? $t('page.ui.disabled') : $t('page.ui.enabled') }),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row) },
            {
              trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true, disabled: row.builtIn }, { default: () => $t('common.delete') }),
              default: () => (row.builtIn ? $t('page.ui.builtInRoleCannotDelete') : $t('page.ui.confirmDeleteRole'))
            }
          )
        ]
      })
  }
]);

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
    window.$message?.error($t('page.ui.fillRoleCodeName'));
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
    window.$message?.warning($t('page.ui.superAdminCannotDisable'));
    return;
  }
  const { error } = await fetchUpdateRole(row.id, { status: row.status === '1' ? '2' : '1' });
  if (!error) {
    window.$message?.success(row.status === '1' ? $t('page.ui.roleDisabled') : $t('page.ui.roleEnabled'));
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
      window.$message?.success($t('page.ui.roleAccessSaved'));
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
          <NInput v-model:value="queryParams.name" :placeholder="$t('page.ui.roleNameOrCode')" clearable class="w-220px" @keyup.enter="handleSearch" />
          <NSelect v-model:value="queryParams.status" :options="[{ label: $t('page.ui.enabled'), value: '1' }, { label: $t('page.ui.disabled'), value: '2' }]" clearable :placeholder="$t('page.ui.status')" class="w-130px" />
          <NButton type="primary" @click="handleSearch">{{ $t('common.search') }}</NButton>
          <NButton @click="handleReset">{{ $t('common.reset') }}</NButton>
        </NSpace>
        <NButton type="primary" @click="handleAdd">{{ $t('page.ui.newRole') }}</NButton>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NAlert type="info" :bordered="false" class="mb-16px">
        {{ $t('page.ui.roleNotice') }}
      </NAlert>
      <NDataTable :columns="columns" :data="tableData" :loading="loading" :pagination="false" remote :row-key="row => row.id" striped />
      <div class="flex justify-end mt-16px">
        <NPagination v-model:page="queryParams.current" v-model:page-size="queryParams.size" :item-count="total" :page-sizes="[10, 20, 50]" show-size-picker @update:page="getData" @update:page-size="handleSearch" />
      </div>
    </NCard>

    <NDrawer v-model:show="drawerVisible" width="480px" placement="right">
      <NDrawerContent :title="drawerType === 'add' ? $t('page.ui.newRole') : $t('page.ui.editRole')" closable>
        <NForm label-placement="left" label-width="90">
          <NFormItem :label="$t('page.ui.roleCode')" required>
            <NInput v-model:value="formModel.code" :disabled="drawerType === 'edit'" :placeholder="$t('page.ui.roleCodePlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.roleName')" required>
            <NInput v-model:value="formModel.name" :placeholder="$t('page.ui.roleNamePlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.roleDescription')">
            <NInput v-model:value="formModel.description" type="textarea" :rows="3" :placeholder="$t('page.ui.roleDescriptionPlaceholder')" />
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

    <NDrawer v-model:show="accessVisible" width="720px" placement="right">
      <NDrawerContent :title="$t('page.ui.configurePermission', { name: accessRole?.name || '' })" closable>
        <NSpin :show="accessLoading">
          <NAlert type="info" :bordered="false" class="mb-16px">
            {{ $t('page.ui.permissionNotice') }}
          </NAlert>
          <NForm label-placement="top">
            <NFormItem :label="$t('page.ui.allowBusinessSystems')">
              <NCheckboxGroup v-model:value="accessForm.systemCodes">
                <NGrid :cols="2" :x-gap="16" :y-gap="8">
                  <NGi v-for="system in activeSystems" :key="system.code">
                    <NCheckbox :value="system.code">
                      {{ system.name }}（{{ system.code }}）
                    </NCheckbox>
                  </NGi>
                </NGrid>
              </NCheckboxGroup>
              <div v-if="!activeSystems.length" class="text-12px text-gray-500">{{ $t('page.ui.noActiveExternalSystems') }}</div>
              <div v-else class="mt-8px text-12px text-gray-500">{{ $t('page.ui.roleSystemAccessNotice') }}</div>
            </NFormItem>

            <div v-if="permissionGroups.length" class="permission-module-list">
              <div class="permission-list-heading">
                <div>
                  <div class="permission-list-title">{{ $t('page.ui.functionPermissions') }}</div>
                  <div class="permission-list-description">{{ $t('page.ui.permissionModuleNotice') }}</div>
                </div>
                <NTag size="small" type="info" :bordered="false">
                  {{ activePermissions.length }}
                </NTag>
              </div>

              <NCard
                v-for="group in permissionGroups"
                :key="group.key"
                size="small"
                :bordered="true"
                class="permission-module-card"
              >
                <template #header>
                  <div class="permission-module-heading">
                    <span>{{ group.label }}</span>
                    <NTag size="small" :bordered="false">{{ group.permissions.length }}</NTag>
                  </div>
                </template>

                <div class="permission-submodule-list">
                  <div v-for="submodule in group.submodules" :key="submodule.key" class="permission-submodule">
                    <div class="permission-submodule-heading">
                      <span class="permission-submodule-title">{{ submodule.label }}</span>
                      <NTag size="small" :bordered="false">{{ submodule.permissions.length }}</NTag>
                    </div>

                    <div v-if="submodule.menu.length" class="permission-category">
                      <div class="permission-category-title">{{ $t('page.ui.menuPermissions') }}</div>
                      <NGrid :cols="2" :x-gap="12" :y-gap="8">
                        <NGi v-for="permission in submodule.menu" :key="permission.code">
                          <NCheckbox :checked="permissionChecked(permission.code)" @update:checked="value => togglePermission(permission.code, value)">
                            {{ permission.name }}
                          </NCheckbox>
                        </NGi>
                      </NGrid>
                    </div>

                    <div v-if="submodule.button.length" class="permission-category">
                      <div class="permission-category-title">{{ $t('page.ui.buttonPermissions') }}</div>
                      <NGrid :cols="2" :x-gap="12" :y-gap="8">
                        <NGi v-for="permission in submodule.button" :key="permission.code">
                          <NCheckbox :checked="permissionChecked(permission.code)" @update:checked="value => togglePermission(permission.code, value)">
                            {{ permission.name }}
                          </NCheckbox>
                        </NGi>
                      </NGrid>
                    </div>

                    <div v-if="submodule.api.length" class="permission-category">
                      <div class="permission-category-title">{{ $t('page.ui.apiPermissions') }}</div>
                      <NGrid :cols="2" :x-gap="12" :y-gap="8">
                        <NGi v-for="permission in submodule.api" :key="permission.code">
                          <NCheckbox :checked="permissionChecked(permission.code)" @update:checked="value => togglePermission(permission.code, value)">
                            {{ permission.name }}
                          </NCheckbox>
                        </NGi>
                      </NGrid>
                    </div>
                  </div>
                </div>
              </NCard>
            </div>
          </NForm>
        </NSpin>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="accessVisible = false">{{ $t('common.cancel') }}</NButton>
            <NButton type="primary" :loading="accessLoading" @click="saveAccess">{{ $t('page.ui.savePermissions') }}</NButton>
          </NSpace>
        </template>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped>
.permission-module-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.permission-list-heading,
.permission-module-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.permission-list-heading {
  padding: 4px 2px 0;
}

.permission-list-title {
  color: var(--n-text-color);
  font-size: 14px;
  font-weight: 600;
}

.permission-list-description {
  margin-top: 4px;
  color: var(--n-text-color-3);
  font-size: 12px;
  line-height: 1.5;
}

.permission-module-card :deep(.n-card-header) {
  padding: 12px 14px;
}

.permission-module-card :deep(.n-card__content) {
  padding: 12px 14px 14px;
}

.permission-submodule-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.permission-submodule {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--n-divider-color);
  border-radius: 8px;
  background: var(--n-color-embedded);
}

.permission-submodule-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.permission-submodule-title {
  overflow: hidden;
  color: var(--n-text-color);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.permission-module-heading {
  color: var(--n-text-color);
  font-size: 14px;
  font-weight: 600;
}

.permission-category + .permission-category {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--n-divider-color);
}

.permission-category-title {
  margin-bottom: 8px;
  color: var(--n-text-color-2);
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 720px) {
  .permission-submodule-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
