<script lang="ts">
type Props = {
  zoomLevel: number,
  panOffset: Point
}
</script>

<script setup lang="ts">
defineProps<Props>()
</script>

<template>
  <defs>
    <pattern id="grid" :width="20 * zoomLevel" :height="20 * zoomLevel" patternUnits="userSpaceOnUse">
      <path
          :d="`M ${20 * zoomLevel} 0 L 0 0 0 ${20 * zoomLevel}`"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          stroke-width="0.5"
      />
    </pattern>
  </defs>
  <rect
      width="100%"
      height="100%"
      fill="url(#grid)"
      class="canvas-background"
      :transform="`translate(${(panOffset.x * zoomLevel) % (20 * zoomLevel)}, ${(panOffset.y * zoomLevel) % (20 * zoomLevel)})`"
  />
</template>
