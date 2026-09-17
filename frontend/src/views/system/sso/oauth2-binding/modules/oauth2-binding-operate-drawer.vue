<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useLoading } from '@sa/hooks';
import {
  fetchCreateOAuth2Binding,
  fetchDeleteOAuth2Binding,
  fetchOAuth2BindingPage,
  fetchOAuth2ClientPage,
  fetchUpdateOAuth2Binding
} from '@/service/api';
import type { OAuth2BindingRecord, OAuth2BindingUserRecord } from '@/service/api/oauth2-binding';
import type { OAuth2ClientRecord } from '@/service/api/oauth2-client';
import { $t } from '@/locales';

defineOptions({
  name: 'OAuth2BindingOperateDrawer'
});

interface Props {
  visible: boolean;
  user?: OAuth2BindingUserRecord | null;
}

interface BindingEditor {
  clientId: string;
  clientName: string;
  clientStatus: string;
  bindingId?: number;
  appUserId: string;
  appUsername: string;
  errorMessage: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'submitted'): void;
}>();

const { loading, startLoading, endLoading } = useLoading(false);
const editors = ref<BindingEditor[]>([]);
const savingClientId = ref<string | null>(null);
const deletingBindingId = ref<number | null>(null);
const operationPending = computed(() => Boolean(savingClientId.value) || Boolean(deletingBindingId.value));

const drawerTitle = computed(() =>
  $t('page.ui.manageUserBindings', {
    name: props.user?.realName || props.user?.userName || ''
  })
);
const boundCount = computed(() => editors.value.filter(editor => editor.bindingId).length);

watch(
  () => [props.visible, props.user?.id] as const,
  ([visible]) => {
    if (visible && props.user) {
      void loadData();
    } else if (!visible) {
      editors.value = [];
    }
  }
);

function createEditor(client: OAuth2ClientRecord, binding?: OAuth2BindingRecord): BindingEditor {
  return {
    clientId: client.clientId,
    clientName: client.name,
    clientStatus: client.status,
    bindingId: binding?.id,
    appUserId: binding?.appUserId || '',
    appUsername: binding?.appUsername || '',
    errorMessage: ''
  };
}

async function loadData() {
  if (!props.user) return;

  startLoading();
  try {
    const [bindingResult, clientResult] = await Promise.all([
      fetchOAuth2BindingPage({ current: 1, size: 100, ssoUserId: props.user.id }),
      fetchOAuth2ClientPage({ current: 1, size: 100 })
    ]);
    if (bindingResult.error || clientResult.error) return;

    const bindings = bindingResult.data?.records || [];
    const clients = (clientResult.data?.records || []).filter(
      client => client.externalSystem?.authMode === 'oauth2'
    );
    const bindingMap = new Map(bindings.map(binding => [binding.clientId, binding]));

    editors.value = clients
      .map(client => createEditor(client, bindingMap.get(client.clientId)))
      .sort((left, right) => {
        const bindingDifference = Number(Boolean(right.bindingId)) - Number(Boolean(left.bindingId));
        if (bindingDifference) return bindingDifference;
        return left.clientName.localeCompare(right.clientName);
      });
  } finally {
    endLoading();
  }
}

function handleClose() {
  emit('update:visible', false);
}

function isErpClient(editor: BindingEditor) {
  return `${editor.clientName} ${editor.clientId}`.toLowerCase().includes('erp');
}

function canSave(editor: BindingEditor) {
  return editor.clientStatus === '1' || Boolean(editor.bindingId);
}

async function handleSave(editor: BindingEditor) {
  if (!props.user || operationPending.value) return;

  const appUserId = editor.appUserId.trim();
  if (!appUserId) {
    editor.errorMessage = $t('page.ui.enterBusinessUserId');
    return;
  }

  savingClientId.value = editor.clientId;
  editor.errorMessage = '';
  try {
    const result = editor.bindingId
      ? await fetchUpdateOAuth2Binding(editor.bindingId, {
          appUserId,
          appUsername: editor.appUsername.trim() || null
        })
      : await fetchCreateOAuth2Binding({
          ssoUserId: props.user.id,
          clientId: editor.clientId,
          appUserId,
          appUsername: editor.appUsername.trim() || undefined
        });

    if (result.error?.response?.status === 409) {
      const message: unknown = result.error.response.data?.msg;
      editor.errorMessage = typeof message === 'string' ? message : $t('page.ui.bindingConflictNotice');
      return;
    }
    if (result.error) return;

    window.$message?.success(editor.bindingId ? $t('page.ui.saveSuccess') : $t('page.ui.bindingSuccess'));
    await loadData();
    emit('submitted');
  } finally {
    savingClientId.value = null;
  }
}

async function handleDelete(editor: BindingEditor) {
  if (!editor.bindingId || operationPending.value) return;

  deletingBindingId.value = editor.bindingId;
  try {
    const { error } = await fetchDeleteOAuth2Binding(editor.bindingId);
    if (error) return;

    window.$message?.success($t('page.ui.unbindSuccess'));
    await loadData();
    emit('submitted');
  } finally {
    deletingBindingId.value = null;
  }
}
</script>

