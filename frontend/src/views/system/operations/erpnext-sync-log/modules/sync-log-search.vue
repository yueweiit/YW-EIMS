<script setup lang="ts">
import { NButton, NInput, NSelect, NSpace } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'SyncLogSearch'
});

const model = defineModel<Api.ErpNextSyncLog.QueryParams>({ required: true });

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();

const entityTypeOptions = [
  { label: '模具', value: 'MOLD' },
  { label: '产品', value: 'PRODUCT' },
  { label: '物料', value: 'MATERIAL' }
];

const statusOptions = [
  { label: '进行中', value: 'PENDING' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
  { label: '已跳过', value: 'SKIPPED' }
];
</script>

<template>
  <NSpace align="center" wrap>
    <NInput v-model:value="model.entityCode" clearable placeholder="请输入编码" class="w-200px" />
    <NSelect
      v-model:value="model.entityType"
      clearable
      :options="entityTypeOptions"
      placeholder="实体类型"
      class="w-150px"
    />
    <NSelect
      v-model:value="model.status"
      clearable
      :options="statusOptions"
      placeholder="状态"
      class="w-150px"
    />
    <NButton type="primary" @click="emit('search')">
      {{ $t('common.search') }}
    </NButton>
    <NButton @click="emit('reset')">
      {{ $t('common.reset') }}
    </NButton>
  </NSpace>
</template>
