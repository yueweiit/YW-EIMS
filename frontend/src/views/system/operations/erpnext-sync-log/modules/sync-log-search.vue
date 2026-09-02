<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NInput, NSelect, NSpace } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'SyncLogSearch'
});

const model = defineModel<Api.ErpNextSyncLog.QueryParams>({ required: true });

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();

const entityTypeOptions = computed(() => [
  { label: $t('page.ui.entityMold'), value: 'MOLD' },
  { label: $t('page.ui.entityProduct'), value: 'PRODUCT' },
  { label: $t('page.ui.entityMaterial'), value: 'MATERIAL' }
]);

const statusOptions = computed(() => [
  { label: $t('page.ui.syncPending'), value: 'PENDING' },
  { label: $t('page.ui.syncSuccess'), value: 'SUCCESS' },
  { label: $t('page.ui.syncFailure'), value: 'FAILED' },
  { label: $t('page.ui.syncSkipped'), value: 'SKIPPED' }
]);
</script>

<template>
  <NSpace align="center" wrap>
    <NInput v-model:value="model.entityCode" clearable :placeholder="$t('page.ui.enterCode')" class="w-200px" />
    <NSelect
      v-model:value="model.entityType"
      clearable
      :options="entityTypeOptions"
      :placeholder="$t('page.ui.entityType')"
      class="w-150px"
    />
    <NSelect
      v-model:value="model.status"
      clearable
      :options="statusOptions"
      :placeholder="$t('page.ui.status')"
      class="w-150px"
    />
    <NButton type="primary" @click="emit('search')">
      {{ $t('common.search') }}
    </NButton>
    <NButton @click="emit('reset')">
      {{ $t('common.reset') }}
    </NButton>
  </NSpace>
</template>