<template>
  <NDrawer :show="visible" width="min(760px, 100vw)" @update:show="handleClose">
    <NDrawerContent :title="drawerTitle" closable>
      <NSpin :show="loading">
        <template v-if="user">
          <div class="binding-user-summary">
            <div class="binding-user-mark">
              {{ (user.realName || user.userName).slice(0, 1).toUpperCase() }}
            </div>
            <div class="binding-user-identity">
              <div class="binding-user-name">{{ user.realName || user.userName }}</div>
              <div class="binding-user-account">{{ user.userName }}</div>
            </div>
            <div class="binding-user-metrics">
              <span>{{ $t('page.ui.boundApplicationCount', { count: boundCount }) }}</span>
              <NTag size="small" :type="user.status === '1' ? 'success' : 'warning'" :bordered="false">
                {{ user.status === '1' ? $t('page.ui.enabled') : $t('page.ui.disabled') }}
              </NTag>
            </div>
          </div>

          <NAlert type="info" :bordered="false" class="mb-16px">
            {{ $t('page.ui.bindingManagementNotice') }}
          </NAlert>

          <div v-if="editors.length" class="binding-system-list">
            <section
              v-for="editor in editors"
              :key="editor.clientId"
              class="binding-system-card"
              :class="{ 'is-bound': editor.bindingId }"
            >
              <div class="binding-system-heading">
                <div class="binding-system-identity">
                  <div class="binding-system-name">{{ editor.clientName }}</div>
                  <div class="binding-system-client">{{ editor.clientId }}</div>
                </div>
                <NSpace :size="6" align="center">
                  <NTag v-if="editor.clientStatus !== '1'" size="small" type="warning" :bordered="false">
                    {{ $t('page.ui.applicationDisabled') }}
                  </NTag>
                  <NTag size="small" :type="editor.bindingId ? 'success' : 'default'" :bordered="false">
                    {{ editor.bindingId ? $t('page.ui.boundStatus') : $t('page.ui.unboundStatus') }}
                  </NTag>
                </NSpace>
              </div>

              <NAlert v-if="isErpClient(editor)" type="info" :bordered="false" class="mb-12px">
                {{ $t('page.ui.erpBindingNotice') }}
              </NAlert>
              <NAlert v-if="editor.errorMessage" type="warning" :bordered="false" class="mb-12px">
                {{ editor.errorMessage }}
              </NAlert>

              <NForm label-placement="top" :disabled="operationPending">
                <div class="binding-field-grid">
                  <NFormItem :label="$t('page.ui.businessUserId')" required>
                    <NInput
                      v-model:value="editor.appUserId"
                      :maxlength="255"
                      :placeholder="$t('page.ui.businessUserIdPlaceholder')"
                    />
                  </NFormItem>
                  <NFormItem :label="$t('page.ui.businessUsername')">
                    <NInput
                      v-model:value="editor.appUsername"
                      :maxlength="100"
                      :placeholder="$t('page.ui.businessUsernamePlaceholder')"
                    />
                  </NFormItem>
                </div>
              </NForm>

              <div class="binding-system-actions">
                <NPopconfirm
                  v-if="editor.bindingId"
                  :on-positive-click="() => handleDelete(editor)"
                >
                  <template #trigger>
                    <NButton
                      size="small"
                      type="error"
                      ghost
                      :disabled="operationPending"
                      :loading="deletingBindingId === editor.bindingId"
                    >
                      {{ $t('page.ui.unbind') }}
                    </NButton>
                  </template>
                  {{ $t('page.ui.confirmUnbind') }}
                </NPopconfirm>
                <NButton
                  size="small"
                  type="primary"
                  :disabled="!canSave(editor) || operationPending"
                  :loading="savingClientId === editor.clientId"
                  @click="handleSave(editor)"
                >
                  {{ editor.bindingId ? $t('page.ui.save') : $t('page.ui.bind') }}
                </NButton>
              </div>
            </section>
          </div>

          <NEmpty v-else :description="$t('page.ui.noOAuthApplications')" />
        </template>
      </NSpin>

      <template #footer>
        <NButton @click="handleClose">{{ $t('common.close') }}</NButton>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.binding-user-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid var(--n-divider-color);
  border-radius: 10px;
  background: var(--n-color-embedded);
}

.binding-user-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  background: rgba(24, 160, 88, 0.12);
  color: #16845b;
  font-size: 16px;
  font-weight: 700;
}

.binding-user-identity,
.binding-system-identity {
  min-width: 0;
}

.binding-user-name,
.binding-system-name {
  overflow: hidden;
  color: var(--n-text-color);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.binding-user-account,
.binding-system-client {
  margin-top: 3px;
  overflow: hidden;
  color: var(--n-text-color-3);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.binding-user-metrics {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 6px;
  color: var(--n-text-color-2);
  font-size: 12px;
}

.binding-system-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.binding-system-card {
  position: relative;
  overflow: hidden;
  padding: 14px 14px 12px 17px;
  border: 1px solid var(--n-divider-color);
  border-radius: 10px;
  background: var(--eims-surface);
  box-shadow: 0 2px 8px rgb(22 50 61 / 4%);
}

.binding-system-card.is-bound {
  border-color: rgb(43 141 125 / 32%);
}

.binding-system-card::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: var(--eims-line);
  content: '';
}

.binding-system-card.is-bound::before {
  background: #18a058;
}

.binding-system-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.binding-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.binding-field-grid :deep(.n-form-item) {
  min-width: 0;
  margin-bottom: 0;
}

.binding-system-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--n-divider-color);
}

@media (max-width: 640px) {
  .binding-user-summary {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .binding-user-metrics {
    align-items: flex-start;
    grid-column: 1 / -1;
  }

  .binding-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
