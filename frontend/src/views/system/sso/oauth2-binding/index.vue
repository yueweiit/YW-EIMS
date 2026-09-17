<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import { NButton, NDataTable, NModal, NPagination, NSelect, NSpace, NTag } from 'naive-ui';
import { useLoading } from '@sa/hooks';
import { fetchOAuth2BindingUserPage } from '@/service/api';
import type { OAuth2BindingRecord, OAuth2BindingUserRecord } from '@/service/api/oauth2-binding';
import { $t } from '@/locales';
import OAuth2BindingOperateDrawer from './modules/oauth2-binding-operate-drawer.vue';
import OAuth2BindingSearch from './modules/oauth2-binding-search.vue';

defineOptions({
  name: 'OAuth2BindingManage'
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<OAuth2BindingUserRecord[]>([]);
const queryParams = reactive({
  current: 1,
  size: 10,
  keyword: undefined as string | undefined,
  clientId: undefined as string | undefined
});
const total = ref(0);

const drawerVisible = ref(false);
const selectedUser = ref<OAuth2BindingUserRecord | null>(null);
const userPickerVisible = ref(false);
const userPickerLoading = ref(false);
const userPickerId = ref<number | null>(null);
const userPickerKeyword = ref<string | undefined>();
const userPickerUsers = ref<OAuth2BindingUserRecord[]>([]);

const userPickerOptions = computed(() =>
  userPickerUsers.value.map(user => ({
    label: user.realName ? `${user.realName} (${user.userName})` : user.userName,
    value: user.id
  }))
);

function getBindingLabel(binding: OAuth2BindingRecord) {
  const clientName = binding.client?.name || binding.clientId;
  const accountName = binding.appUsername || binding.appUserId;
  return `${clientName} · ${accountName}`;
}

const columns = computed<DataTableColumns<OAuth2BindingUserRecord>>(() => [
  {
    key: 'index',
    title: $t('common.index'),
    width: 60,
    align: 'center',
    render: (_row, index) => (queryParams.current - 1) * queryParams.size + index + 1
  },
  {
    key: 'ssoUser',
    title: $t('page.ui.ssoUser'),
    minWidth: 190,
    render: row =>
      h('div', { class: 'binding-user-cell' }, [
        h('div', { class: 'binding-user-cell__name' }, row.realName || row.userName),
        h('div', { class: 'binding-user-cell__account' }, row.userName)
      ])
  },
  {
    key: 'bindings',
    title: $t('page.ui.boundApplications'),
    minWidth: 360,
    render: row =>
      row.bindings.length
        ? h(
            NSpace,
            { wrap: true, size: [6, 6] },
            {
              default: () =>
                row.bindings.map(binding =>
                  h(
                    NTag,
                    {
                      key: binding.id,
                      size: 'small',
                      type: 'success',
                      bordered: false,
                      class: 'binding-application-tag'
                    },
                    { default: () => getBindingLabel(binding) }
                  )
                )
            }
          )
        : h(NTag, { size: 'small', bordered: false }, { default: () => $t('page.ui.noBindings') })
  },
  {
    key: 'bindingCount',
    title: $t('page.ui.bindingCount'),
    width: 100,
    align: 'center',
    render: row => row.bindings.length
  },
  {
    key: 'status',
    title: $t('page.ui.status'),
    width: 90,
    align: 'center',
    render: row =>
      h(
        NTag,
        { size: 'small', type: row.status === '1' ? 'success' : 'warning', bordered: false },
        { default: () => (row.status === '1' ? $t('page.ui.enabled') : $t('page.ui.disabled')) }
      )
  },
  {
    key: 'operate',
    title: $t('common.operate'),
    width: 130,
    fixed: 'right',
    align: 'center',
    render: row =>
      h(
        NButton,
        { size: 'small', type: 'primary', ghost: true, onClick: () => handleManage(row) },
        { default: () => $t('page.ui.manageBindings') }
      )
  }
]);

async function getData() {
  startLoading();
  try {
    const { data, error } = await fetchOAuth2BindingUserPage({ ...queryParams });
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
  void getData();
}

function handleReset() {
  queryParams.keyword = undefined;
  queryParams.clientId = undefined;
  queryParams.current = 1;
  void getData();
}

async function loadUserPickerUsers(keyword?: string) {
  userPickerLoading.value = true;
  try {
    const { data, error } = await fetchOAuth2BindingUserPage({ current: 1, size: 100, keyword });
    if (!error && data) {
      userPickerUsers.value = data.records;
    }
  } finally {
    userPickerLoading.value = false;
  }
}

function handleAdd() {
  userPickerId.value = null;
  userPickerKeyword.value = undefined;
  userPickerUsers.value = [];
  userPickerVisible.value = true;
  void loadUserPickerUsers();
}

function handleUserPickerSearch(keyword: string) {
  userPickerKeyword.value = keyword.trim() || undefined;
  void loadUserPickerUsers(userPickerKeyword.value);
}

function handleConfirmAdd() {
  if (userPickerId.value === null) {
    window.$message?.warning($t('page.ui.selectEimsUserRequired'));
    return;
  }

  const user = userPickerUsers.value.find(item => item.id === userPickerId.value);
  if (!user) {
    window.$message?.warning($t('page.ui.selectEimsUserRequired'));
    return;
  }

  selectedUser.value = user;
  userPickerVisible.value = false;
  drawerVisible.value = true;
}

function handleManage(row: OAuth2BindingUserRecord) {
  selectedUser.value = row;
  drawerVisible.value = true;
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
        <OAuth2BindingSearch v-model="queryParams" @search="handleSearch" @reset="handleReset" />
        <NButton type="primary" @click="handleAdd">
          {{ $t('page.ui.newUserBinding') }}
        </NButton>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NAlert type="info" :bordered="false" class="mb-16px">
        {{ $t('page.ui.bindingGroupNotice') }}
      </NAlert>
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

    <NModal
      v-model:show="userPickerVisible"
      preset="card"
      :title="$t('page.ui.newUserBinding')"
      :mask-closable="false"
      style="width: min(520px, calc(100vw - 32px))"
    >
      <NAlert type="info" :bordered="false" class="mb-16px">
        {{ $t('page.ui.newUserBindingHint') }}
      </NAlert>
      <NSelect
        v-model:value="userPickerId"
        :options="userPickerOptions"
        :loading="userPickerLoading"
        filterable
        remote
        clearable
        :placeholder="$t('page.ui.selectEimsUser')"
        @search="handleUserPickerSearch"
      />
      <template #footer>
        <NSpace justify="end">
          <NButton @click="userPickerVisible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleConfirmAdd">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <OAuth2BindingOperateDrawer
      v-model:visible="drawerVisible"
      :user="selectedUser"
      @submitted="getData"
    />
  </NSpace>
</template>

<style scoped>
.binding-user-cell {
  min-width: 0;
}

.binding-user-cell__name {
  overflow: hidden;
  color: var(--n-text-color);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.binding-user-cell__account {
  margin-top: 3px;
  overflow: hidden;
  color: var(--n-text-color-3);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.binding-application-tag {
  max-width: 260px;
}

.binding-application-tag :deep(.n-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
