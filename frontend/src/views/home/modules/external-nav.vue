<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { $t } from '@/locales';
import {
  fetchPortalSystemLaunch,
  fetchPortalSystems,
  type PortalBindingStatus,
  type PortalSystemRecord
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';

defineOptions({
  name: 'ExternalNav'
});

const appStore = useAppStore();
const systems = ref<PortalSystemRecord[]>([]);
const loading = ref(false);
const loadError = ref(false);
const launchingCodes = ref<Set<string>>(new Set());

const gap = computed(() => (appStore.isMobile ? 12 : 16));

const bindingStatusText = computed<Record<PortalBindingStatus, string>>(() => ({
  bound: $t('page.ui.bound'),
  unbound: $t('page.ui.unbound'),
  not_required: $t('page.ui.notRequired'),
  not_configured: $t('page.ui.notConfigured')
}));

function statusTone(system: PortalSystemRecord) {
  return system.canLaunch ? 'ready' : 'attention';
}

function launchLabel(system: PortalSystemRecord) {
  return system.canLaunch ? $t('page.home.launchSystem') : $t('page.home.checkAccess');
}

async function loadSystems() {
  if (loading.value) return;

  loading.value = true;
  loadError.value = false;
  try {
    const { data, error } = await fetchPortalSystems();
    if (error || !data) {
      loadError.value = true;
      return;
    }

    systems.value = data;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function isLaunching(code: string) {
  return launchingCodes.value.has(code);
}

function setLaunching(code: string, launching: boolean) {
  const nextCodes = new Set(launchingCodes.value);
  if (launching) nextCodes.add(code);
  else nextCodes.delete(code);
  launchingCodes.value = nextCodes;
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
  if (isLaunching(system.code)) return;

  setLaunching(system.code, true);
  // Keep the tab creation inside the user gesture. The backend validates the
  // final destination before the placeholder tab is redirected.
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
      window.location.assign(data.url);
    }
  } catch {
    popup?.close();
    window.$message?.error($t('page.ui.systemEntryRetry'));
  } finally {
    setLaunching(system.code, false);
  }
}

function openInfo(url: string | null | undefined) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function openHelp(system: PortalSystemRecord) {
  openInfo(system.helpUrl);
}

function showFeedback(system: PortalSystemRecord) {
  if (system.feedbackUrl) {
    openInfo(system.feedbackUrl);
    return;
  }
  window.$message?.info(system.contact || $t('page.ui.feedbackAdmin'));
}

onMounted(() => {
  void loadSystems();
});
</script>

<template>
  <div class="portal-page">
    <section class="portal-content">
      <div class="section-heading">
        <div class="section-heading-copy">
          <div class="section-kicker">
            <span aria-hidden="true"></span>
            {{ $t('page.home.accessMapLabel') }}
          </div>
          <h2>{{ $t('page.home.externalSystemsTitle') }}</h2>
          <p>{{ $t('page.home.externalSystemsDescription') }}</p>
        </div>
        <div class="section-count">
          <strong>{{ systems.length }}</strong>
          <span>{{ $t('page.home.systemsUnit') }}</span>
        </div>
      </div>

      <NSpin :show="loading" :description="$t('page.ui.loadingSystems')" class="systems-loader">
        <div v-if="loading" class="loading-state" aria-hidden="true"></div>

        <div v-else-if="loadError" class="empty-state empty-state-error" role="alert">
          <div class="empty-state-mark" aria-hidden="true">
            <SvgIcon icon="mdi:cloud-alert-outline" />
          </div>
          <strong>{{ $t('page.ui.systemsLoadFailed') }}</strong>
          <p>{{ $t('page.ui.systemsLoadFailedDescription') }}</p>
          <button type="button" class="retry-button" @click="loadSystems">
            <SvgIcon icon="mdi:refresh" />
            <span>{{ $t('page.ui.retryLoad') }}</span>
          </button>
        </div>

        <div v-else-if="!systems.length" class="empty-state">
          <div class="empty-state-mark" aria-hidden="true">
            <SvgIcon icon="mdi:view-grid-outline" />
          </div>
          <NEmpty :description="$t('page.ui.noAccessibleSystems')" />
        </div>

        <NGrid v-else cols="1 s:2 m:3 xl:4" :x-gap="gap" :y-gap="gap" responsive="screen" class="systems-grid">
          <NGi v-for="item in systems" :key="item.code" class="system-grid-item">
            <article class="system-card" :class="{ 'system-card-disabled': !item.canLaunch }">
              <div class="system-card-head">
                <div
                  class="system-icon"
                  :style="{ backgroundColor: `${item.color}14`, borderColor: `${item.color}2e`, color: item.color }"
                >
                  <SvgIcon :icon="item.icon" />
                </div>
                <div class="system-status" :class="`status-${statusTone(item)}`">
                  <span class="status-dot" aria-hidden="true"></span>
                  <span>{{ bindingStatusText[item.bindingStatus] }}</span>
                </div>
              </div>

              <div class="system-card-main">
                <div class="system-category">{{ item.category }}</div>
                <h3>{{ item.name }}</h3>
                <div class="system-code">
                  <SvgIcon icon="mdi:identifier" />
                  <span>{{ item.code }}</span>
                </div>
                <p>{{ item.description || $t('page.ui.connectedBusinessSystems') }}</p>
              </div>

              <div class="system-card-actions">
                <button
                  type="button"
                  class="launch-button"
                  :class="{ 'launch-button-muted': !item.canLaunch }"
                  :disabled="isLaunching(item.code)"
                  @click="openSystem(item)"
                >
                  <span>{{ isLaunching(item.code) ? $t('page.home.openingSystem') : launchLabel(item) }}</span>
                  <SvgIcon
                    :icon="isLaunching(item.code) ? 'mdi:loading' : 'mdi:arrow-up-right'"
                    :class="{ 'is-spinning': isLaunching(item.code) }"
                  />
                </button>
                <button type="button" class="feedback-button" @click="showFeedback(item)">
                  <SvgIcon icon="mdi:message-alert-outline" />
                  <span>{{ $t('page.ui.problemFeedback') }}</span>
                </button>
              </div>

              <button type="button" class="guide-button" :disabled="!item.helpUrl" @click="openHelp(item)">
                <SvgIcon icon="mdi:book-open-page-variant-outline" />
                <span>{{ $t('page.ui.usageGuide') }}</span>
              </button>
            </article>
          </NGi>
        </NGrid>
      </NSpin>
    </section>
  </div>
</template>

<style scoped>
.portal-page {
  --portal-ink: var(--eims-ink);
  --portal-ink-soft: var(--eims-ink-soft);
  --portal-card: var(--eims-surface);
  --portal-line: var(--eims-line);
  --portal-primary: var(--eims-primary);
  --portal-primary-hover: var(--eims-primary-hover);
  --portal-primary-soft: var(--eims-primary-soft);
  --portal-success: var(--eims-success);
  --portal-warning: var(--eims-warning);
  --portal-danger: var(--eims-danger);
  --portal-shadow: 0 14px 38px rgb(35 56 84 / 9%);
  width: 100%;
  min-width: 0;
  color: var(--portal-ink);
}

.section-kicker {
  color: var(--portal-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.17em;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentcolor;
  box-shadow: 0 0 0 4px color-mix(in srgb, currentcolor 12%, transparent);
}

.launch-button,
.feedback-button,
.guide-button {
  border: 0;
  font: inherit;
}

.portal-content {
  min-width: 0;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.section-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
}

.section-kicker > span {
  width: 24px;
  height: 2px;
  background: var(--portal-primary);
}

.section-heading h2 {
  margin: 8px 0 5px;
  color: var(--portal-ink);
  font-family: 'Aptos Display', 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: clamp(24px, 2.5vw, 32px);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.15;
}

.section-heading-copy p {
  margin: 0;
  color: var(--portal-ink-soft);
  font-size: 13px;
}

.section-count {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  flex: 0 0 auto;
  padding: 8px 12px;
  border: 1px solid var(--portal-line);
  border-radius: 10px;
  color: var(--portal-ink-soft);
  background: var(--portal-card);
  font-size: 11px;
}

.section-count strong {
  color: var(--portal-primary);
  font-size: 16px;
}

.systems-grid,
.system-grid-item {
  min-width: 0;
}

.systems-grid {
  width: 100%;
  align-items: stretch;
}

.system-card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  min-height: 318px;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--portal-line);
  border-radius: 16px;
  background: var(--portal-card);
  box-shadow: 0 7px 22px rgb(35 56 84 / 4%);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.system-card:hover {
  border-color: color-mix(in srgb, var(--portal-primary) 24%, transparent);
  box-shadow: var(--portal-shadow);
  transform: translateY(-3px);
}

.system-card-disabled:hover {
  border-color: var(--portal-line);
  box-shadow: 0 7px 22px rgb(35 56 84 / 4%);
  transform: none;
}

.system-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.system-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  border: 1px solid;
  border-radius: 14px;
  font-size: 23px;
}

