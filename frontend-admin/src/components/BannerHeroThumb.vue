<template>
  <div class="hero-thumb" title="全球臻品主题轮播">
    <div class="hero-thumb-bg" />
    <div class="hero-thumb-line" />
    <p class="hero-thumb-badge">PREMIUM</p>
    <p class="hero-thumb-title">全球臻品</p>
  </div>
</template>

<style scoped>
.hero-thumb {
  position: relative;
  width: 120px;
  height: 48px;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid rgba(201, 169, 98, 0.28);
  background: linear-gradient(145deg, #1a1410, #120e0b);
}

.hero-thumb-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 20%, rgba(232, 213, 163, 0.18), transparent 60%);
}

.hero-thumb-line {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #c9a962, transparent);
}

.hero-thumb-badge {
  position: relative;
  z-index: 1;
  margin: 6px 0 0;
  font-size: 6px;
  letter-spacing: 0.18em;
  text-align: center;
  color: #c9a962;
}

.hero-thumb-title {
  position: relative;
  z-index: 1;
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-align: center;
  color: #f5f3ef;
}
</style>
