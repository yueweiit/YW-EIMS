<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { DropdownOption } from 'naive-ui';
import { useRouteStore } from '@/store/modules/route';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';

defineOptions({
  name: 'QuickNav'
});

const router = useRouter();
const routeStore = useRouteStore();
const appStore = useAppStore();

const gap = computed(() => (appStore.isMobile ? 12 : 16));

const navItems = computed(() => {
  return routeStore.menus
    .filter(menu => menu.key !== 'external')
    .map(menu => ({
      key: menu.key,
      label: menu.label,
      icon: menu.icon,
      children: menu.children
    }));
});

function getDropdownOptions(item: (typeof navItems.value)[number]): DropdownOption[] {
  if (!item.children?.length) return [];
  return item.children.map(child => ({
    label: child.label,
    key: child.key
  }));
}

function handleNavClick(item: (typeof navItems.value)[number]) {
  if (!item.children?.length) {
    router.push({ name: item.key });
  }
}

function handleDropdownSelect(key: string) {
  router.push({ name: key });
}
</script>

<template>
  <div>
    <h4 class="mb-16px text-16px font-semibold">{{ $t('page.home.internalModules') }}</h4>
    <NGrid :x-gap="gap" :y-gap="gap" responsive="screen" item-responsive>
      <NGi v-for="item in navItems" :key="item.key" span="12 s:8 m:6">
        <NDropdown
          v-if="item.children?.length"
          :options="getDropdownOptions(item)"
          trigger="click"
          @select="handleDropdownSelect"
        >
          <NCard
            :bordered="false"
            class="card-wrapper cursor-pointer transition-all hover:shadow-lg"
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
              <SvgIcon icon="mdi:chevron-down" class="text-18px text-#999 shrink-0" />
            </div>
          </NCard>
        </NDropdown>
        <NCard
          v-else
          :bordered="false"
          class="card-wrapper cursor-pointer transition-all hover:shadow-lg"
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
