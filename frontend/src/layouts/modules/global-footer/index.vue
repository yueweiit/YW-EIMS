<script setup lang="ts">
import { $t } from '@/locales';

defineOptions({
  name: 'GlobalFooter'
});
</script>

<template>
  <DarkModeContainer class="h-full flex-center">
    <a href="#" target="_blank" rel="noopener noreferrer">
      Copyright © 2026 {{ $t('system.title') }}
    </a>
  </DarkModeContainer>
</template>

<style scoped></style>
