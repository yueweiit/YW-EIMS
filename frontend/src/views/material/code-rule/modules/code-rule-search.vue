<script setup lang="ts">
import { NButton, NInput, NSpace } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'CodeRuleSearch'
});

const model = defineModel<Api.CodeRule.QueryParams>({ required: true });

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
      v-model:value="model.codePrefix"
      clearable
      placeholder="请输入编码前缀"
      class="w-200px"
    />
    <NInput
      v-model:value="model.explainContent"
      clearable
      placeholder="请输入前缀说明"
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
