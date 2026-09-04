<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchOAuth2AuthorizeConfirm, fetchOAuth2AuthorizeRequest } from '@/service/api';
import type { OAuth2AuthorizeRequest } from '@/service/api/oauth2-binding';
import { $t } from '@/locales';
import { useAuthStore } from '@/store/modules/auth';

defineOptions({
  name: 'OAuthConsent'
});

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const submitting = ref(false);
const consentRequest = ref<OAuth2AuthorizeRequest | null>(null);

const transactionId = computed(() => (route.query.transaction_id as string) || '');
const clientName = computed(() => consentRequest.value?.clientName || $t('page.ui.thirdPartyApp'));

onMounted(async () => {
  if (!authStore.isLogin) {
    await router.replace({
      name: 'login',
      params: { module: 'pwd-login' },
      query: { redirect: route.fullPath }
    });
    return;
  }

  if (!transactionId.value) {
    window.$message?.error($t('page.ui.oauthMissingTransaction'));
    loading.value = false;
    return;
  }

  const { data, error } = await fetchOAuth2AuthorizeRequest(transactionId.value);
  if (error || !data) {
    window.$message?.error($t('page.ui.oauthInvalidRequest'));
    loading.value = false;
    return;
  }
  consentRequest.value = data;
  loading.value = false;
});

const requestedScopes = computed(() => {
  const scopeList = consentRequest.value?.scopes || [];
  const scopeLabels: Record<string, string> = {
    openid: $t('page.ui.oauthScopeOpenid'),
    profile: $t('page.ui.oauthScopeProfile'),
    email: $t('page.ui.oauthScopeEmail')
  };
  return scopeList.map(s => ({
    key: s,
    label: scopeLabels[s] || s
  }));
});

async function handleConsent(consent: 'true' | 'false') {
  if (!authStore.isLogin) {
    window.$message?.error($t('page.ui.oauthLoginRequired'));
    return;
  }
  if (!transactionId.value || loading.value) return;

  submitting.value = true;
  try {
    const { data, error } = await fetchOAuth2AuthorizeConfirm({
      transaction_id: transactionId.value,
      consent
    });
    if (!error && data?.redirectUrl) {
      window.location.assign(data.redirectUrl);
    }
  } finally {
    submitting.value = false;
  }
}

const handleAuthorize = () => handleConsent('true');
const handleDeny = () => handleConsent('false');
</script>

<template>
  <div class="oauth-consent">
    <div class="consent-heading">
      <div class="consent-icon" aria-hidden="true">
        <SvgIcon icon="mdi:shield-key-outline" />
      </div>
      <div>
        <span class="consent-kicker">{{ $t('page.login.shell.authorization') }}</span>
        <h2>{{ $t('page.ui.oauthAuthorize') }}</h2>
      </div>
    </div>

    <div v-if="!loading" class="consent-request">
      <div class="consent-client">
        <span class="consent-client-label">{{ $t('page.ui.thirdPartyApp') }}</span>
        <strong>{{ clientName }}</strong>
        <span>{{ $t('page.ui.oauthRequestLogin') }}</span>
      </div>

      <div class="consent-permissions">
        <div class="consent-permission-heading">{{ $t('page.ui.oauthPermissionList') }}</div>
        <ul class="consent-permission-list">
          <li v-for="item in requestedScopes" :key="item.key">
            <span class="permission-icon" aria-hidden="true">
              <SvgIcon icon="mdi:check" />
            </span>
            <span>{{ item.label }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="loading" class="consent-loading">
      <NSpin size="small" />
      <span>{{ $t('page.ui.oauthLoading') }}</span>
    </div>

    <div v-else class="consent-actions">
      <NButton type="primary" size="large" block :loading="submitting" @click="handleAuthorize">
        <template #icon>
          <SvgIcon icon="mdi:shield-check-outline" />
        </template>
        {{ $t('page.ui.oauthAuthorize') }}
      </NButton>
      <NButton size="large" block :loading="submitting" @click="handleDeny">
        {{ $t('page.ui.oauthDeny') }}
      </NButton>
    </div>

    <p class="consent-footnote">{{ $t('page.ui.oauthAfterAuthorize') }}</p>
  </div>
</template>

<style scoped>
.oauth-consent {
  color: var(--login-ink, #16323d);
}

.consent-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.consent-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border: 1px solid rgb(43 141 125 / 26%);
  border-radius: 11px;
  color: var(--login-teal, #2b8d7d);
  background: rgb(43 141 125 / 10%);
  font-size: 21px;
}

.consent-kicker {
  display: block;
  margin-bottom: 4px;
  color: var(--login-teal, #2b8d7d);
  font-size: 12px;
  font-weight: 700;
}

.consent-heading h2 {
  margin: 0;
  color: var(--login-ink, #16323d);
  font-family: 'Aptos Display', 'Bahnschrift', 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 1.1;
}

.consent-request {
  display: grid;
  gap: 22px;
}

.consent-client,
.consent-permissions {
  border: 0;
  border-radius: 0;
  background: transparent;
}

.consent-client {
  display: grid;
  gap: 6px;
  padding: 0 0 18px;
  border-bottom: 1px solid var(--login-line, #dce7df);
}

.consent-client-label,
.consent-permission-heading {
  color: var(--login-ink-soft, #6d8385);
  font-size: 11px;
}

.consent-client strong {
  color: var(--login-ink, #16323d);
  font-size: 16px;
  font-weight: 700;
}

.consent-client > span:last-child {
  color: var(--login-ink-soft, #6d8385);
  font-size: 12px;
  line-height: 1.5;
}

.consent-permissions {
  padding: 0;
}

.consent-permission-heading {
  margin-bottom: 8px;
}

.consent-permission-list {
  padding: 0;
  margin: 0;
  border-top: 1px solid var(--login-line, #dce7df);
  list-style: none;
}

.consent-permission-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  border-bottom: 1px solid var(--login-line, #dce7df);
  color: var(--login-ink, #16323d);
  font-size: 13px;
}

.consent-permission-list li:last-child {
  border-bottom: 0;
}

.permission-icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: var(--login-teal, #2b8d7d);
  background: rgb(43 141 125 / 12%);
  font-size: 13px;
}

.consent-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 142px;
  color: var(--login-ink-soft, #6d8385);
  font-size: 12px;
}

.consent-actions {
  display: grid;
  gap: 11px;
  margin-top: 24px;
}

.consent-actions :deep(.n-button) {
  min-height: 48px;
  border-radius: 11px !important;
  font-weight: 600;
}

.consent-footnote {
  margin: 17px 0 0;
  color: var(--login-ink-soft, #6d8385);
  font-size: 11px;
  line-height: 1.6;
  text-align: center;
}

@media (max-width: 560px) {
  .consent-heading h2 {
    font-size: 25px;
  }
}
</style>
