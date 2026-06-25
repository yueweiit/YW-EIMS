<script setup lang="ts">
import { NButton, NInput, NSpace } from 'naive-ui';

defineOptions({
  name: 'ProductSearch'
});

const model = defineModel<Api.Product.QueryParams>({ required: true });

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
      v-model:value="model.productType"
      clearable
      placeholder="请输入产品类型"
      class="w-200px"
    />
    <NInput
      v-model:value="model.phoneShortName"
      clearable
      placeholder="请输入手机简称"
      class="w-200px"
    />
    <NInput
      v-model:value="model.itemCode"
      clearable
      placeholder="请输入项目编码"
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
