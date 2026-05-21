<script setup lang="ts">
import type { Component as PluginComponent } from '@nookapp/protocol';

defineProps<{ node: PluginComponent }>();
const emit = defineEmits<{
  action: [actionId: string];
  change: [id: string, value: unknown];
}>();

function flexDirection(d?: 'row' | 'col'): string {
  return d === 'row' ? 'row' : 'column';
}
function flexAlign(a?: 'start' | 'center' | 'end'): string {
  if (a === 'center') return 'center';
  if (a === 'end') return 'flex-end';
  return 'flex-start';
}
</script>

<template>
  <p
    v-if="node.type === 'text'"
    :class="{
      'text-base font-semibold': node.variant === 'heading',
      'text-sm font-medium': node.variant === 'subheading',
      'text-xs': node.variant === 'caption',
      'text-sm': !node.variant || node.variant === 'body',
    }"
    :style="
      node.variant === 'muted' || node.variant === 'caption'
        ? { color: 'rgba(255, 255, 255, 0.55)' }
        : { color: 'rgba(255, 255, 255, 0.92)' }
    "
  >
    {{ node.content }}
  </p>

  <img
    v-else-if="node.type === 'image'"
    :src="node.url"
    :alt="node.alt"
    :width="node.width"
    :height="node.height"
    class="rounded"
  />

  <hr v-else-if="node.type === 'divider'" style="border-color: rgba(255, 255, 255, 0.1)" />

  <a
    v-else-if="node.type === 'link'"
    :href="node.url"
    target="_blank"
    rel="noopener noreferrer"
    class="text-sm underline"
    style="color: rgb(129, 140, 248)"
  >
    {{ node.label }}
  </a>

  <button
    v-else-if="node.type === 'button'"
    type="button"
    class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
    :style="
      node.style === 'danger'
        ? { background: 'rgb(239, 68, 68)', color: 'white' }
        : node.style === 'secondary'
          ? { background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.9)' }
          : node.style === 'ghost'
            ? { background: 'transparent', color: 'rgba(255, 255, 255, 0.7)' }
            : { background: 'rgba(99, 102, 241, 0.9)', color: 'white' }
    "
    :disabled="node.disabled"
    @click="emit('action', node.actionId)"
  >
    {{ node.label }}
  </button>

  <div v-else-if="node.type === 'input'" class="space-y-1.5">
    <label
      v-if="node.label"
      class="block text-xs font-medium"
      style="color: rgba(255, 255, 255, 0.6)"
    >
      {{ node.label }}
    </label>
    <textarea
      v-if="node.inputType === 'textarea'"
      :placeholder="node.placeholder"
      :required="node.required"
      :value="node.defaultValue ?? ''"
      class="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
      style="
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.95);
      "
      rows="3"
      @input="emit('change', node.id, ($event.target as HTMLTextAreaElement).value)"
    />
    <input
      v-else
      :type="node.inputType ?? 'text'"
      :placeholder="node.placeholder"
      :required="node.required"
      :value="node.defaultValue ?? ''"
      class="w-full px-3 py-2 rounded-lg text-sm outline-none"
      style="
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.95);
      "
      @input="emit('change', node.id, ($event.target as HTMLInputElement).value)"
    />
  </div>

  <div v-else-if="node.type === 'select'" class="space-y-1.5">
    <label
      v-if="node.label"
      class="block text-xs font-medium"
      style="color: rgba(255, 255, 255, 0.6)"
    >
      {{ node.label }}
    </label>
    <select
      :required="node.required"
      :value="node.defaultValue ?? ''"
      class="w-full px-3 py-2 rounded-lg text-sm outline-none"
      style="
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.95);
      "
      @change="emit('change', node.id, ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="node.placeholder" value="" disabled>{{ node.placeholder }}</option>
      <option v-for="opt in node.options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
  </div>

  <div
    v-else-if="node.type === 'container'"
    class="flex"
    :style="`flex-direction: ${flexDirection(node.direction)}; gap: ${node.gap ?? 12}px; align-items: ${flexAlign(node.align)};`"
  >
    <PluginComponentRenderer
      v-for="(child, i) in node.children"
      :key="i"
      :node="child"
      @action="(id) => emit('action', id)"
      @change="(id, v) => emit('change', id, v)"
    />
  </div>

  <div
    v-else-if="node.type === 'card'"
    class="rounded-lg p-3 space-y-2"
    style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06)"
  >
    <h4 v-if="node.title" class="text-sm font-semibold" style="color: rgba(255, 255, 255, 0.9)">
      {{ node.title }}
    </h4>
    <PluginComponentRenderer
      v-for="(child, i) in node.children"
      :key="i"
      :node="child"
      @action="(id) => emit('action', id)"
      @change="(id, v) => emit('change', id, v)"
    />
  </div>

  <div v-else-if="node.type === 'list'" class="flex flex-col gap-1.5">
    <PluginComponentRenderer
      v-for="(child, i) in node.children"
      :key="i"
      :node="child"
      @action="(id) => emit('action', id)"
      @change="(id, v) => emit('change', id, v)"
    />
  </div>
</template>
