<script setup lang="ts">
import { useAuthStore } from '@/store/modules/auth';
import { $t } from '@/locales';

defineOptions({
  name: 'HeaderBanner'
});

const authStore = useAuthStore();
</script>

<template>
  <NCard :bordered="false" class="hero-card card-wrapper">
    <div class="hero-glow hero-glow-one"></div>
    <div class="hero-glow hero-glow-two"></div>
    <div class="hero-content">
      <div class="hero-kicker">YUEWEI EIMS · WORKSPACE</div>
      <div class="flex-y-center gap-14px">
        <div class="hero-avatar">
          <img src="@/assets/imgs/soybean.jpg" class="size-full object-cover" />
        </div>
        <div>
          <h3 class="hero-title">
            {{ $t('page.home.greeting', { userName: authStore.userInfo.userName }) }}
          </h3>
          <p class="hero-description">{{ $t('page.home.weatherDesc') }}</p>
        </div>
      </div>
      <div class="hero-mark">
        <SvgIcon icon="mdi:office-building-outline" class="text-70px" />
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.hero-card {
  position: relative;
  overflow: hidden;
  min-height: 148px;
  background: linear-gradient(115deg, #eef2ff 0%, #f8fbff 54%, #effcff 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 10px 12px;
}

.hero-kicker {
  margin-bottom: 16px;
  color: #6573d8;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.hero-avatar {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  overflow: hidden;
  border: 4px solid rgb(255 255 255 / 80%);
  border-radius: 22px;
  box-shadow: 0 10px 24px rgb(86 102 191 / 18%);
}

.hero-title {
  margin: 0;
  color: #20284a;
  font-size: 19px;
  font-weight: 700;
}

.hero-description {
  margin: 8px 0 0;
  color: #7c86a8;
  font-size: 13px;
}

.hero-mark {
  position: absolute;
  top: 50%;
  right: 11%;
  color: rgb(99 112 232 / 15%);
  transform: translateY(-50%);
}

.hero-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(2px);
}

.hero-glow-one {
  top: -70px;
  right: 25%;
  width: 180px;
  height: 180px;
  background: rgb(124 138 255 / 12%);
}

.hero-glow-two {
  right: -30px;
  bottom: -100px;
  width: 250px;
  height: 250px;
  background: rgb(47 203 204 / 11%);
}
</style>
