<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLoading } from '@sa/hooks';
import {
  fetchCreateOAuth2Binding,
  fetchOAuth2ClientPage,
  fetchUpdateOAuth2Binding,
  fetchUserPage
} from '@/service/api';
import type { CreateOAuth2BindingParams, OAuth2BindingRecord } from '@/service/api/oauth2-binding';
import { $t } from '@/locales';

defineOptions({
  name: 'OAuth2BindingOperateDrawer'
});

interface Props {
  visible: boolean;
  rowData?: OAuth2BindingRecord | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'submitted'): void;
}>();

const { loading, startLoading, endLoading } = useLoading(false);

const form = ref<CreateOAuth2BindingParams>({
  ssoUserId: 0,
  clientId: '',
  appUserId: '',
  appUsername: ''
});

const userOptions = ref<{ label: string; value: number }[]>([]);
const clientOptions = ref<{ label: string; value: string }[]>([]);

const drawerTitle = computed(() => (props.rowData ? $t('page.ui.editBinding') : $t('page.ui.newBindingTitle')));

watch(
  () => props.visible,
  val => {
    if (val) {
      if (props.rowData) {
        form.value = {
          ssoUserId: props.rowData.ssoUserId,
          clientId: props.rowData.clientId,
          appUserId: props.rowData.appUserId,
          appUsername: props.rowData.appUsername || ''
        };
      } else {
        form.value = {
          ssoUserId: 0,
          clientId: '',
          appUserId: '',
          appUsername: ''
        };
      }
      void loadOptions();
    }
  }
);

async function loadOptions() {
  // Load users
  const { data: userData } = await fetchUserPage({ current: 1, size: 100 });
  if (userData?.records) {
    userOptions.value = userData.records.map(u => ({
      label: `${u.realName || u.userName} (${u.userName})`,
      value: u.id
    }));
  }

  // Load OAuth2 clients
  const { data: clientData } = await fetchOAuth2ClientPage({ current: 1, size: 100 });
  if (clientData?.records) {
    clientOptions.value = clientData.records.map(c => ({
      label: `${c.name} (${c.clientId})`,
      value: c.clientId
    }));
  }
}

function handleClose() {
  emit('update:visible', false);
}

async function handleSubmit() {
  if (!form.value.ssoUserId) {
    window.$message?.error($t('page.ui.selectSsoUser'));
    return;
  }
  if (!form.value.clientId) {
    window.$message?.error($t('page.ui.selectApp'));
    return;
  }
  const appUserId = form.value.appUserId.trim();
  if (!appUserId) {
    window.$message?.error($t('page.ui.enterBusinessUserId'));
    return;
  }

  startLoading();
  try {
    const result = props.rowData
      ? await fetchUpdateOAuth2Binding(props.rowData.id, {
          appUserId,
          appUsername: form.value.appUsername
        })
      : await fetchCreateOAuth2Binding({ ...form.value, appUserId });
    const { error } = result;
    if (!error) {
      window.$message?.success(props.rowData ? $t('page.ui.saveSuccess') : $t('page.ui.bindingSuccess'));
      handleClose();
      emit('submitted');
    }
  } finally {
    endLoading();
  }
}
</script>

<template>
  <NDrawer :show="visible" :width="500" @update:show="handleClose">
    <NDrawerContent :title="drawerTitle" closable>
      <NAlert type="info" :bordered="false" class="mb-16px">
        {{ $t('page.ui.erpBindingNotice') }}
      </NAlert>
      <NForm label-placement="left" label-width="120">
        <NFormItem :label="$t('page.ui.ssoUser')" required>
          <NSelect
            v-model:value="form.ssoUserId"
            :options="userOptions"
            :placeholder="$t('page.ui.selectEimsUser')"
            filterable
            :disabled="Boolean(props.rowData)"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.oauthClient')" required>
          <NSelect
            v-model:value="form.clientId"
            :options="clientOptions"
            :placeholder="$t('page.ui.selectTargetApp')"
            filterable
            :disabled="Boolean(props.rowData)"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.businessUserId')" required>
          <NInput
            v-model:value="form.appUserId"
            :maxlength="255"
            show-count
            :placeholder="$t('page.ui.businessUserIdPlaceholder')"
            class="w-full"
          />
        </NFormItem>

        <NFormItem :label="$t('page.ui.businessUsername')">
          <NInput
            v-model:value="form.appUsername"
            :placeholder="$t('page.ui.businessUsernamePlaceholder')"
          />
        </NFormItem>

      </NForm>

      <template #footer>
        <NSpace>
          <NButton @click="handleClose">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            {{ props.rowData ? $t('page.ui.save') : $t('page.ui.bind') }}
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
