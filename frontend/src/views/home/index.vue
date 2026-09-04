<script setup lang="ts">
import ExternalNav from './modules/external-nav.vue';

defineOptions({
  name: 'HomePage'
});
</script>

<template>
  <div class="home-page">
    <ExternalNav />
  </div>
</template>

<style scoped>
.home-page {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: calc(100% + 32px);
  margin: -16px;
  padding: clamp(16px, 2.4vw, 34px);
  padding-bottom: calc(clamp(16px, 2.4vw, 34px) + var(--soy-footer-height, 48px) + 32px);
  overflow: visible;
  background: var(--eims-canvas);
}

:global(html.dark) .home-page {
  background: var(--eims-canvas);
}

@media (max-width: 639px) {
  .home-page {
    min-height: calc(100% + 32px);
    padding: 16px;
    padding-bottom: calc(16px + var(--soy-footer-height, 48px) + 24px);
  }
}
</style>
