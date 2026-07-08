<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { $t } from '@/locales';
import { externalSystems } from '@/constants/external-systems';

defineOptions({
  name: 'ExternalNav'
});

const appStore = useAppStore();

const gap = computed(() => (appStore.isMobile ? 12 : 16));

const systems = computed(() =>
  externalSystems.map(sys => ({
    name: $t(sys.nameKey),
    icon: sys.icon,
    href: sys.href,
    color: sys.color
  }))
);

function openExternal(href: string) {
  window.open(href, '_blank');
}
</script>

<template>
  <div>
    <h4 class="mb-16px text-16px font-semibold">{{ $t('page.home.externalSystemsTitle') }}</h4>
    <NGrid :x-gap="gap" :y-gap="gap" responsive="screen" item-responsive>
      <NGi v-for="item in systems" :key="item.name" span="12 s:8 m:6">
        <NCard
          :bordered="false"
          class="card-wrapper cursor-pointer transition-all hover:shadow-lg"
          @click="openExternal(item.href)"
        >
          <div class="flex-y-center gap-12px">
            <div
              class="flex-center size-48px shrink-0 rounded-12px"
              :style="{ backgroundColor: `${item.color}15`, color: item.color }"
            >
              <SvgIcon :icon="item.icon" class="text-24px" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-16px font-medium truncate">{{ item.name }}</div>
              <div class="text-12px text-#999 mt-4px flex items-center gap-4px">
                <SvgIcon icon="mdi:open-in-new" class="text-12px" />
                <span>{{ $t('page.home.openInNewWindow') }}</span>
              </div>
            </div>
          </div>
        </NCard>
      </NGi>
    </NGrid>
  </div>
</template>
