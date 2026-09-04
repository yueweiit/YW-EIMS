<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loginModuleRecord } from '@/constants/app';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { $t } from '@/locales';
import { useAuthStore } from '@/store/modules/auth';
import PwdLogin from './modules/pwd-login.vue';
import CodeLogin from './modules/code-login.vue';
import Register from './modules/register.vue';
import ResetPwd from './modules/reset-pwd.vue';
import BindWechat from './modules/bind-wechat.vue';
import OAuthConsent from './modules/oauth-consent.vue';

interface Props {
  /** The login module */
  module?: UnionKey.LoginModule;
}

const props = defineProps<Props>();

const appStore = useAppStore();
const themeStore = useThemeStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

interface LoginModule {
  label: App.I18n.I18nKey;
  component: Component;
}

const moduleMap: Record<UnionKey.LoginModule, LoginModule> = {
  'pwd-login': { label: loginModuleRecord['pwd-login'], component: PwdLogin },
  'code-login': {
    label: loginModuleRecord['code-login'],
    component: CodeLogin
  },
  register: { label: loginModuleRecord.register, component: Register },
  'reset-pwd': { label: loginModuleRecord['reset-pwd'], component: ResetPwd },
  'bind-wechat': {
    label: loginModuleRecord['bind-wechat'],
    component: BindWechat
  },
  'oauth-consent': {
    label: loginModuleRecord['oauth-consent'],
    component: OAuthConsent
  }
};

const activeModule = computed(() => moduleMap[props.module || 'pwd-login']);
const isConsent = computed(() => props.module === 'oauth-consent');

