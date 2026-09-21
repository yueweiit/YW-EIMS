<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { useAuthStore } from '@/store/modules/auth';
import { consumeDingTalkRedirect } from '@/utils/dingtalk-login';
import { $t } from '@/locales';
import DingTalkLogin from './modules/dingtalk-login.vue';
import PwdLogin from './modules/pwd-login.vue';
import OAuthConsent from './modules/oauth-consent.vue';

const props = defineProps<{ module?: UnionKey.LoginModule }>();
const appStore = useAppStore();
const themeStore = useThemeStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const methods = [
  { key: 'dingtalk-login', label: 'page.login.shell.scanTab' },
  { key: 'pwd-login', label: 'page.login.shell.passwordTab' }
] as const;
type LoginMethod = (typeof methods)[number]['key'];

// Legacy template routes must not expose phone, registration or WeChat forms.
const activeMethod = computed<LoginMethod>(() => (props.module === 'pwd-login' ? 'pwd-login' : 'dingtalk-login'));
const isConsent = computed(() => props.module === 'oauth-consent');
const callbackFailed = ref(false);
const processingCallback = ref(Boolean(getTicket() || route.query.dingtalk_error));
const busy = computed(() => processingCallback.value || authStore.loginLoading);

function getTicket() {
  return typeof route.query.dingtalk_ticket === 'string'
    ? route.query.dingtalk_ticket
    : new URLSearchParams(window.location.hash.slice(1)).get('dingtalk_ticket') || '';
}

async function changeMethod(method: LoginMethod, focus = false) {
  if (busy.value) return;
  callbackFailed.value = false;
  await router.replace({ name: 'login', params: { module: method }, query: route.query });
  if (focus) {
    await nextTick();
    document.getElementById(`tab-${method}`)?.focus();
  }
}

function handleTabKey(event: KeyboardEvent) {
  let method: LoginMethod;
  if (event.key === 'Home') method = 'dingtalk-login';
  else if (event.key === 'End') method = 'pwd-login';
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    method = activeMethod.value === 'dingtalk-login' ? 'pwd-login' : 'dingtalk-login';
  } else return;
  event.preventDefault();
  void changeMethod(method, true);
}

onMounted(async () => {
  const ticket = getTicket();
  const error = route.query.dingtalk_error;
  if (!ticket && !error) return;

  try {
    const query = { ...route.query };
    delete query.dingtalk_ticket;
    delete query.dingtalk_error;
    const redirect = consumeDingTalkRedirect();
    if (!query.redirect && redirect) query.redirect = redirect;

    // Remove the one-time ticket BEFORE login navigates to the destination.
    // Replacing the route after login would send a successful login back here.
    await router.replace({ path: route.path, query, hash: '' });
    if (ticket) {
      await authStore.loginWithDingTalkTicket(ticket);
      callbackFailed.value = !authStore.isLogin;
    } else {
      callbackFailed.value = true;
    }
  } catch {
    callbackFailed.value = true;
  } finally {
    processingCallback.value = false;
  }
});
</script>

<template>
  <div class="login-shell" :class="{ 'is-consent': isConsent, 'is-dark': themeStore.darkMode }">
    <div class="login-tools">
      <ThemeSchemaSwitch
        :aria-label="$t('icon.themeSchema')"
        :theme-schema="themeStore.themeScheme"
        :show-tooltip="false"
        @switch="themeStore.toggleThemeScheme"
      />
      <LangSwitch
        v-if="themeStore.header.multilingual.visible"
        :aria-label="$t('icon.lang')"
        :lang="appStore.locale"
        :lang-options="appStore.localeOptions"
        :show-tooltip="false"
        @change-lang="appStore.changeLocale"
      />
    </div>

    <main class="login-stage">
      <section class="login-card" :aria-label="$t('system.title')">
        <div v-if="!isConsent" class="login-tabs" role="tablist" :aria-label="$t('page.login.shell.methods')">
          <button
            v-for="method in methods"
            :id="`tab-${method.key}`"
            :key="method.key"
            type="button"
            role="tab"
            :aria-selected="activeMethod === method.key"
            :aria-controls="`panel-${method.key}`"
            :tabindex="activeMethod === method.key ? 0 : -1"
            :disabled="busy"
            @click="changeMethod(method.key)"
            @keydown="handleTabKey"
          >
            {{ $t(method.label) }}
          </button>
        </div>

        <header class="login-brand">
          <SystemLogo aria-hidden="true" />
          <h1 v-if="!isConsent">
            {{
              $t(activeMethod === 'dingtalk-login' ? 'page.login.shell.scanTitle' : 'page.login.shell.passwordTitle')
            }}
          </h1>
          <p>{{ $t('system.title') }}</p>
        </header>

        <OAuthConsent v-if="isConsent" />
        <div
          v-else
          :id="`panel-${activeMethod}`"
          class="login-panel"
          role="tabpanel"
          :aria-labelledby="`tab-${activeMethod}`"
          :aria-busy="busy"
        >
          <NAlert v-if="callbackFailed" type="error" :show-icon="false" class="callback-error">
            {{ $t('page.ui.dingTalkLoginFailed') }}
          </NAlert>
          <div v-if="processingCallback" class="login-processing" role="status">
            <NSpin :size="28" />
            <p>{{ $t('page.login.shell.signingIn') }}</p>
          </div>
          <DingTalkLogin v-else-if="activeMethod === 'dingtalk-login'" />
          <PwdLogin v-else />
        </div>
      </section>
      <footer class="login-footer">
        YUEWEI
        <span aria-hidden="true">·</span>
        EIMS
      </footer>
    </main>
  </div>
