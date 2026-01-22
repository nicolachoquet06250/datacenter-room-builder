<script setup lang="ts">
const props = defineProps<{
  layers: Layer[];
  viewportRect: { x: number; y: number; width: number; height: number };
  rackWidth: number;
  rackHeight: number;
  isDrawingWalls: boolean;
  wallPreviewPoint: Point | null;
  isDrawingCircuit: boolean;
  circuitPreviewPoint: Point | null;
  getWallBoundingBox: (walls: { x: number; y: number }[]) => { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } | null;
  getPodBoundaries: (racks: Rack[], pods: { id: string; name: string }[]) => Array<{ id: string; x: number; y: number; width: number; height: number } | null>;
}>();

const currentLayerIndex = defineModel<number>('currentLayerIndex');
</script>

<template>
  <div v-if="props.layers.length > 0" class="layer-previews">
    <div
      v-for="(layer, index) in props.layers"
      :key="`preview-${layer.id}`"
      class="layer-preview-card"
      :class="{ active: currentLayerIndex === index }"
      @click="currentLayerIndex = index"
    >
      <div class="preview-title">{{ layer.name }}</div>
      <svg
        :viewBox="props.getWallBoundingBox(layer.walls)
          ? `${props.getWallBoundingBox(layer.walls)!.minX - 20} ${props.getWallBoundingBox(layer.walls)!.minY - 20} ${props.getWallBoundingBox(layer.walls)!.width + 40} ${props.getWallBoundingBox(layer.walls)!.height + 40}`
          : '0 0 100 100'"
        class="mini-map"
      >
        <polygon
          v-if="layer.walls?.length > 2"
          :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
          fill="rgba(0,0,0,0.05)"
          stroke="#333"
          stroke-width="2"
        />

        <g v-for="footprint in layer.footprints" :key="`preview-footprint-${footprint.id}`">
          <rect
            v-for="(unit, uIdx) in footprint.units"
            :key="`preview-footprint-unit-${footprint.id}-${uIdx}`"
            :x="unit.x"
            :y="unit.y"
            width="20"
            height="20"
            :fill="footprint.color"
            fill-opacity="0.4"
          />
        </g>

        <g v-for="(rack, tIdx) in layer.racks" :key="`preview-rack-${tIdx}`">
          <rect
            :x="rack.x"
            :y="rack.y"
            :width="props.rackWidth"
            :height="props.rackHeight"
            fill="#d2b48c"
            stroke="#8b4513"
            stroke-width="1"
            :transform="`rotate(${rack?.rotation || 0}, ${rack.x + props.rackWidth / 2}, ${rack.y + props.rackHeight / 2})`"
          />
        </g>

        <rect
          v-for="pod in props.getPodBoundaries(layer.racks, layer.pods)"
          :key="`preview-pod-${pod!.id}`"
          :x="pod!.x"
          :y="pod!.y"
          :width="pod!.width"
          :height="pod!.height"
          fill="none"
          stroke="red"
          stroke-width="1"
          stroke-dasharray="2, 2"
        />

        <!-- Circuits Électriques -->
        <g v-if="layer.circuits?.length">
          <polyline
            v-for="(circuit, circuitIdx) in layer.circuits"
            :key="`preview-circuit-${layer.id}-${circuitIdx}`"
            :points="circuit.map(p => `${p.x},${p.y}`).join(' ')"
            fill="none"
            stroke="#0d6efd"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </g>

        <!-- Dessin en direct des murs -->
        <template v-if="props.isDrawingWalls && currentLayerIndex === index">
          <circle
            v-if="props.wallPreviewPoint"
            :cx="props.wallPreviewPoint.x"
            :cy="props.wallPreviewPoint.y"
            r="3"
            fill="#333"
          />
          <line
            v-if="layer.walls?.length > 0 && props.wallPreviewPoint"
            :x1="layer.walls[layer.walls.length - 1]?.x"
            :y1="layer.walls[layer.walls.length - 1]?.y"
            :x2="props.wallPreviewPoint.x"
            :y2="props.wallPreviewPoint.y"
            stroke="#333"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </template>

        <!-- Dessin en direct des circuits -->
        <template v-if="index === 0 && currentLayerIndex === index && props.isDrawingCircuit && props.circuitPreviewPoint">
          <circle
            :cx="props.circuitPreviewPoint.x"
            :cy="props.circuitPreviewPoint.y"
            r="2"
            fill="#0d6efd"
          />
          <line
            v-if="layer.circuits && layer.circuits.length > 0 && layer.circuits[layer.circuits.length - 1]!.length > 0"
            :x1="layer.circuits[layer.circuits.length - 1]![layer.circuits[layer.circuits.length - 1]!.length - 1]!.x"
            :y1="layer.circuits[layer.circuits.length - 1]![layer.circuits[layer.circuits.length - 1]!.length - 1]!.y"
            :x2="props.circuitPreviewPoint.x"
            :y2="props.circuitPreviewPoint.y"
            stroke="#0d6efd"
            stroke-width="1.5"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </template>

        <rect
          :x="props.viewportRect.x"
          :y="props.viewportRect.y"
          :width="props.viewportRect.width"
          :height="props.viewportRect.height"
          class="mini-map-viewport"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.layer-previews {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: row;
  gap: 10px;
  z-index: 20;
  pointer-events: none;
}

.layer-preview-card {
  width: 150px;
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 5px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.2s;
}

.layer-preview-card:hover {
  border-color: #2563eb;
  transform: scale(1.05);
}

.layer-preview-card.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.preview-title {
  font-size: 0.7rem;
  font-weight: bold;
  margin-bottom: 4px;
  color: #4b5563;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-map {
  width: 100%;
  height: 100px;
  background: #f9fafb;
  border-radius: 4px;
}

.mini-map-viewport {
  fill: rgba(100, 100, 100, 0.2);
  stroke: rgba(100, 100, 100, 0.5);
  stroke-width: 1;
  pointer-events: none;
}
</style>
