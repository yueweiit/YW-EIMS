<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({ name: 'PwdLogin' });
const authStore = useAuthStore();
const { formRef, validate } = useNaiveForm();
const submitting = ref(false);
const model = reactive({ userName: '', password: '' });

// Login accepts existing accounts; account-creation complexity rules must not
// reject valid passwords or long usernames provisioned from DingTalk.
const rules = computed(() => ({
  userName: [{ required: true, whitespace: true, message: $t('form.userName.required'), trigger: 'blur' }],
  password: [{ required: true, message: $t('form.pwd.required'), trigger: 'blur' }]
}));

async function handleSubmit() {
  if (submitting.value || authStore.loginLoading) return;
  submitting.value = true;
  try {
    try {
      await validate();
    } catch {
      return;
    }
    await authStore.login(model.userName.trim(), model.password);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <NForm ref="formRef" :model="model" :rules="rules" size="large" class="password-form" @submit.prevent="handleSubmit">
    <NFormItem path="userName" :label="$t('page.login.shell.userName')">
      <NInput
        v-model:value="model.userName"
        :placeholder="$t('page.login.common.userNamePlaceholder')"
        :input-props="{
          name: 'username',
          autocomplete: 'username',
          autocapitalize: 'none',
          spellcheck: false,
          'aria-label': $t('page.login.shell.userName')
        }"
        :disabled="submitting"
      />
    </NFormItem>
    <NFormItem path="password" :label="$t('page.login.shell.password')">
      <NInput
        v-model:value="model.password"
        type="password"
        show-password-on="click"
        :placeholder="$t('page.login.common.passwordPlaceholder')"
        :input-props="{
          name: 'password',
          autocomplete: 'current-password',
          'aria-label': $t('page.login.shell.password')
        }"
        :disabled="submitting"
      />
    </NFormItem>
    <NButton
      type="primary"
      attr-type="submit"
      size="large"
      block
      :loading="submitting || authStore.loginLoading"
      class="login-submit"
    >
      {{ $t('page.login.shell.signIn') }}
    </NButton>
  </NForm>
</template>

<style scoped>
.password-form {
  padding-top: 10px;
}
.password-form :deep(.n-form-item) {
  margin-bottom: 8px;
}
.login-submit {
  height: 50px;
  margin-top: 8px;
  font-size: 15px;
}
</style>