</template>

<style scoped>
.login-shell {
  --login-ink: #202d40;
  --login-ink-soft: #717d90;
  --login-canvas: #f7f9fc;
  --login-card: #fff;
  --login-card-soft: #f3f5f8;
  --login-line: #e5e9f0;
  --login-accent: #126fe1;
  --login-button: #126fe1;
  --login-button-hover: #0964ca;
  --login-button-pressed: #0755b0;
  --login-deep: var(--login-accent);
  --login-teal: var(--login-accent);
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--login-ink);
  background: var(--login-canvas);
  font-family: 'Aptos', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.login-tools {
  position: absolute;
  top: 22px;
  right: 32px;
  z-index: 2;
  display: flex;
  gap: 8px;
  color: var(--login-ink-soft);
}

.login-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 76px 24px 28px;
}

.login-card {
  width: min(100%, 480px);
  padding: 28px 40px 26px;
  border: 1px solid var(--login-line);
  border-radius: 18px;
  background: var(--login-card);
  box-shadow:
    0 12px 40px rgb(35 56 84 / 5%),
    0 2px 6px rgb(35 56 84 / 3%);
}

.login-tabs {
  display: flex;
  width: fit-content;
  max-width: 100%;
  padding: 4px;
  margin: 0 auto 24px;
  border-radius: 24px;
  background: var(--login-card-soft);
}

.login-tabs button {
  min-width: 132px;
  min-height: 36px;
  padding: 6px 16px;
  border: 0;
  border-radius: 20px;
  color: var(--login-ink-soft);
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  cursor: pointer;
  transition:
    color 150ms,
    background 150ms,
    box-shadow 150ms;
}

.login-tabs button[aria-selected='true'] {
  color: var(--login-ink);
  background: var(--login-card);
  box-shadow: 0 1px 5px rgb(35 56 84 / 12%);
  font-weight: 600;
}

.login-tabs button:hover {
  color: var(--login-accent);
}
.login-tabs button:disabled {
  cursor: wait;
}
.login-tabs button:focus-visible {
  outline: 2px solid var(--login-accent);
  outline-offset: 3px;
}

.login-brand {
  text-align: center;
}
.login-brand :deep(.app-logo) {
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
}
.login-brand h1 {
  margin: 0;
  font-size: 23px;
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.45;
}
.login-brand p {
  margin: 8px 0 16px;
  color: var(--login-ink-soft);
  font-size: 13px;
  line-height: 1.6;
}
.login-panel {
  min-height: 320px;
}
.login-processing {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 16px;
  min-height: 320px;
}
.login-processing p {
  color: var(--login-ink-soft);
  font-size: 14px;
}
.callback-error {
  margin-bottom: 16px;
}
.login-footer {
  margin-top: 24px;
  color: var(--login-ink-soft);
  font-size: 11px;
  letter-spacing: 0.13em;
}
.login-footer span {
  margin: 0 8px;
}

.login-card :deep(.n-input) {
  --n-border: 1px solid var(--login-line) !important;
  --n-border-hover: 1px solid var(--login-accent) !important;
  --n-border-focus: 1px solid var(--login-accent) !important;
  --n-box-shadow-focus: 0 0 0 3px rgb(22 119 232 / 10%) !important;
  --n-color: var(--login-card) !important;
  --n-text-color: var(--login-ink) !important;
  --n-placeholder-color: var(--login-ink-soft) !important;
  --n-height: 50px !important;
  --n-border-radius: 10px !important;
  font-size: 14px;
}
.login-card :deep(.n-form-item-label) {
  color: var(--login-ink);
}
.login-card :deep(.n-button) {
  border-radius: 10px;
  font-weight: 600;
}
.login-card :deep(.n-button--primary-type) {
  --n-color: var(--login-button) !important;
  --n-color-hover: var(--login-button-hover) !important;
  --n-color-pressed: var(--login-button-pressed) !important;
  --n-border: 1px solid var(--login-button) !important;
  --n-border-hover: 1px solid var(--login-button-hover) !important;
  --n-border-pressed: 1px solid var(--login-button-pressed) !important;
  --n-text-color: #fff !important;
}
.login-card :deep(.n-spin) {
  --n-color: var(--login-accent) !important;
}
.is-consent .login-card {
  width: min(100%, 520px);
  padding-top: 32px;
}
.is-consent .login-brand {
  margin-bottom: 28px;
  border-bottom: 1px solid var(--login-line);
}

.login-shell.is-dark {
  --login-ink: #e8edf5;
  --login-ink-soft: #a0acc0;
  --login-canvas: #111823;
  --login-card: #1a2332;
  --login-card-soft: #111b2a;
  --login-line: #344156;
  --login-accent: #8dbfff;
}

.is-dark .login-brand :deep(.app-logo) {
  padding: 4px;
  border-radius: 10px;
  background: #fff;
}

@media (max-width: 540px) {
  .login-tools {
    top: 16px;
    right: 16px;
  }
  .login-stage {
    padding: 68px 12px 20px;
  }
  .login-card {
    padding: 24px 18px;
    border-radius: 14px;
  }
  .login-tabs {
    margin-bottom: 26px;
  }
  .login-tabs button {
    min-width: 0;
    flex: 1;
    padding-inline: 18px;
  }
  .login-brand h1 {
    font-size: 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .login-shell :deep(*) {
    transition: none !important;
    animation: none !important;
  }
}
</style>
