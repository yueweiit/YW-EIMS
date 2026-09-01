<script setup lang="ts">
defineOptions({
  name: 'OAuth2BindingSearch'
});

interface Props {
  modelValue: {
    current: number;
    size: number;
    ssoUserId?: number;
    clientId?: string;
  };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: Props['modelValue']): void;
  (e: 'search'): void;
  (e: 'reset'): void;
}>();

function updateField(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function handleReset() {
  emit('update:modelValue', {
    ...props.modelValue,
    ssoUserId: undefined,
    clientId: undefined
  });
  emit('reset');
}
</script>

<template>
  <NSpace :size="16" wrap>
    <NInput
      :value="modelValue.clientId"
      placeholder="应用 Client ID"
      clearable
      style="width: 200px"
      @update:value="val => updateField('clientId', val)"
      @keyup.enter="emit('search')"
    />
    <NButton type="primary" @click="emit('search')">搜索</NButton>
    <NButton @click="handleReset">重置</NButton>
  </NSpace>
</template>
