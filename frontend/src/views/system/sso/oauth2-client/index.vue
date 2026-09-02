<script setup lang="ts">
import { computed, h, reactive, ref } from "vue";
import type { DataTableColumns } from "naive-ui";
import {
  NButton,
  NCard,
  NDataTable,
  NPopconfirm,
  NSpace,
  NTag,
  NPagination,
  NTooltip,
} from "naive-ui";
import { useLoading } from "@sa/hooks";
import {
  fetchOAuth2ClientPage,
  fetchDeleteOAuth2Client,
  fetchResetOAuth2ClientSecret,
} from "@/service/api";
import type { OAuth2ClientRecord } from "@/service/api/oauth2-client";
import { $t } from "@/locales";
import OAuth2ClientOperateDrawer from "./modules/oauth2-client-operate-drawer.vue";
import OAuth2ClientSearch from "./modules/oauth2-client-search.vue";

defineOptions({
  name: "OAuth2ClientManage",
});

const { loading, startLoading, endLoading } = useLoading(false);

const tableData = ref<OAuth2ClientRecord[]>([]);
const queryParams = reactive({
  current: 1,
  size: 10,
  name: undefined as string | undefined,
});
const total = ref(0);

const drawerVisible = ref(false);
const drawerType = ref<NaiveUI.TableOperateType>("add");
const editRow = ref<OAuth2ClientRecord | null>(null);

const secretDialogVisible = ref(false);
const secretDialogData = ref<{ clientId: string; clientSecret: string } | null>(
  null,
);

const statusTextMap = computed<Record<string, string>>(() => ({
  "1": $t('page.ui.enabled'),
  "2": $t('page.ui.disabled')
}));

const columns = computed<DataTableColumns<OAuth2ClientRecord>>(() => [
  {
    key: "index",
    title: $t("common.index"),
    width: 60,
    align: "center",
    render: (_row, index) =>
      (queryParams.current - 1) * queryParams.size + index + 1,
  },
  {
    key: "name",
    title: $t('page.ui.appName'),
    minWidth: 150,
    ellipsis: { tooltip: true },
  },
  {
    key: "clientId",
    title: "Client ID",
    minWidth: 200,
    ellipsis: { tooltip: true },
  },
  {
    key: "redirectUris",
    title: $t('page.ui.redirectUri'),
    minWidth: 250,
    render: (row) =>
      h(
        NSpace,
        { vertical: true, size: [0, 4] },
        {
          default: () =>
            row.redirectUris.map((uri) =>
              h(
                NTooltip,
                { trigger: "hover" },
                {
                  trigger: () =>
                    h(
                      "span",
                      {
                        class:
                          "text-12px text-gray-500 truncate block max-w-220px",
                      },
                      uri,
                    ),
                  default: () => uri,
                },
              ),
            ),
        },
      ),
  },
  {
    key: "scopes",
    title: "Scopes",
    minWidth: 200,
    render: (row) =>
      h(
        NSpace,
        { wrap: true, size: [4, 4] },
        {
          default: () =>
            row.scopes.map((scope) =>
              h(
                NTag,
                { type: "info", size: "small", bordered: false },
                { default: () => scope },
              ),
            ),
        },
      ),
  },
  {
    key: "status",
    title: $t('page.ui.status'),
    width: 80,
    align: "center",
    render: (row) =>
      h(
        NTag,
        { type: row.status === "1" ? "success" : "error", size: "small" },
        { default: () => statusTextMap.value[row.status ?? "2"] },
      ),
  },
  {
    key: "createTime",
    title: $t('page.ui.createdAt'),
    minWidth: 170,
  },
  {
    key: "operate",
    title: $t("common.operate"),
    width: 240,
    fixed: "right",
    align: "center",
    render: (row) =>
      h(
        NSpace,
        { justify: "center", size: [8, 0] },
        {
          default: () => [
            h(
              NButton,
              {
                size: "small",
                type: "primary",
                ghost: true,
                onClick: () => handleEdit(row),
              },
              { default: () => $t("common.edit") },
            ),
            h(
              NPopconfirm,
              {
                positiveText: $t('page.ui.confirmReset'),
                negativeText: $t('common.cancel'),
                onPositiveClick: () => handleResetSecret(row),
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    { size: "small", type: "warning", ghost: true },
                    { default: () => $t('page.ui.resetSecret') },
                ),
                default: () => $t('page.ui.resetSecretConfirm'),
              },
            ),
            h(
              NPopconfirm,
              { onPositiveClick: () => handleDelete(row) },
              {
                trigger: () =>
                  h(
                    NButton,
                    { size: "small", type: "error", ghost: true },
                    { default: () => $t("common.delete") },
                  ),
                default: () => $t("common.confirmDelete"),
              },
            ),
          ],
        },
      ),
  },
]);

async function getData() {
  startLoading();
  try {
    const { data, error } = await fetchOAuth2ClientPage({ ...queryParams });
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

function handleReset() {
  queryParams.name = undefined;
  queryParams.current = 1;
  getData();
}

function handleAdd() {
  drawerType.value = "add";
  editRow.value = null;
  drawerVisible.value = true;
}

function handleEdit(row: OAuth2ClientRecord) {
  drawerType.value = "edit";
  editRow.value = row;
  drawerVisible.value = true;
}

function handleSecretCreated(secret: {
  clientId: string;
  clientSecret: string;
}) {
  secretDialogData.value = secret;
  secretDialogVisible.value = true;
}

async function handleDelete(row: OAuth2ClientRecord) {
  const { error } = await fetchDeleteOAuth2Client(row.id);
  if (!error) {
    window.$message?.success($t("common.deleteSuccess"));
    getData();
  }
}

async function handleResetSecret(row: OAuth2ClientRecord) {
  const { data, error } = await fetchResetOAuth2ClientSecret(row.id);
  if (!error && data) {
    secretDialogData.value = data;
    secretDialogVisible.value = true;
    window.$message?.success($t('page.ui.secretReset'));
  }
}

function copySecret() {
  if (secretDialogData.value?.clientSecret) {
    navigator.clipboard.writeText(secretDialogData.value.clientSecret);
    window.$message?.success($t('page.ui.copiedToClipboard'));
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
        <OAuth2ClientSearch
          v-model="queryParams"
          @search="handleSearch"
          @reset="handleReset"
        />
        <NButton type="primary" @click="handleAdd">
          {{ $t("common.add") }}
        </NButton>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NDataTable
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="false"
        remote
        :row-key="(row) => row.id"
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

    <OAuth2ClientOperateDrawer
      v-model:visible="drawerVisible"
      :type="drawerType"
      :row-data="editRow"
      @submitted="getData"
      @secret-created="handleSecretCreated"
    />

    <!-- Secret display dialog -->
    <NModal
      v-model:show="secretDialogVisible"
      preset="card"
      :title="$t('page.ui.copySecret')"
      style="width: 500px"
    >
      <NAlert type="warning" class="mb-16px">
        {{ $t('page.ui.secretSaveOnce') }}
      </NAlert>
      <div class="mb-12px">
        <p class="text-12px text-gray-500 mb-4px">Client ID</p>
        <NInput :value="secretDialogData?.clientId" readonly />
      </div>
      <div>
        <p class="text-12px text-gray-500 mb-4px">Client Secret</p>
        <NInput
          :value="secretDialogData?.clientSecret"
          readonly
          type="textarea"
          :rows="3"
        />
      </div>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="secretDialogVisible = false">{{ $t('page.ui.close') }}</NButton>
          <NButton type="primary" @click="copySecret">{{ $t('page.ui.copySecret') }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </NSpace>
</template>

<style scoped></style>