.system-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  border-radius: 999px;
  color: var(--portal-success);
  background: color-mix(in srgb, currentcolor 8%, transparent);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.system-status.status-attention {
  color: var(--portal-warning);
}

.status-dot {
  width: 6px;
  height: 6px;
  box-shadow: none;
}

.system-card-main {
  flex: 1;
  padding-top: 20px;
}

.system-category {
  color: var(--portal-ink-soft);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.system-card-main h3 {
  margin: 8px 0 5px;
  overflow-wrap: anywhere;
  color: var(--portal-ink);
  font-family: 'Aptos Display', 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.system-code {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--portal-primary);
  font-family: 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
}

.system-code :deep(svg) {
  font-size: 13px;
}

.system-card-main p {
  display: -webkit-box;
  min-height: 42px;
  margin: 15px 0 0;
  overflow: hidden;
  color: var(--portal-ink-soft);
  font-size: 13px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.system-card-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding-top: 15px;
  border-top: 1px solid var(--portal-line);
}

.launch-button,
.feedback-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.launch-button {
  justify-content: space-between;
  gap: 8px;
  padding: 0 13px 0 15px;
  color: #ffffff;
  background: var(--portal-primary);
}

.launch-button:hover:not(:disabled) {
  background: var(--portal-primary-hover);
  transform: translateY(-1px);
}

.launch-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.launch-button-muted {
  color: var(--portal-primary);
  background: var(--portal-primary-soft);
}

.launch-button-muted:hover:not(:disabled) {
  background: color-mix(in srgb, var(--portal-primary) 13%, transparent);
}

.feedback-button {
  gap: 5px;
  min-width: 90px;
  padding: 0 11px;
  border: 1px solid var(--portal-line);
  color: var(--portal-ink-soft);
  background: transparent;
}

.feedback-button:hover {
  border-color: color-mix(in srgb, var(--portal-primary) 28%, transparent);
  color: var(--portal-primary);
  background: var(--portal-primary-soft);
}

.guide-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  margin-top: 11px;
  padding: 0;
  color: var(--portal-ink-soft);
  background: transparent;
  font-size: 11px;
  cursor: pointer;
}

