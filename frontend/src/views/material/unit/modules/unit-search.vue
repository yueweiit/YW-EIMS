<script setup lang="ts">
import { NButton, NInput, NSpace } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'UnitSearch'
});

const model = defineModel<Api.Unit.QueryParams>({ required: true });

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();

function search() {
  emit('search');
}

function reset() {
  emit('reset');
}
</script>

<template>
  <NSpace align="center" wrap>
    <NInput
      v-model:value="model.unitCode"
      clearable
      placeholder="请输入单位编码"
      class="w-200px"
    />
    <NInput
      v-model:value="model.unit"
      clearable
      placeholder="请输入单位名称"
      class="w-200px"
    />
    <NButton type="primary" @click="search">
      {{ $t('common.search') }}
    </NButton>
    <NButton @click="reset">
      {{ $t('common.reset') }}
    </NButton>
  </NSpace>
</template>

<style scoped></style>
