<script setup lang="ts">
import { NButton, NInput, NSpace } from 'naive-ui';

defineOptions({
  name: 'MoldMaterialSearch'
});

const model = defineModel<Api.MoldMaterial.QueryParams>({ required: true });

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
      v-model:value="model.typeCode"
      clearable
      :placeholder="$t('page.ui.enterMaterialTypeCode')"
      class="w-200px"
    />
    <NInput
      v-model:value="model.typeName"
      clearable
      :placeholder="$t('page.ui.enterMaterialTypeName')"
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
