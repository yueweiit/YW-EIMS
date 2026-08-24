<script setup lang="ts">
import { computed } from "vue";
import { useAppStore } from "@/store/modules/app";
import { $t } from "@/locales";
import { externalSystems } from "@/constants/external-systems";

defineOptions({
  name: "ExternalNav",
});

const appStore = useAppStore();

const gap = computed(() => (appStore.isMobile ? 12 : 16));

const systems = computed(() =>
  externalSystems.map((sys) => ({
    name: $t(sys.nameKey),
    icon: sys.icon,
    href: sys.getHref ? sys.getHref() : sys.href,
    color: sys.color,
  })),
);

function openExternal(href: string) {
  window.open(href, "_blank");
}
</script>

<template>
  <div>
    <div class="section-heading">
      <div class="section-heading-icon external-heading-icon">
        <SvgIcon icon="mdi:lan-connect" class="text-20px" />
      </div>
      <div>
        <h4 class="section-title">{{ $t("page.home.externalSystemsTitle") }}</h4>
        <p class="section-caption">{{ $t('page.home.externalSystemsDesc') }}</p>
      </div>
    </div>
    <NGrid :cols="'1 s:2 m:3 l:5'" :x-gap="gap" :y-gap="gap" responsive="screen">
      <NGi v-for="item in systems" :key="item.name" :span="1">
        <NCard
          :bordered="false"
          size="small"
          class="external-card cursor-pointer"
          @click="openExternal(item.href)"
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
              <div class="external-description flex items-center gap-4px">
                <SvgIcon icon="mdi:open-in-new" class="text-12px" />
                <span>{{ $t("page.home.openInNewWindow") }}</span>
              </div>
            </div>
            <SvgIcon icon="mdi:arrow-top-right" class="external-arrow text-16px" />
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

.external-arrow {
  color: var(--n-text-color-3);
  transition: color 0.2s ease, transform 0.2s ease;
}

.external-card:hover .external-arrow {
  color: #14a88b;
  transform: translate(2px, -2px);
}
</style>
