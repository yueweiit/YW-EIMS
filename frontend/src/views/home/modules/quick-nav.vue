<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRouteStore } from '@/store/modules/route';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';

defineOptions({
  name: 'QuickNav'
});

const router = useRouter();
const routeStore = useRouteStore();
const appStore = useAppStore();
const openedMenuKey = ref<string | null>(null);

const gap = computed(() => (appStore.isMobile ? 12 : 16));

const navItems = computed(() => {
  return routeStore.menus
    .filter(menu => menu.key !== 'external' && menu.key !== 'home')
    .map(menu => ({
      key: menu.key,
      label: menu.label,
      icon: menu.icon,
      children: menu.children
    }));
});

function handleNavClick(item: (typeof navItems.value)[number]) {
  if (!item.children?.length) {
    router.push({ name: item.key });
  }
}

function handleDropdownSelect(key: string) {
  openedMenuKey.value = null;
  router.push({ name: key });
}

function updatePopover(key: string, show: boolean) {
  openedMenuKey.value = show ? key : null;
}
</script>

<template>
  <div>
    <div class="section-heading">
      <div class="section-heading-icon bg-primary/10 text-primary">
        <SvgIcon icon="mdi:view-grid-outline" class="text-20px" />
      </div>
      <div>
        <h4 class="section-title">{{ $t('page.home.internalModules') }}</h4>
        <p class="section-caption">{{ $t('page.home.internalModulesDesc') }}</p>
      </div>
    </div>
    <NGrid :cols="'1 s:2 m:3 l:5'" :x-gap="gap" :y-gap="gap" responsive="screen">
      <NGi v-for="item in navItems" :key="item.key" :span="1">
        <NPopover
          v-if="item.children?.length"
          :show="openedMenuKey === item.key"
          trigger="click"
          placement="bottom-start"
          :show-arrow="false"
          :width="286"
          @update:show="show => updatePopover(item.key, show)"
        >
          <template #trigger>
            <NCard
              :bordered="false"
              size="small"
              class="module-card cursor-pointer"
            >
              <div class="flex-y-center gap-12px">
                <div class="flex-center size-48px shrink-0 rounded-12px bg-primary/10 text-primary">
                  <component :is="item.icon" v-if="item.icon" class="text-24px" />
                  <span v-else class="text-24px">?</span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-16px font-medium truncate">{{ item.label }}</div>
                  <div class="text-12px text-#999 mt-4px">
                    {{ item.children.length }} {{ $t('page.home.subModules') }}
                  </div>
                </div>
                <SvgIcon
                  icon="mdi:chevron-down"
                  class="menu-chevron text-18px text-#999 shrink-0"
                  :class="{ 'menu-chevron-open': openedMenuKey === item.key }"
                />
              </div>
            </NCard>
          </template>
          <div class="module-popover">
            <div class="popover-heading">
              <div class="popover-heading-icon bg-primary/10 text-primary">
                <component :is="item.icon" v-if="item.icon" class="text-17px" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="popover-title">{{ item.label }}</div>
                <div class="popover-caption">{{ $t('page.home.subModules') }}</div>
              </div>
              <span class="popover-count">{{ item.children.length }}</span>
            </div>
            <div class="popover-list">
              <button
                v-for="child in item.children"
                :key="child.key"
                type="button"
                class="popover-item"
                @click="handleDropdownSelect(child.key)"
              >
                <span class="popover-item-icon bg-primary/10 text-primary">
                  <component :is="child.icon" v-if="child.icon" class="text-15px" />
                  <SvgIcon v-else icon="mdi:arrow-right-circle-outline" class="text-15px" />
                </span>
                <span class="truncate">{{ child.label }}</span>
                <SvgIcon icon="mdi:arrow-top-right" class="popover-item-arrow" />
              </button>
            </div>
          </div>
        </NPopover>
        <NCard
          v-else
          :bordered="false"
          size="small"
          class="module-card cursor-pointer"
          @click="handleNavClick(item)"
        >
          <div class="flex-y-center gap-12px">
            <div class="flex-center size-48px shrink-0 rounded-12px bg-primary/10 text-primary">
              <component :is="item.icon" v-if="item.icon" class="text-24px" />
              <span v-else class="text-24px">?</span>
            </div>
            <div class="min-w-0">
              <div class="text-16px font-medium truncate">{{ item.label }}</div>
              <div class="text-12px text-#999 mt-4px">
                {{ item.children?.length || 0 }} {{ $t('page.home.subModules') }}
              </div>
            </div>
          </div>
        </NCard>
      </NGi>
    </NGrid>
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

.module-card {
  height: 100%;
  border: 1px solid rgb(99 112 232 / 10%);
  border-radius: 14px;
  background: linear-gradient(145deg, rgb(255 255 255 / 96%), rgb(248 249 255 / 92%));
  box-shadow: 0 6px 18px rgb(67 78 147 / 5%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.module-card:hover {
  box-shadow: 0 12px 24px rgb(67 78 147 / 13%);
  transform: translateY(-3px);
}

.menu-chevron {
  transition: transform 0.2s ease;
}

.menu-chevron-open {
  transform: rotate(180deg);
}

.module-popover {
  padding: 4px;
}

.popover-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px 12px;
  border-bottom: 1px solid var(--n-divider-color);
}

.popover-heading-icon,
.popover-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 9px;
}

.popover-heading-icon {
  width: 34px;
  height: 34px;
}

.popover-title {
  color: var(--n-text-color);
  font-size: 14px;
  font-weight: 700;
}

.popover-caption {
  margin-top: 3px;
  color: var(--n-text-color-3);
  font-size: 11px;
}

.popover-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border-radius: 999px;
  color: var(--n-primary-color);
  background: var(--n-primary-color-suppl);
  font-size: 12px;
  font-weight: 700;
}

.popover-list {
  display: grid;
  gap: 4px;
  padding-top: 8px;
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 8px;
  border: 0;
  border-radius: 10px;
  color: var(--n-text-color);
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background 0.2s ease, color 0.2s ease;
}

.popover-item:hover {
  color: var(--n-primary-color);
  background: var(--n-primary-color-suppl);
}

.popover-item-icon {
  width: 28px;
  height: 28px;
}

.popover-item-arrow {
  margin-left: auto;
  color: var(--n-text-color-3);
  font-size: 14px;
  transition: transform 0.2s ease, color 0.2s ease;
}

.popover-item:hover .popover-item-arrow {
  color: var(--n-primary-color);
  transform: translate(2px, -2px);
}
</style>
