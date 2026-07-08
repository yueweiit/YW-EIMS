<script setup lang="ts">
import HeaderBanner from './modules/header-banner.vue';
import QuickNav from './modules/quick-nav.vue';
import ExternalNav from './modules/external-nav.vue';
</script>

<template>
  <NSpace vertical :size="16">
    <HeaderBanner />
    <NCard :bordered="false" class="card-wrapper">
      <QuickNav />
    </NCard>
    <NCard :bordered="false" class="card-wrapper">
      <ExternalNav />
    </NCard>
  </NSpace>
</template>

<style scoped></style>
