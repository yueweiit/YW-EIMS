<script setup lang="ts">
import { NButton, NInput, NSelect, NSpace } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'UserSearch'
});

const model = defineModel<Api.User.QueryParams>({ required: true });

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();

const statusOptions = [
  { label: '启用', value: '1' },
  { label: '禁用', value: '2' }
];

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
      v-model:value="model.userName"
      clearable
      :placeholder="$t('page.login.common.userNamePlaceholder')"
      class="w-200px"
    />
    <NSelect
      v-model:value="model.status"
      clearable
      :options="statusOptions"
      placeholder="请选择状态"
      class="w-160px"
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
