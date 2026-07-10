<script setup lang="ts">
import { NButton, NInput, NSelect, NSpace } from 'naive-ui';
import { $t } from '@/locales';
import { erpNextMappingTypeOptions } from './options';

defineOptions({
  name: 'ErpNextMappingSearch'
});

const model = defineModel<Api.ErpNextMapping.QueryParams>({ required: true });

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();
</script>

<template>
  <NSpace align="center" wrap>
    <NSelect
      v-model:value="model.type"
      clearable
      :options="erpNextMappingTypeOptions"
      placeholder="请选择映射类型"
      class="w-200px"
    />
    <NInput v-model:value="model.sourceKey" clearable placeholder="请输入源值" class="w-220px" />
    <NButton type="primary" @click="emit('search')">
      {{ $t('common.search') }}
    </NButton>
    <NButton @click="emit('reset')">
      {{ $t('common.reset') }}
    </NButton>
  </NSpace>
</template>
