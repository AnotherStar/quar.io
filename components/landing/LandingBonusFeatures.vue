<script setup lang="ts">
import type { LandingFeature } from './content'

defineProps<{
  features: LandingFeature[]
}>()
</script>

<template>
  <section class="border-y border-hairline bg-surface-soft">
    <div class="container-page py-section-lg">
      <div class="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
        <LandingSectionHeading
          eyebrow="Что получается бонусом"
          title="Одна QR-точка закрывает инструкцию, поддержку, аналитику и повторную покупку."
          copy="Эти фичи стоит показывать после главного сценария: они усиливают ценность продукта, но не размывают первое обещание."
        />

        <div class="grid gap-md md:grid-cols-3 lg:grid-cols-1">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="rounded-lg bg-canvas p-lg shadow-subtle"
          >
            <div class="flex items-start gap-3">
              <Icon :name="feature.icon" class="mt-1 h-5 w-5 shrink-0 text-navy opacity-50" />
              <div>
                <h3 class="text-h4 text-navy">{{ feature.title }}</h3>
                <p class="mt-2 text-body-sm text-slate">{{ feature.copy }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
