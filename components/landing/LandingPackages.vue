<script setup lang="ts">
import type { LandingPackage } from './content'

defineProps<{
  packages: LandingPackage[]
}>()
</script>

<template>
  <section class="container-page py-section-lg">
    <div class="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
      <div>
        <LandingSectionHeading
          eyebrow="Пакеты"
          title="Начните с пилота, а затем масштабируйте QR-канал на каталог."
          copy="Первый месяц нужен, чтобы проверить сценарий на реальных товарах, QR-кодах, вопросах покупателей и первых повторных продажах."
        />
        <LandingCtaButtons class="mt-6" />
      </div>

      <div class="grid gap-md md:grid-cols-3 lg:grid-cols-1">
        <div
          v-for="pack in packages"
          :key="pack.name"
          class="rounded-lg bg-surface p-lg"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex items-center gap-3">
              <Icon :name="pack.icon" class="h-5 w-5 text-navy opacity-50" />
              <h3 class="text-h4 text-navy">{{ pack.name }}</h3>
            </div>
            <p class="text-body-sm-md text-primary">{{ pack.price }}</p>
          </div>
          <p class="mt-3 text-body-sm text-slate">{{ pack.copy }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
