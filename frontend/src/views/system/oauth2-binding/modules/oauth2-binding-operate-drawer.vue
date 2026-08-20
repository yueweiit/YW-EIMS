<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLoading } from '@sa/hooks';
import { fetchCreateOAuth2Binding, fetchOAuth2ClientPage, fetchUserPage } from '@/service/api';
import type { CreateOAuth2BindingParams } from '@/service/api/oauth2-binding';

defineOptions({
  name: 'OAuth2BindingOperateDrawer'
});

interface Props {
  visible: boolean;
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
  appUserId: 0,
  appUsername: ''
});

const userOptions = ref<{ label: string; value: number }[]>([]);
const clientOptions = ref<{ label: string; value: string }[]>([]);

const drawerTitle = computed(() => '新增账号绑定');

watch(
  () => props.visible,
  val => {
    if (val) {
      form.value = { ssoUserId: 0, clientId: '', appUserId: 0, appUsername: '' };
      loadOptions();
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
    window.$message?.error('请选择 SSO 用户');
    return;
  }
  if (!form.value.clientId) {
    window.$message?.error('请选择应用');
    return;
  }
  if (!form.value.appUserId || form.value.appUserId <= 0) {
    window.$message?.error('请输入业务系统用户ID');
    return;
  }

  startLoading();
  try {
    const { error } = await fetchCreateOAuth2Binding(form.value);
    if (!error) {
      window.$message?.success('绑定成功');
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
      <NForm label-placement="left" label-width="120">
        <NFormItem label="SSO 用户" required>
          <NSelect
            v-model:value="form.ssoUserId"
            :options="userOptions"
            placeholder="选择 EIMS 用户"
            filterable
          />
        </NFormItem>

        <NFormItem label="OAuth2 应用" required>
          <NSelect
            v-model:value="form.clientId"
            :options="clientOptions"
            placeholder="选择目标应用"
            filterable
          />
        </NFormItem>

        <NFormItem label="业务系统用户ID" required>
          <NInputNumber
            v-model:value="form.appUserId"
            :min="1"
            placeholder="业务系统中的用户ID"
            class="w-full"
          />
        </NFormItem>

        <NFormItem label="业务系统用户名">
          <NInput
            v-model:value="form.appUsername"
            placeholder="业务系统中的用户名（可选，方便展示）"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace>
          <NButton @click="handleClose">取消</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            绑定
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
