<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, useTemplateRef, watch} from "vue";
import {useSpecificTooltip} from "../composables/useTooltip.ts";

const props = defineProps<{
  name: string;
  loading: boolean;
  x: number;
  y: number;
  content: string;
}>()
defineEmits<{
  (e: 'enter-tooltip', p: any): void;
  (e: 'leave-tooltip', p: any): void;
}>()

const {
  container: _c,
  ref: _r
} = useSpecificTooltip(props.name);

const tooltipContainer = useTemplateRef<HTMLElement>('tooltipContainer');
const tooltipRef = useTemplateRef<HTMLElement>('tooltipRef');

const top = computed(() => `${props.y}px`);
const left = computed(() => `${props.x}px`);
const backgroundColor = computed(
    () => props.loading ? 'white' : 'transparent');
const padding = computed(() => props.loading ? '4px' : 0);

watch([tooltipContainer, tooltipRef], () => {
  if (tooltipContainer.value && tooltipRef.value)
    _c.value = tooltipContainer.value;
    _r.value = tooltipRef.value;
})

onMounted(() => {
  const container = window.document.querySelector<HTMLElement>('#ibo-main-content');
  if (container) {
    container.style.overflowY = 'hidden';
  }
})
onBeforeUnmount(() => {
  const container = window.document.querySelector<HTMLElement>('#ibo-main-content');
  if (container) {
    container.style.overflowY = 'auto';
  }
})
</script>

<template>
  <div
      ref="tooltipRef"
      class="tooltip"
      :style="{top, left, backgroundColor, padding}"
      @mouseenter="$emit('enter-tooltip', $event)"
      @mouseleave="$emit('leave-tooltip', $event)"
      @mousedown.stop
  >
    <div v-if="loading" class="tooltip-loader">Chargement...</div>
    <div v-else ref="tooltipContainer" v-html="content"></div>
  </div>
</template>

<style scoped>
.tooltip {
  top: v-bind(top);
  left: v-bind(left);
  background-color: v-bind(backgroundColor);
  padding: v-bind(padding);
}
</style>