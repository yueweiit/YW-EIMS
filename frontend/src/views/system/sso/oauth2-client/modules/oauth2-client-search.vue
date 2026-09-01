<script setup lang="ts">
import { ref } from 'vue';
import { $t } from '@/locales';

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
    <NInput v-model:value="name" :placeholder="$t('page.ui.appName')" clearable style="width: 200px" @keyup.enter="handleSearch" />
    <NButton type="primary" @click="handleSearch">{{ $t('common.search') }}</NButton>
    <NButton @click="handleReset">{{ $t('common.reset') }}</NButton>
  </NSpace>
</template>

<style scoped></style>
