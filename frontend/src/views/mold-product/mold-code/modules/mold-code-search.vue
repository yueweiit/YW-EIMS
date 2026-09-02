<script setup lang="ts">
import { NButton, NInput, NSpace } from 'naive-ui';

defineOptions({
  name: 'MoldCodeSearch'
});

const model = defineModel<Api.MoldCode.QueryParams>({ required: true });

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
      v-model:value="model.moldCode"
      clearable
      :placeholder="$t('page.ui.enterMoldCode')"
      class="w-200px"
    />
    <NInput
      v-model:value="model.moldType"
      clearable
      :placeholder="$t('page.ui.selectMoldType')"
      class="w-200px"
    />
    <NInput
      v-model:value="model.moldName"
      clearable
      :placeholder="$t('page.ui.enterMoldName')"
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
