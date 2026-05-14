<script setup lang="ts">
// Глобальный рендер тостов из useToast(). Монтируется один раз в
// layouts/dashboard.vue. Тосты складываются в правый нижний угол, по тапу
// на крестик закрываются, по таймеру — автоматически (если durationMs > 0).
import type { ToastItem } from '~~/composables/useToast'

const { items, dismiss } = useToast()

// Активные таймеры автозакрытия — храним по id, чтобы при hover-паузе
// (в будущем) можно было сбросить таймер. Сейчас просто чистим при unmount.
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleAutoDismiss(item: ToastItem) {
  if (item.durationMs <= 0) return
  if (timers.has(item.id)) return
  const t = setTimeout(() => {
    timers.delete(item.id)
    dismiss(item.id)
  }, item.durationMs)
  timers.set(item.id, t)
}

watch(
  items,
  (list) => {
    // Заводим таймеры на новые тосты.
    for (const item of list) scheduleAutoDismiss(item)
    // Чистим таймеры удалённых тостов.
    const alive = new Set(list.map((i) => i.id))
    for (const [id, t] of timers.entries()) {
      if (!alive.has(id)) {
        clearTimeout(t)
        timers.delete(id)
      }
    }
  },
  { deep: true, immediate: true }
)

onBeforeUnmount(() => {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
})

const kindIcon: Record<ToastItem['kind'], string> = {
  success: 'lucide:check-circle-2',
  error: 'lucide:alert-octagon',
  warning: 'lucide:alert-triangle',
  info: 'lucide:info'
}

function handleActionClick(item: ToastItem) {
  if (item.action?.onClick) {
    try {
      item.action.onClick()
    } catch (e) {
      console.error('[toast] action onClick crashed', e)
    }
  }
  dismiss(item.id)
}
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <div class="ui-toaster" role="region" aria-label="Уведомления">
        <TransitionGroup name="ui-toaster">
          <div
            v-for="item in items"
            :key="item.id"
            :class="['ui-toaster-item', `is-${item.kind}`]"
            role="status"
            aria-live="polite"
          >
            <Icon :name="kindIcon[item.kind]" class="ui-toaster-icon" />
            <div class="ui-toaster-body">
              <p v-if="item.title" class="ui-toaster-title">{{ item.title }}</p>
              <p class="ui-toaster-message">{{ item.message }}</p>
              <div v-if="item.action" class="ui-toaster-actions">
                <NuxtLink
                  v-if="item.action.to"
                  :to="item.action.to"
                  class="ui-toaster-action-link"
                  @click="dismiss(item.id)"
                >
                  {{ item.action.label }}
                </NuxtLink>
                <button
                  v-else
                  type="button"
                  class="ui-toaster-action-link"
                  @click="handleActionClick(item)"
                >
                  {{ item.action.label }}
                </button>
              </div>
            </div>
            <button
              type="button"
              class="ui-toaster-close"
              aria-label="Закрыть"
              @click="dismiss(item.id)"
            >
              <Icon name="lucide:x" class="h-4 w-4" />
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<style scoped>
.ui-toaster {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.ui-toaster-item {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 20px 1fr 20px;
  gap: 10px;
  align-items: start;
  padding: 12px 12px 12px 14px;
  border-radius: 12px;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  box-shadow: 0 10px 30px rgba(15, 15, 15, 0.08), 0 1px 2px rgba(15, 15, 15, 0.04);
}

.ui-toaster-icon {
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.is-success .ui-toaster-icon { color: #1f8a4c; }
.is-error   .ui-toaster-icon { color: #8a1212; }
.is-warning .ui-toaster-icon { color: #a86a00; }
.is-info    .ui-toaster-icon { color: var(--color-primary); }

.ui-toaster-body {
  min-width: 0;
}

.ui-toaster-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0 0 2px;
  line-height: 1.3;
}

.ui-toaster-message {
  font-size: 13px;
  color: var(--color-charcoal);
  margin: 0;
  line-height: 1.4;
  word-break: break-word;
}

.ui-toaster-actions {
  margin-top: 6px;
}

.ui-toaster-action-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary);
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  text-decoration: none;
}

.ui-toaster-action-link:hover {
  text-decoration: underline;
}

.ui-toaster-close {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: var(--color-steel);
  cursor: pointer;
}

.ui-toaster-close:hover {
  color: var(--color-ink);
  background: var(--color-hairline);
}

.ui-toaster-enter-active,
.ui-toaster-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.ui-toaster-enter-from,
.ui-toaster-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (prefers-reduced-motion: reduce) {
  .ui-toaster-enter-active,
  .ui-toaster-leave-active {
    transition: opacity 0.1s ease;
  }
  .ui-toaster-enter-from,
  .ui-toaster-leave-to {
    transform: none;
  }
}
</style>
