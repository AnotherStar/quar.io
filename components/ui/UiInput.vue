<script setup lang="ts">
defineProps<{
  modelValue?: string | number
  label?: string
  type?: string
  placeholder?: string
  hint?: string
  error?: string
  required?: boolean
  autocomplete?: string
  disabled?: boolean
  prefix?: string
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1 block text-body-sm-md text-charcoal">
      {{ label }}<span v-if="required" class="text-error">*</span>
    </span>
    <div
      :class="[
        'flex items-stretch overflow-hidden rounded-md border bg-canvas transition-colors',
        error ? 'border-error' : 'border-hairline-strong focus-within:border-primary focus-within:border-2'
      ]"
    >
      <span v-if="prefix" class="flex items-center bg-surface px-md text-body-sm text-steel">
        {{ prefix }}
      </span>
      <input
        :value="modelValue"
        :type="type ?? 'text'"
        :placeholder="placeholder"
        :required="required"
        :autocomplete="autocomplete"
        :disabled="disabled"
        class="w-full bg-transparent px-md py-sm text-body outline-none disabled:cursor-not-allowed disabled:text-muted"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
    </div>
    <span v-if="hint && !error" class="mt-1 block text-caption text-steel">{{ hint }}</span>
    <span v-if="error" class="mt-1 block text-caption text-error">{{ error }}</span>
  </label>
</template>
