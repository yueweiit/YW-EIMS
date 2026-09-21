<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { fetchDingTalkQrConfig, getDingTalkAuthorizationUrl } from '@/service/api';
import {
  DINGTALK_LOGIN_ORIGIN,
  parseDingTalkQrUrl,
  rememberDingTalkRedirect,
  resolveDingTalkCallback
} from '@/utils/dingtalk-login';
import { $t } from '@/locales';

defineOptions({
  name: 'DingTalkLogin'
});

const route = useRoute();
const frame = ref<HTMLIFrameElement | null>(null);
const frameUrl = ref('');
const status = ref<'loading' | 'ready' | 'failed' | 'expired' | 'redirecting'>('loading');
const requestId = ref(0);
let controller: AbortController | undefined;
let loadTimer: ReturnType<typeof setTimeout> | undefined;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
const needsRetry = computed(() => status.value === 'failed' || status.value === 'expired');

function clearTimers() {
  clearTimeout(loadTimer);
  clearTimeout(expiryTimer);
}

function fail() {
  clearTimers();
  frameUrl.value = '';
  status.value = 'failed';
}

async function loadQrCode() {
  controller?.abort();
  clearTimers();
  const currentRequest = ++requestId.value;
  controller = new AbortController();
  frameUrl.value = '';
  status.value = 'loading';
  loadTimer = setTimeout(fail, 20000);

  try {
    const { data, error } = await fetchDingTalkQrConfig(controller.signal);
    if (currentRequest !== requestId.value) return;
    if (error || !data) {
      fail();
      return;
    }
    frameUrl.value = parseDingTalkQrUrl(data.authorizationUrl).toString();
    const expiresIn = Math.min(data.expiresIn, 600);
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      fail();
      return;
    }
    expiryTimer = setTimeout(() => {
      clearTimeout(loadTimer);
      frameUrl.value = '';
      status.value = 'expired';
    }, expiresIn * 1000);
  } catch {
    if (currentRequest === requestId.value) fail();
  }
}

function handleFrameLoad() {
  if (status.value !== 'loading' || !frameUrl.value) return;
  clearTimeout(loadTimer);
  status.value = 'ready';
}

function handleMessage(event: MessageEvent<unknown>) {
  // Match both the exact origin and this iframe, not another window or an old QR.
  if (
    event.origin !== DINGTALK_LOGIN_ORIGIN ||
    !frame.value ||
    event.source !== frame.value.contentWindow ||
    !frameUrl.value ||
    (status.value !== 'ready' && status.value !== 'loading')
  )
    return;
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  const callback = resolveDingTalkCallback(data, frameUrl.value);
  if (callback) {
    clearTimers();
    status.value = 'redirecting';
    rememberDingTalkRedirect(route.query.redirect);
    window.location.assign(callback);
  } else if ('success' in data || 'errorMsg' in data) {
    fail();
  }
}

function handleDingTalkLogin() {
  rememberDingTalkRedirect(route.query.redirect);
  window.location.assign(getDingTalkAuthorizationUrl());
}

onMounted(() => {
  window.addEventListener('message', handleMessage);
  void loadQrCode();
});

onBeforeUnmount(() => {
  requestId.value += 1;
  controller?.abort();
  clearTimers();
  window.removeEventListener('message', handleMessage);
});
</script>

<template>
  <div class="dingtalk-login">
    <div class="qr-frame" :aria-busy="status === 'loading' || status === 'redirecting'">
      <iframe
        v-if="frameUrl"
        :key="requestId"
        ref="frame"
        :src="frameUrl"
        :title="$t('page.login.shell.scanTitle')"
        width="300"
        height="300"
        referrerpolicy="no-referrer"
        @load="handleFrameLoad"
        @error="fail"
      />
      <div v-if="status !== 'ready'" class="qr-state" role="status" aria-live="polite">
        <template v-if="needsRetry">
          <SvgIcon icon="mdi:qrcode-scan" class="qr-state-icon" aria-hidden="true" />
          <strong>{{ $t(status === 'expired' ? 'page.login.shell.qrExpired' : 'page.login.shell.qrFailed') }}</strong>
          <p>{{ $t(status === 'expired' ? 'page.login.shell.qrExpiredHint' : 'page.login.shell.qrFailedHint') }}</p>
          <NButton type="primary" @click="loadQrCode">{{ $t('page.login.shell.refreshQr') }}</NButton>
        </template>
        <template v-else>
          <NSpin :size="28" />
          <p>{{ $t(status === 'redirecting' ? 'page.login.shell.signingIn' : 'page.login.shell.qrLoading') }}</p>
        </template>
      </div>
    </div>
    <p class="scan-hint">{{ $t('page.login.shell.scanHint') }}</p>
    <button type="button" class="fallback-link" :disabled="status === 'redirecting'" @click="handleDingTalkLogin">
      {{ $t('page.login.shell.openDingTalk') }}
      <SvgIcon icon="mdi:arrow-top-right" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.dingtalk-login {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.qr-frame {
  position: relative;
  width: min(300px, 100%);
  /* The hosted QR page is taller than 260px; leave room for its full content. */
  height: 300px;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
}
.qr-frame iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  color-scheme: light;
}
.qr-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  background: var(--login-card);
  text-align: center;
}
.qr-state-icon {
  color: var(--login-ink-soft);
  width: 42px;
  height: 42px;
  font-size: 42px;
}
.qr-state strong {
  font-size: 15px;
}
.qr-state p {
  color: var(--login-ink-soft);
  font-size: 13px;
  line-height: 1.7;
}
.scan-hint {
  margin-top: 12px;
  color: var(--login-ink-soft);
  font-size: 13px;
  text-align: center;
}
.fallback-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  padding: 3px 6px;
  border: 0;
  color: var(--login-accent);
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}
.fallback-link:hover {
  text-decoration: underline;
}
.fallback-link:focus-visible {
  outline: 2px solid var(--login-accent);
  outline-offset: 3px;
  border-radius: 4px;
}
.fallback-link:disabled {
  cursor: wait;
}
</style>