function getQueryString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getHashValue(key: string) {
  return new URLSearchParams(window.location.hash.replace(/^#/, '')).get(key) || '';
}

onMounted(async () => {
  const ticket = getQueryString(route.query.dingtalk_ticket) || getHashValue('dingtalk_ticket');
  const error = getQueryString(route.query.dingtalk_error);

  if (ticket) {
    await authStore.loginWithDingTalkTicket(ticket);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    const query = { ...route.query };
    delete query.dingtalk_ticket;
    await router.replace({ name: 'login', query });
  } else if (error) {
    window.$message?.error($t('page.ui.dingTalkLoginFailed'));
    const query = { ...route.query };
    delete query.dingtalk_error;
    await router.replace({ name: 'login', query });
  }
});
</script>

<template>
  <div class="login-shell" :class="{ 'is-consent': isConsent }">
    <main class="login-stage">
      <div class="login-stage-tools">
        <div class="stage-tools-actions">
          <ThemeSchemaSwitch
            :theme-schema="themeStore.themeScheme"
            :show-tooltip="false"
            class="stage-tool"
            @switch="themeStore.toggleThemeScheme"
          />
          <LangSwitch
            v-if="themeStore.header.multilingual.visible"
            :lang="appStore.locale"
            :lang-options="appStore.localeOptions"
            :show-tooltip="false"
            class="stage-tool"
            @change-lang="appStore.changeLocale"
          />
        </div>
      </div>

      <section class="login-card" :aria-label="$t('system.title')">
        <div class="login-card-brand">
          <div class="login-card-brand-logo" aria-hidden="true">
            <SystemLogo />
          </div>
          <strong class="login-card-brand-name">{{ $t('system.title') }}</strong>
        </div>
        <div v-if="!isConsent" class="login-card-heading">
          <h1>{{ $t(activeModule.label) }}</h1>
        </div>
        <Transition :name="themeStore.page.animateMode" mode="out-in" appear>
          <component :is="activeModule.component" />
        </Transition>
      </section>
    </main>
  </div>
</template>

<style scoped>
.login-shell {
  --login-ink: #16323d;
  --login-ink-soft: #6d8385;
  --login-canvas: #f1f4ef;
  --login-card: #fffdf9;
  --login-card-soft: #f3f6f1;
  --login-line: #dce7df;
  --login-deep: #143843;
  --login-teal: #2b8d7d;
  position: relative;
  display: flex;
  min-height: 100vh;
  overflow: auto;
  color: var(--login-ink);
  background: var(--login-canvas);
  font-family: 'Aptos', 'Bahnschrift', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.login-stage {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 90px clamp(24px, 5vw, 72px) 42px;
  background: radial-gradient(circle at 50% 12%, rgb(185 220 130 / 16%), transparent 34%), var(--login-canvas);
}

.login-stage-tools {
  position: absolute;
  top: 24px;
  right: clamp(24px, 5vw, 72px);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 1;
}

.stage-tools-actions {
  display: flex;
  align-items: center;
  gap: 3px;
}

.stage-tool {
  color: var(--login-ink-soft);
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(100%, 420px);
  padding: 32px;
  border: 1px solid var(--login-line);
  border-top: 3px solid var(--login-teal);
  border-radius: 14px;
  background: var(--login-card);
  box-shadow: 0 14px 34px rgb(22 50 61 / 8%);
}

.login-card-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding-bottom: 22px;
  margin-bottom: 26px;
  border-bottom: 1px solid var(--login-line);
}

.login-card-brand-logo {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
}

.login-card-brand-logo :deep(.app-logo) {
  width: 52px;
  height: 52px;
}

.login-card-brand-logo :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.login-card-brand-name {
  min-width: 0;
  display: block;
  overflow: hidden;
  color: var(--login-ink);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login-card-heading {
  margin-bottom: 24px;
}

.login-card-heading h1 {
  margin: 0;
  color: var(--login-ink);
  font-family: 'Aptos Display', 'Bahnschrift', 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 1.1;
}

.login-card :deep(.n-form-item) {
  margin-bottom: 16px;
}

.login-card :deep(.n-input) {
  --n-border: 1px solid var(--login-line) !important;
  --n-border-hover: 1px solid var(--login-teal) !important;
  --n-border-focus: 1px solid var(--login-teal) !important;
  --n-box-shadow-focus: 0 0 0 3px rgb(43 141 125 / 12%) !important;
  --n-color: var(--login-card) !important;
  --n-text-color: var(--login-ink) !important;
  --n-placeholder-color: #8ca0a1 !important;
  min-height: 50px;
  border-radius: 11px;
}

.login-card :deep(.n-input__input-el) {
  font-size: 14px;
}

.login-card :deep(.n-button) {
  min-height: 48px;
  border-radius: 11px !important;
  font-size: 13px;
  font-weight: 600;
}

.login-card :deep(.n-button--primary-type) {
  --n-color: var(--login-deep) !important;
  --n-color-hover: #23565a !important;
  --n-color-pressed: #0f2f38 !important;
  --n-border: 1px solid var(--login-deep) !important;
  --n-border-hover: 1px solid #23565a !important;
  --n-border-pressed: 1px solid #0f2f38 !important;
  --n-text-color: #f2f8ea !important;
}

.login-card :deep(.n-button:not(.n-button--primary-type)) {
  --n-color: transparent !important;
  --n-color-hover: var(--login-card-soft, #f3f6f1) !important;
  --n-color-pressed: var(--login-card-soft, #f3f6f1) !important;
  --n-border: 1px solid var(--login-line) !important;
  --n-border-hover: 1px solid var(--login-teal) !important;
  --n-border-pressed: 1px solid var(--login-teal) !important;
  --n-text-color: var(--login-ink) !important;
}

.is-consent .login-card {
  width: min(100%, 520px);
}

:global(html.dark) .login-shell {
  --login-ink: #edf5ed;
  --login-ink-soft: #9fb4b4;
  --login-canvas: #0d1b24;
  --login-card: #142831;
  --login-card-soft: #1b343a;
  --login-line: #29434a;
  --login-deep: #1d4c4d;
  --login-teal: #76c2a7;
}

:global(html.dark) .login-card {
  box-shadow: 0 14px 34px rgb(0 0 0 / 22%);
}

:global(html.dark) .login-card :deep(.n-input) {
  --n-color: #1a333a !important;
  --n-text-color: var(--login-ink) !important;
}

@media (max-width: 900px) {
  .login-shell {
    display: block;
    min-height: 100%;
  }

  .login-stage {
    min-height: 100vh;
    padding: 88px 32px 32px;
  }

  .login-stage-tools {
    top: 22px;
    right: 32px;
  }
}

@media (max-width: 560px) {
  .login-stage {
    min-height: 100vh;
    padding: 78px 16px 28px;
  }

  .login-stage-tools {
    right: 16px;
  }

  .login-card {
    padding: 26px 20px;
  }

  .login-card-heading h1 {
    font-size: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-shell :deep(*) {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
