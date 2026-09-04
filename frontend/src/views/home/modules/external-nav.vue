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

function statusTone(system: PortalSystemRecord) {
  return system.canLaunch ? 'ready' : 'attention';
}

function launchLabel(system: PortalSystemRecord) {
  return system.canLaunch ? $t('page.home.launchSystem') : $t('page.home.checkAccess');
}

async function loadSystems() {
  if (loading.value) return;

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
  // user gesture. The destination is still validated by the EIMS backend
  // before navigation.
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
      // If the browser blocks new windows, navigate the current tab instead.
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
    <div class="portal-content">
      <div class="section-heading">
        <div class="section-heading-copy">
          <div class="section-kicker">
            <span aria-hidden="true"></span>
            {{ $t('page.home.accessMapLabel') }}
          </div>
          <h2>{{ $t('page.home.externalSystemsTitle') }}</h2>
        </div>
      </div>

      <NSpin :show="loading">
        <div v-if="!loading && !systems.length" class="empty-state">
          <div class="empty-state-mark" aria-hidden="true">
            <SvgIcon icon="mdi:radar" />
          </div>
          <NEmpty :description="$t('page.ui.noAccessibleSystems')" />
        </div>

        <NGrid v-else cols="1 s:2 m:3 xl:4" :x-gap="gap" :y-gap="gap" responsive="screen" class="systems-grid">
          <NGi v-for="item in systems" :key="item.code" class="system-grid-item">
            <article
              class="system-card"
              :class="{ 'system-card-disabled': !item.canLaunch }"
              :style="{ borderTopColor: item.color }"
              role="button"
              tabindex="0"
              :aria-label="`${item.name} — ${launchLabel(item)}`"
              @click="openSystem(item)"
              @keydown.enter.prevent="openSystem(item)"
              @keydown.space.prevent="openSystem(item)"
            >
              <div class="system-card-inner">
                <div class="system-card-head">
                  <div
                    class="system-icon"
                    :style="{ backgroundColor: `${item.color}18`, borderColor: `${item.color}32`, color: item.color }"
                  >
                    <SvgIcon :icon="item.icon" />
                  </div>
                  <div class="system-status" :class="`status-${statusTone(item)}`">
                    <span class="status-dot" aria-hidden="true"></span>
                    <span>{{ bindingStatusText[item.bindingStatus] }}</span>
                  </div>
                </div>

                <div class="system-card-main">
                  <div class="system-category">
                    <span aria-hidden="true"></span>
                    {{ item.category }}
                  </div>
                  <h3>{{ item.name }}</h3>
                  <div class="system-code">
                    <SvgIcon icon="mdi:code-tags" />
                    <span>{{ item.code }}</span>
                  </div>
                  <p>{{ item.description || $t('page.ui.connectedBusinessSystems') }}</p>
                </div>

                <div class="system-card-actions">
                  <button
                    type="button"
                    class="launch-button"
                    :class="{ 'launch-button-muted': !item.canLaunch }"
                    @click.stop="openSystem(item)"
                  >
                    <span>{{ launchingCode === item.code ? $t('page.home.openingSystem') : launchLabel(item) }}</span>
                    <SvgIcon
                      :icon="launchingCode === item.code ? 'mdi:loading' : 'mdi:arrow-up-right'"
                      :class="{ 'is-spinning': launchingCode === item.code }"
                    />
                  </button>
                  <div class="utility-actions">
                    <button type="button" class="utility-button" :disabled="!item.helpUrl" @click.stop="openHelp(item)">
                      <SvgIcon icon="mdi:book-open-page-variant-outline" />
                      <span>{{ $t('page.ui.usageGuide') }}</span>
                    </button>
                    <button type="button" class="utility-button" @click.stop="showFeedback(item)">
                      <SvgIcon icon="mdi:message-alert-outline" />
                      <span>{{ $t('page.ui.problemFeedback') }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </NGi>
        </NGrid>
      </NSpin>

      <footer class="portal-note">
        <div class="portal-note-icon" aria-hidden="true">
          <SvgIcon icon="mdi:shield-check-outline" />
        </div>
        <div class="portal-note-copy">
          <strong>{{ $t('page.home.accessNoteTitle') }}</strong>
          <p>{{ $t('page.home.accessNoteDescription') }}</p>
        </div>
        <div class="portal-note-live">
          <span aria-hidden="true"></span>
          {{ $t('page.home.statusLive') }}
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.portal-page {
  --portal-ink: #16323d;
  --portal-ink-soft: #698087;
  --portal-canvas: #f1f4ef;
  --portal-card: #fbfcf9;
  --portal-card-soft: #f3f6f1;
  --portal-line: #dfe8df;
  --portal-deep: #143843;
  --portal-teal: #2b8d7d;
  --portal-lime: #b9dc82;
  --portal-warning: #d28a55;
  --portal-shadow: 0 20px 46px rgb(22 50 61 / 9%);
  width: 100%;
  min-width: 0;
  color: var(--portal-ink);
  font-family: 'Aptos', 'Bahnschrift', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.portal-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 35%);
  min-height: 326px;
  overflow: hidden;
  border-radius: 28px;
  background: linear-gradient(124deg, #102f3a 0%, #173f47 60%, #205b56 100%);
  box-shadow: 0 24px 54px rgb(18 52 60 / 17%);
  isolation: isolate;
}

.hero-grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(rgb(203 237 197 / 9%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(203 237 197 / 9%) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: linear-gradient(90deg, #000 0%, rgb(0 0 0 / 75%) 58%, transparent 100%);
}

.hero-glow {
  position: absolute;
  z-index: -1;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  filter: blur(4px);
  pointer-events: none;
}

.hero-glow-left {
  top: -160px;
  left: -80px;
  background: rgb(91 180 151 / 19%);
}

.hero-glow-right {
  right: -80px;
  bottom: -205px;
  background: rgb(185 220 130 / 17%);
}

.hero-copy {
  position: relative;
  z-index: 1;
  align-self: center;
  padding: clamp(32px, 5vw, 72px);
}

.hero-eyebrow,
.section-kicker,
.system-code,
.hero-user-label,
.signal-module-heading,
.signal-footer,
.portal-note-live {
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #bfe29c;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.eyebrow-signal,
.portal-note-live span {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #c9ec91;
  box-shadow:
    0 0 0 4px rgb(201 236 145 / 13%),
    0 0 18px rgb(201 236 145 / 62%);
}

.hero-copy h1 {
  max-width: 700px;
  margin: 22px 0 16px;
  color: #f5f7ee;
  font-family: 'Aptos Display', 'Bahnschrift SemiCondensed', 'Bahnschrift', 'Arial Narrow', 'Noto Sans SC', sans-serif;
  font-size: clamp(38px, 5.2vw, 70px);
  font-weight: 700;
  letter-spacing: -0.055em;
  line-height: 1.02;
}

.hero-description {
  max-width: 500px;
  color: rgb(226 241 230 / 72%);
  font-size: 15px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 34px;
}

.hero-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-avatar {
  width: 38px !important;
  height: 38px !important;
  border: 2px solid rgb(242 249 229 / 35%);
}

.hero-user-label {
  display: block;
  margin-bottom: 2px;
  color: rgb(226 241 230 / 55%);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-user strong {
  color: #f5f7ee;
  font-size: 13px;
  font-weight: 600;
}

.hero-refresh {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgb(212 238 183 / 27%);
  border-radius: 9px;
  color: #d9eec2;
  background: rgb(255 255 255 / 5%);
  font-size: 12px;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    color 180ms ease;
}

.hero-refresh:hover:not(:disabled) {
  border-color: rgb(212 238 183 / 65%);
  background: rgb(255 255 255 / 11%);
  color: #f5f7ee;
}

.hero-refresh:focus-visible,
.launch-button:focus-visible,
.utility-button:focus-visible {
  outline: 2px solid #d5f19d;
  outline-offset: 3px;
}

.hero-refresh:disabled {
  cursor: wait;
  opacity: 0.6;
}

.hero-refresh-icon {
  display: inline-flex;
  font-size: 15px;
}

.is-spinning {
  animation: portal-spin 0.9s linear infinite;
}

.signal-module {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  min-width: 0;
  padding: 34px clamp(28px, 4vw, 54px) 30px 22px;
  color: #ecf5e7;
}

.signal-module-heading,
.signal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgb(231 245 226 / 68%);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.signal-live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #c8e99b;
  font-size: 9px;
}

.signal-live i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c8e99b;
  box-shadow: 0 0 12px rgb(200 233 155 / 85%);
}

.signal-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 260px);
  aspect-ratio: 1;
  margin: 12px auto 5px;
}

.signal-radar-grid,
.signal-orbit,
.signal-sweep,
.signal-node,
.signal-dial {
  position: absolute;
}

.signal-radar-grid {
  inset: 12%;
  border: 1px solid rgb(207 239 180 / 19%);
  border-radius: 50%;
  background-image:
    linear-gradient(rgb(207 239 180 / 14%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(207 239 180 / 14%) 1px, transparent 1px);
  background-size: 25% 25%;
  mask-image: radial-gradient(circle, #000 0%, transparent 73%);
}

.signal-radar-grid::before,
.signal-radar-grid::after {
  position: absolute;
  inset: 0;
  border: 1px solid rgb(207 239 180 / 16%);
  border-radius: inherit;
  content: '';
}

.signal-radar-grid::before {
  transform: scale(0.7);
}

.signal-radar-grid::after {
  transform: scale(0.4);
}

.signal-orbit {
  border: 1px solid rgb(207 239 180 / 20%);
  border-radius: 50%;
  transform: rotate(-28deg);
}

.signal-orbit-large {
  inset: 7%;
  border-left-color: transparent;
  border-bottom-color: rgb(207 239 180 / 38%);
}

.signal-orbit-small {
  inset: 25%;
  border-right-color: transparent;
  border-top-color: rgb(207 239 180 / 42%);
  transform: rotate(48deg);
}

.signal-sweep {
  top: 50%;
  left: 50%;
  width: 39%;
  height: 1px;
  transform-origin: left center;
  background: linear-gradient(90deg, rgb(201 236 145 / 85%), transparent);
  box-shadow: 0 0 12px rgb(201 236 145 / 70%);
  animation: portal-sweep 4.8s linear infinite;
}

.signal-node {
  width: 7px;
  height: 7px;
  border: 2px solid #e2f4bf;
  border-radius: 50%;
  background: #77ba91;
  box-shadow:
    0 0 0 4px rgb(201 236 145 / 10%),
    0 0 15px rgb(201 236 145 / 73%);
}

.signal-node-one {
  top: 22%;
  right: 19%;
}

.signal-node-two {
  right: 28%;
  bottom: 16%;
  background: #d9946d;
}

.signal-dial {
  display: grid;
  place-items: center;
  width: 142px;
  height: 142px;
  padding: 9px;
  border-radius: 50%;
  box-shadow: 0 0 30px rgb(188 226 133 / 15%);
  transition: background 300ms ease;
}

.signal-dial-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 1px solid rgb(226 244 191 / 18%);
  border-radius: 50%;
  background: #173e47;
}

.signal-count-line {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.signal-count-line strong {
  color: #f0f7e8;
  font-family: 'Aptos Display', 'Bahnschrift', 'Noto Sans SC', sans-serif;
  font-size: 38px;
  font-weight: 700;
  letter-spacing: -0.07em;
  line-height: 1;
}

.signal-count-line span {
  color: rgb(226 244 191 / 64%);
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
}

.signal-label {
  margin-top: 8px;
  color: #c7e695;
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 9px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.signal-footer {
  padding-top: 10px;
  border-top: 1px solid rgb(222 242 210 / 16%);
}

.signal-footer strong {
  color: #c9ec91;
  font-size: 12px;
  letter-spacing: 0.02em;
}

.portal-content {
  box-sizing: border-box;
  min-width: 0;
  padding: clamp(8px, 1.5vw, 18px) 4px 0;
}

.section-heading {
  margin-bottom: 24px;
}

.section-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--portal-teal);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.section-kicker span {
  width: 24px;
  height: 2px;
  background: var(--portal-lime);
}

.section-heading h2 {
  margin: 10px 0 4px;
  color: var(--portal-ink);
  font-family: 'Aptos Display', 'Bahnschrift', 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: clamp(25px, 3vw, 34px);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.section-heading-copy p {
  color: var(--portal-ink-soft);
  font-size: 13px;
}

.systems-grid {
  width: 100%;
  min-width: 0;
  align-items: stretch;
}

.system-grid-item {
  min-width: 0;
}

.system-card {
  height: 100%;
  min-height: 316px;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--portal-line);
  border-top-width: 3px;
  border-radius: 16px;
  background: var(--portal-card);
  box-shadow: 0 8px 24px rgb(22 50 61 / 4%);
  cursor: pointer;
  outline: none;
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease;
}

.system-card:hover {
  box-shadow: var(--portal-shadow);
  transform: translateY(-5px);
}

.system-card:focus-visible {
  box-shadow:
    0 0 0 3px var(--portal-lime),
    var(--portal-shadow);
}

.system-card-disabled {
  cursor: not-allowed;
}

.system-card-disabled:hover {
  box-shadow: 0 8px 24px rgb(22 50 61 / 4%);
  transform: none;
}

.system-card-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 20px 16px;
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
  width: 50px;
  height: 50px;
  border: 1px solid;
  border-radius: 15px;
  font-size: 24px;
  transition: transform 220ms ease;
}

.system-card:hover .system-icon {
  transform: rotate(-4deg) scale(1.04);
}

.system-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-top: 5px;
  color: var(--portal-ink-soft);
  font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  font-size: 10px;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--portal-teal);
  box-shadow: 0 0 0 4px rgb(43 141 125 / 10%);
}

.status-attention .status-dot {
  background: var(--portal-warning);
  box-shadow: 0 0 0 4px rgb(210 138 85 / 11%);
}

.system-card-main {
  flex: 1;
  padding-top: 24px;
}

.system-category {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--portal-ink-soft);
  font-size: 10px;
  letter-spacing: 0.07em;
}

