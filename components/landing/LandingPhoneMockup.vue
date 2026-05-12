<template>
  <div class="landing-phone">
    <div class="landing-phone__speaker" />
    <div class="landing-phone__screen">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.landing-phone {
  position: relative;
  width: min(400px, 82vw);
  aspect-ratio: 9 / 18.5;
  padding: 10px;
  border: 5px solid var(--color-brand-yellow);
  border-radius: 44px;
  background: #111;
  box-shadow: 0 24px 56px rgb(16 24 40 / 18%), 0 8px 18px rgb(16 24 40 / 10%);
  height: max(400px, 82vh);
}

.landing-phone__speaker {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 2;
  width: 24px;
  height: 24px;
  border-radius: 16px;
  background: #111;
}

.landing-phone__screen {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 30px;
  background: white;
  border: 2px solid white;
  position: relative;
}

.landing-phone__screen::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 25%;
  height: 100%;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
  transform: skew(10deg);
  pointer-events: none;
}
</style>
