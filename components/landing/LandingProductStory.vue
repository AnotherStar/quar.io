<script setup lang="ts">
import type { LandingStorySlide } from './content'

defineProps<{
  slides: LandingStorySlide[]
}>()
</script>

<template>
  <section id="features" class="container-page py-section-lg">
    <LandingSectionHeading
      eyebrow="Как это работает"
      title="Пять слайдов продукта: от старого PDF до прямой продажи после покупки."
    />

    <div class="mt-section space-y-lg">
      <article
        v-for="slide in slides"
        :key="slide.title"
        class="grid gap-lg rounded-lg bg-surface p-lg md:grid-cols-[0.95fr_1.05fr] md:p-2xl"
      >
        <div>
          <div class="flex items-center gap-3">
            <Icon :name="slide.icon" class="h-5 w-5 text-navy opacity-50" />
            <p class="text-caption-bold uppercase text-steel">{{ slide.eyebrow }}</p>
          </div>
          <h3 class="mt-3 text-h3 text-navy">{{ slide.title }}</h3>
          <p class="mt-3 text-body text-slate">{{ slide.copy }}</p>
          <LandingCheckList :items="slide.points" class="mt-lg" />
        </div>

        <LandingMockupFrame title="плейсхолдер скриншота">
          <div class="grid min-h-[240px] place-items-center bg-canvas p-lg text-center">
            <p class="max-w-md text-body-sm-md text-charcoal">{{ slide.screen }}</p>
          </div>
        </LandingMockupFrame>
      </article>
    </div>
  </section>
</template>
