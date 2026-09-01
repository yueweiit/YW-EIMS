<script setup lang="ts">
import QuickNav from './modules/quick-nav.vue';
import ExternalNav from './modules/external-nav.vue';
</script>

<template>
  <div class="home-page">
    <NCard :bordered="false" class="home-section card-wrapper">
      <QuickNav />
    </NCard>
    <NCard :bordered="false" class="home-section card-wrapper">
      <ExternalNav />
    </NCard>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.home-section {
  overflow: hidden;
}
</style>