.system-category span {
  width: 5px;
  height: 5px;
  border-radius: 1px;
  background: var(--portal-lime);
  transform: rotate(45deg);
}

.system-card-main h3 {
  margin: 9px 0 5px;
  overflow-wrap: anywhere;
  color: var(--portal-ink);
  font-family: 'Aptos Display', 'Bahnschrift', 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.1;
}

.system-code {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--portal-teal);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.system-code :deep(svg) {
  font-size: 13px;
}

.system-card-main p {
  display: -webkit-box;
  min-height: 42px;
  margin-top: 17px;
  overflow: hidden;
  color: var(--portal-ink-soft);
  font-size: 13px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.system-card-actions {
  padding-top: 12px;
  border-top: 1px solid var(--portal-line);
}

.launch-button,
.utility-button {
  border: 0;
  font: inherit;
}

.launch-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 39px;
  padding: 0 13px 0 15px;
  border-radius: 9px;
  color: #f2f8ea;
  background: var(--portal-deep);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  transition:
    color 180ms ease,
    background 180ms ease,
    transform 180ms ease;
}

.launch-button:hover {
  color: #15333b;
  background: var(--portal-lime);
  transform: translateY(-1px);
}

.launch-button :deep(svg) {
  font-size: 16px;
}

.launch-button-muted {
  color: var(--portal-ink-soft);
  background: var(--portal-card-soft);
}

