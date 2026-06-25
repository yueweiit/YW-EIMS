<script setup lang="ts">
import { NButton, NInput, NSpace } from 'naive-ui';

defineOptions({
  name: 'PhoneModelSearch'
});

const model = defineModel<Api.PhoneModel.QueryParams>({ required: true });

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
      v-model:value="model.phoneName"
      clearable
      placeholder="请输入手机名称"
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
