<script setup lang="ts">
import { h, reactive, ref } from 'vue';
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
  authMode: 'link',
  accessMode: 'roles',
  allowedRoles: [],
  category: '业务系统',
  helpUrl: '',
  feedbackUrl: '',
  contact: '',
  oauthClientId: null,
  sort: 0,
  status: '1'
};
const formModel = reactive<CreateExternalSystemParams>({ ...defaultForm });

const statusTextMap: Record<string, string> = {
  '1': '启用',
  '2': '禁用'
};
const authModeTextMap: Record<string, string> = {
  link: '普通入口',
  oauth2: 'OAuth2 绑定'
};
const roleOptions = ref<{ label: string; value: string }[]>([]);
const authModeOptions = [
  { label: '普通入口（目标系统自行登录）', value: 'link' },
  { label: 'OAuth2 绑定（进入前先校验绑定）', value: 'oauth2' }
];
const accessModeOptions = [
  { label: '按角色授权（默认拒绝）', value: 'roles' },
  { label: '所有已登录用户', value: 'all' }
];
const statusOptions = [
  { label: '启用', value: '1' },
  { label: '禁用', value: '2' }
];

const columns: DataTableColumns<ExternalSystemRecord> = [
  {
    key: 'name',
    title: '系统名称',
    minWidth: 140,
    render: row => h('div', {}, [h('div', { class: 'font-600' }, row.name), h('div', { class: 'text-12px text-gray-500' }, row.code)])
  },
  {
    key: 'description',
    title: '用途说明',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render: row => row.description || '-'
  },
  {
    key: 'authMode',
    title: '登录方式',
    width: 130,
    render: row => authModeTextMap[row.authMode] || row.authMode
  },
  {
    key: 'allowedRoles',
    title: '允许角色',
    minWidth: 190,
    render: row =>
      row.accessMode === 'all'
        ? '所有已登录用户'
        : row.allowedRoles.length
        ? h(
            NSpace,
            { wrap: true, size: [4, 4] },
            { default: () => row.allowedRoles.map(role => h(NTag, { size: 'small', type: 'info', bordered: false }, { default: () => role })) }
          )
          : '未授权角色'
  },
  {
    key: 'oauthClient',
    title: 'OAuth2 应用',
    minWidth: 150,
    render: row => row.oauthClient?.name || '-'
  },
  {
    key: 'status',
    title: '状态',
    width: 80,
    align: 'center',
    render: row => h(NTag, { type: row.status === '1' ? 'success' : 'error', size: 'small' }, { default: () => statusTextMap[row.status] })
  },
  {
    key: 'sort',
    title: '排序',
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
];

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
    window.$message?.error('请填写系统名称和入口地址');
    return;
  }
  if (drawerType.value === 'add' && !formModel.code?.trim()) {
    window.$message?.error('请填写系统编码');
    return;
  }
  if (formModel.authMode === 'oauth2' && !formModel.oauthClientId) {
    window.$message?.error('OAuth2 登录方式必须选择 OAuth2 应用');
    return;
  }

  startLoading();
  try {
    if (drawerType.value === 'add') {
      const { error } = await fetchCreateExternalSystem({
        ...formModel,
        code: formModel.code.trim(),
        name: formModel.name.trim(),
        entryUrl: formModel.entryUrl.trim()
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
            placeholder="系统名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
          <NSelect
            v-model:value="queryParams.status"
            :options="statusOptions"
            clearable
            placeholder="状态"
            style="width: 130px"
          />
          <NButton type="primary" @click="handleSearch">搜索</NButton>
          <NButton @click="handleReset">重置</NButton>
        </NSpace>
        <NButton type="primary" @click="handleAdd">新增系统</NButton>
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
      <NDrawerContent :title="drawerType === 'add' ? '新增系统目录' : '编辑系统目录'" closable>
        <NAlert type="info" :bordered="false" class="mb-16px">
          默认按角色授权且空角色表示拒绝访问；只有明确选择“所有已登录用户”时才会开放给所有已登录用户。选择 OAuth2 绑定后，用户还必须存在对应的账号绑定才能进入。
        </NAlert>
        <NForm label-placement="left" label-width="100">
          <NFormItem label="系统编码" required>
            <NInput v-model:value="formModel.code" :disabled="drawerType === 'edit'" placeholder="如 erp、crm、mes" />
          </NFormItem>
          <NFormItem label="系统名称" required>
            <NInput v-model:value="formModel.name" placeholder="如 ERP系统" />
          </NFormItem>
          <NFormItem label="用途说明">
            <NInput v-model:value="formModel.description" type="textarea" :rows="2" placeholder="员工进入前能看懂的系统用途" />
          </NFormItem>
          <NFormItem label="系统分类">
            <NInput v-model:value="formModel.category" placeholder="如 业务系统、办公系统" />
          </NFormItem>
          <NFormItem label="入口地址" required>
            <NInput v-model:value="formModel.entryUrl" placeholder="https://example.com/" />
          </NFormItem>
          <NFormItem label="登录方式">
            <NSelect v-model:value="formModel.authMode" :options="authModeOptions" />
          </NFormItem>
          <NFormItem label="访问策略">
            <NSelect v-model:value="formModel.accessMode" :options="accessModeOptions" />
          </NFormItem>
          <NFormItem v-if="formModel.authMode === 'oauth2'" label="OAuth2 应用" required>
            <NSelect
              v-model:value="formModel.oauthClientId"
              :options="oauthClientOptions"
              clearable
              filterable
              placeholder="选择已注册的 OAuth2 应用"
            />
          </NFormItem>
          <NFormItem label="允许角色">
            <NSelect
              v-model:value="formModel.allowedRoles"
              :options="roleOptions"
              multiple
              filterable
              tag
              placeholder="按角色授权时选择角色；留空表示拒绝访问"
            />
          </NFormItem>
          <NFormItem label="图标">
            <NInput v-model:value="formModel.icon" placeholder="mdi:domain" />
          </NFormItem>
          <NFormItem label="颜色">
            <NInput v-model:value="formModel.color" placeholder="#2080f0" />
          </NFormItem>
          <NFormItem label="使用说明地址">
            <NInput v-model:value="formModel.helpUrl" placeholder="可选，http/https 文档地址" />
          </NFormItem>
          <NFormItem label="问题反馈地址">
            <NInput v-model:value="formModel.feedbackUrl" placeholder="可选，http/https 或 mailto 地址" />
          </NFormItem>
          <NFormItem label="联系方式">
            <NInput v-model:value="formModel.contact" placeholder="未配置反馈地址时展示，如 信息化管理员" />
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
            <NButton type="primary" :loading="loading" @click="handleSubmit">
              {{ drawerType === 'add' ? '创建' : '保存' }}
            </NButton>
          </NSpace>
        </template>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>

<style scoped></style>
