<script setup lang="ts">
import { NButton, NInput, NSpace } from 'naive-ui';

defineOptions({
  name: 'MoldCodeSearch'
});

const model = defineModel<Api.MoldCode.QueryParams>({ required: true });

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
      v-model:value="model.moldCode"
      clearable
      placeholder="请输入模具编码"
      class="w-200px"
    />
    <NInput
      v-model:value="model.moldType"
      clearable
      placeholder="请输入模具类型"
      class="w-200px"
    />
    <NInput
      v-model:value="model.moldName"
      clearable
      placeholder="请输入模具名称"
      class="w-200px"
    />
    <NButton type="primary" @click="search">
      搜索
    </NButton>
    <NButton @click="reset">
      重置
    </NButton>
  </NSpace>
</template>

<style scoped></style>
