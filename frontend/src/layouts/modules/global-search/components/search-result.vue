<script lang="ts" setup>
import { useThemeStore } from '@/store/modules/theme';
import { $t } from '@/locales';

defineOptions({ name: 'SearchResult' });

interface Props {
  options: App.Global.Menu[];
}

defineProps<Props>();

interface Emits {
  (e: 'enter'): void;
}

const emit = defineEmits<Emits>();

const theme = useThemeStore();

const active = defineModel<string>('path', { required: true });

async function handleMouseEnter(item: App.Global.Menu) {
  active.value = item.routePath;
}

function handleTo() {
  emit('enter');
}
</script>

<template>
  <NScrollbar>
    <div class="pb-12px">
      <template v-for="item in options" :key="item.routePath">
        <div
          class="search-result-item mt-8px h-56px flex-y-center cursor-pointer justify-between rounded-8px px-14px"
          :style="{
            background: item.routePath === active ? theme.themeColor : '',
            color: item.routePath === active ? '#fff' : ''
          }"
          @click="handleTo"
          @mouseenter="handleMouseEnter(item)"
        >
          <component :is="item.icon" />
          <span class="ml-5px flex-1">
            {{ (item.i18nKey && $t(item.i18nKey)) || item.label }}
          </span>
          <icon-ant-design-enter-outlined class="icon mr-3px p-2px text-20px" />
        </div>
      </template>
    </div>
  </NScrollbar>
</template>

<style lang="scss" scoped>
.search-result-item {
  border: 1px solid var(--eims-line);
  color: var(--eims-ink-soft);
  background: var(--eims-surface);
  transition:
    color 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease;
}

.search-result-item:hover {
  border-color: var(--eims-primary);
  background: var(--eims-primary-soft);
  color: var(--eims-ink);
}

.search-result-item :deep(.icon) {
  color: currentcolor;
}
</style>