.launch-button-muted:hover {
  color: var(--portal-ink);
  background: #e6ece4;
}

.utility-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding-top: 9px;
}

.utility-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 1 1 auto;
  min-width: 0;
  color: var(--portal-ink-soft);
  background: transparent;
  font-size: 10px;
  white-space: nowrap;
  transition: color 180ms ease;
}

.utility-button:hover:not(:disabled) {
  color: var(--portal-teal);
}

.utility-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.utility-button :deep(svg) {
  font-size: 14px;
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
  border: 1px solid var(--portal-line);
  border-radius: 16px;
  color: var(--portal-teal);
  background: var(--portal-card-soft);
  font-size: 25px;
}

.portal-note {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 28px;
  padding: 15px 18px;
  border: 1px solid var(--portal-line);
  border-left: 3px solid var(--portal-lime);
  border-radius: 12px;
  background: rgb(255 255 255 / 45%);
}

.portal-note-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: 9px;
  color: var(--portal-teal);
  background: rgb(43 141 125 / 10%);
  font-size: 17px;
}

.portal-note-copy {
  min-width: 0;
  flex: 1;
}

.portal-note-copy strong {
  display: block;
  color: var(--portal-ink);
  font-size: 12px;
}

.portal-note-copy p {
  margin-top: 3px;
  color: var(--portal-ink-soft);
  font-size: 11px;
  line-height: 1.5;
}

