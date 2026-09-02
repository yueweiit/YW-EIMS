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
      :placeholder="$t('page.ui.enterProductType')"
      class="w-200px"
    />
    <NInput
      v-model:value="model.phoneShortName"
      clearable
      :placeholder="$t('page.ui.enterPhoneShortName')"
      class="w-200px"
    />
    <NInput
      v-model:value="model.itemCode"
      clearable
      :placeholder="$t('page.ui.enterProjectCode')"
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
