<script setup lang="ts">
import { getDingTalkAuthorizationUrl } from '@/service/api';
import { useRouterPush } from '@/hooks/common/router';
import { $t } from '@/locales';

defineOptions({
  name: 'DingTalkLogin',
});

const { toggleLoginModule } = useRouterPush();

function handleDingTalkLogin() {
  window.location.assign(getDingTalkAuthorizationUrl());
}
</script>

<template>
  <NSpace vertical :size="18" class="w-full">
    <NButton type="primary" size="large" round block @click="handleDingTalkLogin">
      <template #icon>
        <SvgIcon icon="mdi:message-text-outline" />
      </template>
      {{ $t('page.ui.dingTalkLogin') }}
    </NButton>
    <NButton size="large" round block @click="toggleLoginModule('pwd-login')">
      {{ $t('page.login.pwdLogin.title') }}
    </NButton>
  </NSpace>
</template>

<style scoped></style>
