<script setup lang="ts">
import { ref } from 'vue';

defineOptions({
  name: 'OAuth2ClientSearch'
});

interface Props {
  modelValue: {
    name?: string;
  };
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'search'): void;
  (e: 'reset'): void;
  (e: 'update:modelValue', value: { name?: string }): void;
}>();

const name = ref('');

function handleSearch() {
  emit('update:modelValue', { name: name.value || undefined });
  emit('search');
}

function handleReset() {
  name.value = '';
  emit('update:modelValue', {});
  emit('reset');
}
</script>

<template>
  <NSpace wrap>
    <NInput v-model:value="name" placeholder="应用名称" clearable style="width: 200px" @keyup.enter="handleSearch" />
    <NButton type="primary" @click="handleSearch">搜索</NButton>
    <NButton @click="handleReset">重置</NButton>
  </NSpace>
</template>

<style scoped></style>