.guide-button:hover:not(:disabled) {
  color: var(--portal-primary);
}

.guide-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.systems-loader,
.loading-state {
  min-height: 260px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  border: 1px dashed var(--portal-line);
  border-radius: 16px;
  background: var(--portal-card);
}

.empty-state-mark {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  margin-bottom: 8px;
  border: 1px solid color-mix(in srgb, var(--portal-primary) 16%, transparent);
  border-radius: 16px;
  color: var(--portal-primary);
  background: var(--portal-primary-soft);
  font-size: 25px;
}

.empty-state-error .empty-state-mark {
  border-color: color-mix(in srgb, var(--portal-danger) 20%, transparent);
  color: var(--portal-danger);
  background: color-mix(in srgb, var(--portal-danger) 8%, transparent);
}

.empty-state strong {
  color: var(--portal-ink);
  font-size: 15px;
}

.empty-state p {
  max-width: 420px;
  margin: 6px 20px 16px;
  color: var(--portal-ink-soft);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.retry-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 9px;
  color: #ffffff;
  background: var(--portal-primary);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 160ms ease,
    transform 160ms ease;
}

.retry-button:hover {
  background: var(--portal-primary-hover);
  transform: translateY(-1px);
}

.retry-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--portal-primary) 38%, transparent);
  outline-offset: 3px;
}

.is-spinning {
  animation: portal-spin 850ms linear infinite;
}

:global(html.dark) .portal-page {
  --portal-shadow: 0 14px 38px rgb(0 0 0 / 24%);
}

:global(html.dark) .system-card,
:global(html.dark) .system-card-disabled:hover {
  box-shadow: 0 7px 22px rgb(0 0 0 / 14%);
}

@keyframes portal-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 560px) {
  .section-heading {
    align-items: flex-start;
  }

  .section-count {
    margin-top: 19px;
  }

  .system-card-actions {
    grid-template-columns: 1fr;
  }

  .feedback-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .system-card,
  .launch-button {
    transition: none;
  }

  .is-spinning {
    animation: none;
  }
}
</style>
