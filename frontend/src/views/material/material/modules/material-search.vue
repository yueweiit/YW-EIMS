<script setup lang="ts">
import { NButton, NInput, NSpace } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'MaterialSearch'
});

const model = defineModel<Api.Material.QueryParams>({ required: true });

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
      v-model:value="model.applicant"
      clearable
      :placeholder="$t('page.ui.enterApplicant')"
      class="w-200px"
    />
    <NInput
      v-model:value="model.materialName"
      clearable
      :placeholder="$t('page.ui.enterMaterialName')"
      class="w-200px"
    />
    <NInput
      v-model:value="model.code"
      clearable
      :placeholder="$t('page.ui.enterMaterialCode')"
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
