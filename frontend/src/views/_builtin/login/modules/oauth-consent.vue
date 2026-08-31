<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useRouter } from "vue-router";
import {
  fetchOAuth2AuthorizeConfirm,
  fetchOAuth2AuthorizeRequest,
} from "@/service/api";
import { useAuthStore } from "@/store/modules/auth";
import type { OAuth2AuthorizeRequest } from "@/service/api/oauth2-binding";

defineOptions({
  name: "OAuthConsent",
});

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const submitting = ref(false);
const consentRequest = ref<OAuth2AuthorizeRequest | null>(null);

const transactionId = computed(
  () => (route.query.transaction_id as string) || "",
);
const clientName = computed(
  () => consentRequest.value?.clientName || "第三方应用",
);

onMounted(async () => {
  if (!authStore.isLogin) {
    await router.replace({
      name: "login",
      params: { module: "pwd-login" },
      query: { redirect: route.fullPath },
    });
    return;
  }

  if (!transactionId.value) {
    window.$message?.error("OAuth 授权请求缺少事务标识");
    loading.value = false;
    return;
  }

  const { data, error } = await fetchOAuth2AuthorizeRequest(
    transactionId.value,
  );
  if (error || !data) {
    window.$message?.error("OAuth 授权请求无效、已使用或已过期");
    loading.value = false;
    return;
  }
  consentRequest.value = data;
  loading.value = false;
});

const requestedScopes = computed(() => {
  const scopeList = consentRequest.value?.scopes || [];
  const scopeLabels: Record<string, string> = {
    openid: "身份标识 (OpenID)",
    profile: "基本资料 (用户名、姓名)",
    email: "邮箱地址",
  };
  return scopeList.map((s) => ({
    key: s,
    label: scopeLabels[s] || s,
  }));
});

async function handleConsent(consent: "true" | "false") {
  if (!authStore.isLogin) {
    window.$message?.error("请先登录 EIMS，再返回 ERP 发起连接");
    return;
  }
  if (!transactionId.value || loading.value) return;

  submitting.value = true;
  try {
    const { data, error } = await fetchOAuth2AuthorizeConfirm({
      transaction_id: transactionId.value,
      consent,
    });
    if (!error && data?.redirectUrl) {
      window.location.assign(data.redirectUrl);
    }
  } finally {
    submitting.value = false;
  }
}

const handleAuthorize = () => handleConsent("true");
const handleDeny = () => handleConsent("false");
</script>

<template>
  <div class="oauth-consent">
    <div class="mb-16px text-center">
      <NIcon size="48" class="mb-8px text-primary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
          />
        </svg>
      </NIcon>
      <h3 class="text-18px font-medium">授权登录</h3>
    </div>

    <NAlert v-if="!loading" type="info" class="mb-16px">
      <strong>{{ clientName }}</strong> 请求使用您的 EIMS 账号登录
    </NAlert>

    <div v-if="!loading" class="mb-24px">
      <p class="mb-8px text-14px text-gray-500">该应用将获得以下权限：</p>
      <NList bordered size="small">
        <NListItem v-for="item in requestedScopes" :key="item.key">
          <NIcon class="mr-8px text-green-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
              />
            </svg>
          </NIcon>
          {{ item.label }}
        </NListItem>
      </NList>
    </div>

    <NSpin v-if="loading" class="mb-24px" />

    <NSpace v-else vertical :size="16">
      <NButton
        type="primary"
        size="large"
        round
        block
        :loading="submitting"
        @click="handleAuthorize"
      >
        授权登录
      </NButton>
      <NButton
        size="large"
        round
        block
        :loading="submitting"
        @click="handleDeny"
      >
        拒绝
      </NButton>
    </NSpace>

    <p class="mt-16px text-center text-12px text-gray-400">
      授权后，该应用将能够访问您上述权限范围内的信息
    </p>
  </div>
</template>

<style scoped>
.oauth-consent {
  padding: 8px 0;
}
</style>
