<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';
import {
  fetchPortalSystemLaunch,
  fetchPortalSystems,
  type PortalBindingStatus,
  type PortalSystemRecord
} from '@/service/api';

defineOptions({
  name: 'ExternalNav'
});

const appStore = useAppStore();
const systems = ref<PortalSystemRecord[]>([]);
const loading = ref(false);
const launchingCode = ref('');

const gap = computed(() => (appStore.isMobile ? 12 : 16));

const bindingStatusText = computed<Record<PortalBindingStatus, string>>(() => ({
  bound: $t('page.ui.bound'),
  unbound: $t('page.ui.unbound'),
  not_required: $t('page.ui.notRequired'),
  not_configured: $t('page.ui.notConfigured')
}));

function bindingTagType(status: PortalBindingStatus) {
  const types: Record<PortalBindingStatus, 'default' | 'success' | 'warning' | 'error'> = {
    bound: 'success',
    unbound: 'warning',
    not_required: 'default',
    not_configured: 'error'
  };
  return types[status];
}

async function loadSystems() {
  loading.value = true;
  try {
    const { data, error } = await fetchPortalSystems();
    if (!error && data) systems.value = data;
  } finally {
    loading.value = false;
  }
}

function showUnavailableMessage(system: PortalSystemRecord) {
  if (system.bindingStatus === 'unbound') {
    window.$message?.warning($t('page.ui.userNotBound'));
    return;
  }
  if (system.bindingStatus === 'not_configured') {
    window.$message?.warning($t('page.ui.systemNotConfigured'));
    return;
  }
  window.$message?.warning($t('page.ui.systemCannotLaunch'));
}

async function openSystem(system: PortalSystemRecord) {
  if (!system.canLaunch) {
    showUnavailableMessage(system);
    return;
  }

  launchingCode.value = system.code;
  // Create the tab synchronously while the browser still considers this a
  // user gesture. Do not pass `noopener` here: Chrome can return a null
  // window handle for that feature, leaving the placeholder at about:blank
  // after the asynchronous authorization check. The destination is still
  // validated by the EIMS backend before navigation.
  const popup = window.open('', '_blank');
  try {
    const { data, error } = await fetchPortalSystemLaunch(system.code);
    if (error || !data?.url) {
      popup?.close();
      window.$message?.error($t('page.ui.systemEntryUnavailable'));
      return;
    }
    if (popup) {
      popup.location.replace(data.url);
      popup.opener = null;
    } else {
      // If the browser blocks new windows, do not leave the user on a blank
      // tab; navigate the current tab as a deterministic fallback.
      window.location.assign(data.url);
    }
  } catch {
    popup?.close();
    window.$message?.error($t('page.ui.systemEntryRetry'));
  } finally {
    launchingCode.value = '';
  }
}

function openInfo(url: string | null | undefined) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function showFeedback(system: PortalSystemRecord) {
  if (system.feedbackUrl) {
    openInfo(system.feedbackUrl);
    return;
  }
  window.$message?.info(system.contact || $t('page.ui.feedbackAdmin'));
}

onMounted(loadSystems);
</script>

<template>
  <div>
    <div class="section-heading">
      <div class="section-heading-icon external-heading-icon">
        <SvgIcon icon="mdi:lan-connect" class="text-20px" />
      </div>
      <div>
        <h4 class="section-title">{{ $t('page.home.externalSystemsTitle') }}</h4>
        <p class="section-caption">{{ $t('page.home.externalSystemsDesc') }}</p>
      </div>
    </div>

    <NSpin :show="loading">
      <NEmpty v-if="!loading && !systems.length" :description="$t('page.ui.noAccessibleSystems')" />
      <NGrid v-else :cols="'1 s:2 m:3 l:5'" :x-gap="gap" :y-gap="gap" responsive="screen">
        <NGi v-for="item in systems" :key="item.code" :span="1">
          <NCard
            :bordered="false"
            size="small"
            class="external-card cursor-pointer"
            :class="{ 'external-card-disabled': !item.canLaunch }"
            @click="openSystem(item)"
          >
            <div class="flex-y-center gap-12px">
              <div
                class="external-icon flex-center size-44px shrink-0 rounded-12px"
                :style="{ backgroundColor: `${item.color}15`, color: item.color }"
              >
                <SvgIcon :icon="item.icon" class="text-22px" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="external-name truncate">{{ item.name }}</div>
                <div class="external-description truncate">
                  {{ item.description || $t('page.ui.connectedBusinessSystems') }}
                </div>
              </div>
              <SvgIcon
                v-if="launchingCode === item.code"
                icon="mdi:loading"
                class="text-18px animate-spin"
              />
              <SvgIcon v-else icon="mdi:arrow-top-right" class="external-arrow text-16px" />
            </div>

            <div class="mt-10px flex items-center justify-between gap-8px">
              <NTag :type="bindingTagType(item.bindingStatus)" size="small" :bordered="false">
                {{ bindingStatusText[item.bindingStatus] }}
              </NTag>
              <span v-if="item.roles.length" class="role-summary truncate">
                {{ item.roles.join('、') }}
              </span>
            </div>

            <div class="system-actions mt-8px flex items-center gap-4px">
              <NButton text size="tiny" :disabled="!item.helpUrl" @click.stop="openInfo(item.helpUrl)">
                {{ $t('page.ui.usageGuide') }}
              </NButton>
              <NButton text size="tiny" @click.stop="showFeedback(item)">{{ $t('page.ui.problemFeedback') }}</NButton>
            </div>
          </NCard>
        </NGi>
      </NGrid>
    </NSpin>
  </div>
</template>

<style scoped>
.section-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-heading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
}

.external-heading-icon {
  color: #14a88b;
  background: rgb(20 168 139 / 11%);
}

.section-title {
  margin: 0;
  color: var(--n-text-color);
  font-size: 16px;
  font-weight: 700;
}

.section-caption {
  margin: 4px 0 0;
  color: var(--n-text-color-3);
  font-size: 12px;
}

.external-card {
  height: 100%;
  border: 1px solid rgb(20 168 139 / 10%);
  border-radius: 14px;
  background: linear-gradient(145deg, rgb(255 255 255 / 96%), rgb(247 252 251 / 92%));
  box-shadow: 0 6px 18px rgb(50 105 100 / 5%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.external-card:hover {
  box-shadow: 0 12px 24px rgb(50 105 100 / 13%);
  transform: translateY(-3px);
}

.external-card-disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.external-card-disabled:hover {
  box-shadow: 0 6px 18px rgb(50 105 100 / 5%);
  transform: none;
}

.external-name {
  color: var(--n-text-color);
  font-size: 15px;
  font-weight: 600;
}

.external-description {
  margin-top: 5px;
  color: var(--n-text-color-3);
  font-size: 12px;
}

.role-summary {
  color: var(--n-text-color-3);
  font-size: 11px;
}

.external-arrow {
  color: var(--n-text-color-3);
  transition: color 0.2s ease, transform 0.2s ease;
}

.external-card:hover .external-arrow {
  color: #14a88b;
  transform: translate(2px, -2px);
}

.system-actions {
  border-top: 1px solid var(--n-divider-color);
}
</style>
