<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NPopconfirm, NSpace, NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import {
  fetchCreateExternalSystem,
  fetchDeleteExternalSystem,
  fetchExternalSystemPage,
  fetchOAuth2ClientPage,
  fetchRoleOptions,
  fetchUpdateExternalSystem
} from '@/service/api';
import type {
  CreateExternalSystemParams,
  ExternalSystemRecord,
  UpdateExternalSystemParams
} from '@/service/api/portal';
import { $t } from '@/locales';

defineOptions({
  name: 'ExternalSystemManage'
});

const { loading, startLoading, endLoading } = useLoading(false);
const tableData = ref<ExternalSystemRecord[]>([]);
const queryParams = reactive({
  current: 1,
  size: 10,
  name: undefined as string | undefined,
  status: undefined as Api.Common.EnableStatus | undefined
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>('add');
const editRow = ref<ExternalSystemRecord | null>(null);
const oauthClientOptions = ref<{ label: string; value: string }[]>([]);

const defaultForm: CreateExternalSystemParams = {
  code: '',
  name: '',
  description: '',
  icon: 'mdi:application-outline',
  color: '#2080f0',
  entryUrl: '',
  ssoStartUrl: '',
  authMode: 'link',
  accessMode: 'roles',
  allowedRoles: [],
  category: $t('page.ui.businessSystem'),
  helpUrl: '',
  feedbackUrl: '',
  contact: '',
  oauthClientId: null,
  sort: 0,
  status: '1'
};
const formModel = reactive<CreateExternalSystemParams>({ ...defaultForm });

const statusTextMap = computed<Record<string, string>>(() => ({
  '1': $t('page.ui.enabled'),
  '2': $t('page.ui.disabled')
}));
const authModeTextMap = computed<Record<string, string>>(() => ({
  link: $t('page.ui.ordinaryEntry'),
  oauth2: $t('page.ui.oauthBinding')
}));
const roleOptions = ref<{ label: string; value: string }[]>([]);
const authModeOptions = computed(() => [
  { label: $t('page.ui.ordinaryEntryDescription'), value: 'link' },
  { label: $t('page.ui.oauthBindingDescription'), value: 'oauth2' }
]);
const accessModeOptions = computed(() => [
  { label: $t('page.ui.roleAccess'), value: 'roles' },
  { label: $t('page.ui.allLoggedInUsers'), value: 'all' }
]);
const statusOptions = computed(() => [
  { label: $t('page.ui.enabled'), value: '1' },
  { label: $t('page.ui.disabled'), value: '2' }
]);

const columns = computed<DataTableColumns<ExternalSystemRecord>>(() => [
  {
    key: 'name',
    title: $t('page.ui.systemName'),
    minWidth: 140,
    render: row => h('div', {}, [h('div', { class: 'font-600' }, row.name), h('div', { class: 'text-12px text-gray-500' }, row.code)])
  },
  {
    key: 'description',
    title: $t('page.ui.systemDescription'),
    minWidth: 220,
    ellipsis: { tooltip: true },
    render: row => row.description || '-'
  },
  {
    key: 'authMode',
    title: $t('page.ui.loginMode'),
    width: 130,
    render: row => authModeTextMap.value[row.authMode] || row.authMode
  },
  {
    key: 'allowedRoles',
    title: $t('page.ui.allowedRoles'),
    minWidth: 190,
    render: row =>
      row.accessMode === 'all'
        ? $t('page.ui.allLoggedInUsers')
        : row.allowedRoles.length
        ? h(
            NSpace,
            { wrap: true, size: [4, 4] },
            { default: () => row.allowedRoles.map(role => h(NTag, { size: 'small', type: 'info', bordered: false }, { default: () => role })) }
          )
          : $t('page.ui.unauthorizedRoles')
  },
  {
    key: 'oauthClient',
    title: $t('page.ui.oauthClient'),
    minWidth: 150,
    render: row => row.oauthClient?.name || '-'
  },
  {
    key: 'status',
    title: $t('page.ui.status'),
    width: 80,
    align: 'center',
    render: row => h(NTag, { type: row.status === '1' ? 'success' : 'error', size: 'small' }, { default: () => statusTextMap.value[row.status] })
  },
  {
    key: 'sort',
    title: $t('page.ui.sort'),
    width: 70,
    align: 'center'
  },
  {
    key: 'operate',
    title: $t('common.operate'),
    width: 150,
    fixed: 'right',
    align: 'center',
    render: row =>
      h(NSpace, { justify: 'center', size: [8, 0] }, {
        default: () => [
          h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => handleEdit(row) }, { default: () => $t('common.edit') }),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row) },
            {
              trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => $t('common.delete') }),
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
    const { data, error } = await fetchExternalSystemPage({ ...queryParams });
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

async function loadOAuthClients() {
  const { data } = await fetchOAuth2ClientPage({ current: 1, size: 100 });
  if (data?.records) {
    oauthClientOptions.value = data.records.map(client => ({
      label: `${client.name} (${client.clientId})`,
      value: client.clientId
    }));
  }
}

async function loadRoleOptions() {
  const { data } = await fetchRoleOptions();
  if (data) {
    roleOptions.value = data.map(role => ({
      label: `${role.name}（${role.code}）`,
      value: role.code
    }));
  }
}

function resetForm() {
  Object.assign(formModel, { ...defaultForm, allowedRoles: [] });
}

function handleAdd() {
  drawerType.value = 'add';
  editRow.value = null;
  resetForm();
  drawerVisible.value = true;
  void loadOAuthClients();
  void loadRoleOptions();
}

function handleEdit(row: ExternalSystemRecord) {
  drawerType.value = 'edit';
  editRow.value = row;
  Object.assign(formModel, {
    code: row.code,
    name: row.name,
    description: row.description || '',
    icon: row.icon,
    color: row.color,
    entryUrl: row.entryUrl,
    ssoStartUrl: row.ssoStartUrl || '',
    authMode: row.authMode,
    accessMode: row.accessMode,
    allowedRoles: [...row.allowedRoles],
    category: row.category,
    helpUrl: row.helpUrl || '',
    feedbackUrl: row.feedbackUrl || '',
    contact: row.contact || '',
    oauthClientId: row.oauthClientId || null,
    sort: row.sort,
    status: row.status
  });
  drawerVisible.value = true;
  void loadOAuthClients();
  void loadRoleOptions();
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

async function handleDelete(row: ExternalSystemRecord) {
  const { error } = await fetchDeleteExternalSystem(row.id);
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'));
    void getData();
  }
}

async function handleSubmit() {
  if (!formModel.name?.trim() || !formModel.entryUrl?.trim()) {
    window.$message?.error($t('page.ui.fillSystemNameEntry'));
    return;
  }
  if (drawerType.value === 'add' && !formModel.code?.trim()) {
    window.$message?.error($t('page.ui.fillSystemCode'));
    return;
  }
  if (formModel.authMode === 'oauth2' && !formModel.oauthClientId) {
    window.$message?.error($t('page.ui.oauthAppRequired'));
    return;
  }

  startLoading();
  try {
    if (drawerType.value === 'add') {
      const { error } = await fetchCreateExternalSystem({
        ...formModel,
        code: formModel.code.trim(),
        name: formModel.name.trim(),
        entryUrl: formModel.entryUrl.trim(),
        ssoStartUrl: formModel.ssoStartUrl?.trim() || null
      });
      if (!error) {
        window.$message?.success($t('common.addSuccess'));
        drawerVisible.value = false;
        void getData();
      }
    } else if (editRow.value) {
      const updateData: UpdateExternalSystemParams = {
        name: formModel.name.trim(),
        description: formModel.description,
        icon: formModel.icon,
        color: formModel.color,
        entryUrl: formModel.entryUrl.trim(),
        ssoStartUrl: formModel.ssoStartUrl?.trim() || null,
        authMode: formModel.authMode,
        accessMode: formModel.accessMode,
        allowedRoles: formModel.allowedRoles,
        category: formModel.category,
        helpUrl: formModel.helpUrl,
        feedbackUrl: formModel.feedbackUrl,
        contact: formModel.contact,
        oauthClientId: formModel.oauthClientId,
        sort: formModel.sort,
        status: formModel.status
      };
      const { error } = await fetchUpdateExternalSystem(editRow.value.id, updateData);
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

function handlePageChange(page: number) {
  queryParams.current = page;
  void getData();
}

function handlePageSizeChange(size: number) {
  queryParams.current = 1;
  queryParams.size = size;
  void getData();
}

void getData();
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false">
      <NSpace justify="space-between" align="center" wrap>
        <NSpace :size="12" wrap>
          <NInput
            v-model:value="queryParams.name"
            :placeholder="$t('page.ui.systemName')"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
          <NSelect
            v-model:value="queryParams.status"
            :options="statusOptions"
            clearable
            :placeholder="$t('page.ui.status')"
            style="width: 130px"
          />
          <NButton type="primary" @click="handleSearch">{{ $t('common.search') }}</NButton>
          <NButton @click="handleReset">{{ $t('common.reset') }}</NButton>
        </NSpace>
        <NButton type="primary" @click="handleAdd">{{ $t('page.ui.newExternalSystem') }}</NButton>
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

    <NDrawer v-model:show="drawerVisible" width="560px" placement="right">
      <NDrawerContent :title="drawerType === 'add' ? $t('page.ui.newExternalCatalog') : $t('page.ui.editExternalCatalog')" closable>
        <NAlert type="info" :bordered="false" class="mb-16px">
          {{ $t('page.ui.accessPolicyNotice') }}
        </NAlert>
        <NForm label-placement="left" label-width="100">
          <NFormItem :label="$t('page.ui.systemCode')" required>
            <NInput v-model:value="formModel.code" :disabled="drawerType === 'edit'" :placeholder="$t('page.ui.systemCodePlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.systemName')" required>
            <NInput v-model:value="formModel.name" :placeholder="$t('page.ui.externalSystemNamePlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.systemDescription')">
            <NInput v-model:value="formModel.description" type="textarea" :rows="2" :placeholder="$t('page.ui.systemDescriptionPlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.systemCategory')">
            <NInput v-model:value="formModel.category" :placeholder="$t('page.ui.systemCategoryPlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.entryUrl')" required>
            <NInput v-model:value="formModel.entryUrl" placeholder="https://example.com/" />
          </NFormItem>
          <NFormItem v-if="formModel.authMode === 'oauth2'" :label="$t('page.ui.ssoStartUrl')">
            <NInput
              v-model:value="formModel.ssoStartUrl"
              :placeholder="$t('page.ui.ssoStartUrlPlaceholder')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.ui.loginMode')">
            <NSelect v-model:value="formModel.authMode" :options="authModeOptions" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.accessPolicy')">
            <NSelect v-model:value="formModel.accessMode" :options="accessModeOptions" />
          </NFormItem>
          <NFormItem v-if="formModel.authMode === 'oauth2'" :label="$t('page.ui.oauthClient')" required>
            <NSelect
              v-model:value="formModel.oauthClientId"
              :options="oauthClientOptions"
              clearable
              filterable
              :placeholder="$t('page.ui.oauthAppSelect')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.ui.allowedRoles')">
            <NSelect
              v-model:value="formModel.allowedRoles"
              :options="roleOptions"
              multiple
              filterable
              tag
              :placeholder="$t('page.ui.allowedRolesPlaceholder')"
            />
          </NFormItem>
          <NFormItem :label="$t('page.ui.icon')">
            <NInput v-model:value="formModel.icon" placeholder="mdi:domain" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.color')">
            <NInput v-model:value="formModel.color" placeholder="#2080f0" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.helpUrl')">
            <NInput v-model:value="formModel.helpUrl" :placeholder="$t('page.ui.helpUrlPlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.feedbackUrl')">
            <NInput v-model:value="formModel.feedbackUrl" :placeholder="$t('page.ui.feedbackUrlPlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('page.ui.contact')">
            <NInput v-model:value="formModel.contact" :placeholder="$t('page.ui.contactPlaceholder')" />
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
            <NButton type="primary" :loading="loading" @click="handleSubmit">
              {{ drawerType === 'add' ? $t('common.add') : $t('page.ui.save') }}
            </NButton>
          </NSpace>
        </template>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped></style>