.portal-note-live {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  color: var(--portal-teal);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:global(html.dark) .portal-page {
  --portal-ink: #edf5ed;
  --portal-ink-soft: #9fb4b4;
  --portal-canvas: #0d1b24;
  --portal-card: #142831;
  --portal-card-soft: #1b343a;
  --portal-line: #29434a;
  --portal-deep: #1d4c4d;
  --portal-teal: #76c2a7;
  --portal-lime: #b9dc82;
  --portal-warning: #e0a06d;
  --portal-shadow: 0 20px 46px rgb(0 0 0 / 24%);
}

:global(html.dark) .portal-note {
  background: rgb(20 40 49 / 70%);
}

:global(html.dark) .system-card {
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}

:global(html.dark) .system-card-disabled:hover {
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}

:global(html.dark) .launch-button-muted:hover {
  color: var(--portal-ink);
  background: #29464a;
}

@keyframes portal-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes portal-sweep {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .portal-hero {
    grid-template-columns: minmax(0, 1fr) minmax(240px, 33%);
  }

  .hero-copy {
    padding: 40px;
  }

  .signal-module {
    padding-right: 28px;
  }
}

@media (max-width: 700px) {
  .portal-hero {
    display: block;
  }

  .hero-copy {
    padding: 34px 28px 20px;
  }

  .hero-copy h1 {
    max-width: 520px;
    font-size: clamp(38px, 10vw, 56px);
  }

  .signal-module {
    width: min(100%, 320px);
    margin: 0 auto;
    padding: 10px 28px 28px;
  }

  .signal-visual {
    width: min(100%, 220px);
    margin-top: 7px;
  }

  .signal-dial {
    width: 122px;
    height: 122px;
  }

  .signal-count-line strong {
    font-size: 32px;
  }
}

@media (max-width: 460px) {
  .hero-actions {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    margin-top: 26px;
  }

  .hero-refresh {
    width: 100%;
    justify-content: center;
  }

  .portal-note {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .portal-note-live {
    width: 100%;
    padding-left: 43px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .system-card,
  .system-icon,
  .launch-button,
  .hero-refresh,
  .signal-dial {
    transition: none;
  }

  .is-spinning,
  .signal-sweep {
    animation: none;
  }
}
</style>
