<script setup lang="ts">
import { NButton, NInput, NSpace } from 'naive-ui';

defineOptions({
  name: 'ProductCodeSearch'
});

const model = defineModel<Api.ProductCode.QueryParams>({ required: true });

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
      v-model:value="model.productCode"
      clearable
      :placeholder="$t('page.ui.enterProductCode')"
      class="w-200px"
    />
    <NInput
      v-model:value="model.productType"
      clearable
      :placeholder="$t('page.ui.enterProductType')"
      class="w-200px"
    />
    <NInput
      v-model:value="model.productName"
      clearable
      :placeholder="$t('page.ui.enterProductName')"
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
