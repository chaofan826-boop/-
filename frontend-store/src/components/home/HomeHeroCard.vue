<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'section' | 'banner'
  }>(),
  {
    variant: 'section',
  },
)
</script>

<template>
  <div class="hero-card" :class="`hero-card--${variant}`">
    <div class="hero-bg" aria-hidden="true" />
    <div class="hero-line" aria-hidden="true" />
    <div class="hero-content">
      <p class="hero-badge">PREMIUM COLLECTION</p>
      <h1>
        <span class="hero-title-main">全球臻品</span>
        <span class="hero-title-sub">尊享跨境购物体验</span>
      </h1>
      <p class="hero-desc">甄选全球好物 · 品质臻选 · 尊享直邮</p>
      <div class="hero-stats">
        <div class="stat">
          <span class="stat-num">50+</span>
          <span class="stat-label">国家直邮</span>
        </div>
        <div class="stat-divider" />
        <div class="stat">
          <span class="stat-num">24h</span>
          <span class="stat-label">极速发货</span>
        </div>
        <div class="stat-divider" />
        <div class="stat">
          <span class="stat-num">100%</span>
          <span class="stat-label">正品保障</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(201, 169, 98, 0.16);
  background: linear-gradient(145deg, rgba(26, 20, 16, 0.88), rgba(18, 14, 11, 0.92));
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.hero-card--section {
  border-radius: var(--cb-radius-lg);
  padding: 72px 32px;
}

.hero-card--banner {
  width: 100%;
  height: 100%;
  border-radius: 0;
  border: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  background: linear-gradient(145deg, rgba(26, 20, 16, 0.96), rgba(18, 14, 11, 0.98));
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 72% 78% at 78% 18%, rgba(232, 213, 163, 0.09), transparent 56%),
    radial-gradient(ellipse 52% 58% at 12% 88%, rgba(120, 72, 56, 0.11), transparent 52%),
    radial-gradient(ellipse 58% 48% at 50% 100%, rgba(168, 120, 80, 0.07), transparent 54%);
  pointer-events: none;
}

.hero-line {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cb-accent), transparent);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  width: 100%;
}

.hero-badge {
  font-family: var(--cb-font-body);
  font-size: 11px;
  letter-spacing: 0.35em;
  color: var(--cb-accent);
  margin-bottom: 20px;
  text-transform: uppercase;
}

.hero-card--banner .hero-badge {
  margin-bottom: 14px;
}

.hero-card h1 {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 16px;
}

.hero-card--banner h1 {
  margin-bottom: 12px;
}

.hero-title-main {
  font-family: var(--cb-font-display);
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.hero-card--banner .hero-title-main {
  font-size: clamp(1.75rem, 4vw, 2.6rem);
}

.hero-title-sub {
  font-family: var(--cb-font-display);
  font-size: clamp(1rem, 2.5vw, 1.4rem);
  font-weight: 500;
  font-style: italic;
  color: var(--cb-gold-light);
  letter-spacing: 0.2em;
}

.hero-card--banner .hero-title-sub {
  font-size: clamp(0.95rem, 2vw, 1.2rem);
}

.hero-desc {
  color: var(--cb-text-dim);
  font-size: 15px;
  letter-spacing: 0.12em;
  margin: 0 0 36px;
}

.hero-card--banner .hero-desc {
  margin-bottom: 24px;
  font-size: 14px;
}

.hero-stats {
  display: inline-flex;
  align-items: center;
  gap: 32px;
  padding: 20px 40px;
  background: rgba(22, 17, 14, 0.52);
  border: 1px solid rgba(201, 169, 98, 0.14);
  border-radius: var(--cb-radius-lg);
}

.hero-card--banner .hero-stats {
  gap: 24px;
  padding: 16px 32px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.stat-num {
  font-family: var(--cb-font-display);
  font-size: 26px;
  font-weight: 600;
  color: var(--cb-accent);
}

.hero-card--banner .stat-num {
  font-size: 22px;
}

.stat-label {
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-text-muted);
  text-transform: uppercase;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--cb-border);
}

.hero-card--banner .stat-divider {
  height: 30px;
}

@media (max-width: 768px) {
  .hero-card--section {
    padding: 48px 20px;
  }

  .hero-card--banner {
    padding: 32px 20px;
  }

  .hero-stats {
    gap: 20px;
    padding: 16px 24px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .stat-divider {
    display: none;
  }
}
</style>
