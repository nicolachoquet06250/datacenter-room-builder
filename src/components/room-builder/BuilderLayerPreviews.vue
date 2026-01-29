<script lang="ts">
type Props = {
  layers: Layer[];
  viewportRect: Point & Size;
  rackWidth: number;
  rackHeight: number;
  isDrawingWalls: boolean;
  wallPreviewPoint: Point | null;
  isDrawingCircuit: boolean;
  circuitPreviewPoint: Point | null;
}
</script>

<script setup lang="ts">
import {inject} from "vue";
import {type ExposedFunctions, exposedFunctions} from "../RoomBuilder.vue";

defineProps<Props>();

const currentLayerIndex = defineModel<number>('currentLayerIndex');

const {
  getWallBoundingBox,
  getPodBoundaries
} = inject<ExposedFunctions>(exposedFunctions, {} as ExposedFunctions);
</script>

<template>
  <div v-if="layers.length > 0" class="layer-previews">
    <div
      v-for="(layer, index) in layers"
      :key="`preview-${layer.id}`"
      class="layer-preview-card"
      :class="{ active: currentLayerIndex === index }"
      @click="currentLayerIndex = index"
    >
      <div class="preview-header">
        <div class="preview-index-badge">{{ index + 1 }}</div>
        <div class="preview-title" :title="layer.name">{{ layer.name }}</div>
        <div v-if="currentLayerIndex === index" class="active-indicator"></div>
      </div>
      <div class="mini-map-container">
        <svg
          :viewBox="getWallBoundingBox(layer.walls)
            ? `${getWallBoundingBox(layer.walls)!.minX - 40} ${getWallBoundingBox(layer.walls)!.minY - 40} ${getWallBoundingBox(layer.walls)!.width + 80} ${getWallBoundingBox(layer.walls)!.height + 80}`
            : '0 0 100 100'"
          class="mini-map"
        >
          <polygon
            v-if="(!isDrawingWalls || currentLayerIndex !== index) && layer.walls?.length > 2"
            :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <polyline
            v-else-if="layer.walls?.length > 0"
            :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            stroke-width="2"
            stroke-linejoin="round"
          />

          <!-- Mur d'aperçu lors du dessin -->
          <line
            v-if="isDrawingWalls && currentLayerIndex === index && layer.walls?.length > 0 && wallPreviewPoint"
            :x1="layer.walls[layer.walls.length - 1]?.x"
            :y1="layer.walls[layer.walls.length - 1]?.y"
            :x2="wallPreviewPoint.x"
            :y2="wallPreviewPoint.y"
            stroke="rgba(255, 255, 255, 0.4)"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <line
            v-if="isDrawingWalls && currentLayerIndex === index && layer.walls?.length > 2 && wallPreviewPoint"
            :x1="wallPreviewPoint.x"
            :y1="wallPreviewPoint.y"
            :x2="layer.walls[0]?.x"
            :y2="layer.walls[0]?.y"
            stroke="rgba(255, 255, 255, 0.1)"
            stroke-width="1"
            stroke-dasharray="2,2"
          />

          <g v-for="footprint in layer.footprints" :key="`preview-footprint-${footprint.id}`">
            <rect
              v-for="(unit, uIdx) in footprint.units"
              :key="`preview-footprint-unit-${footprint.id}-${uIdx}`"
              :x="unit.x"
              :y="unit.y"
              :width="20"
              :height="20"
              :fill="footprint.color"
              fill-opacity="0.3"
            />
          </g>

          <g v-for="(rack, tIdx) in layer.racks" :key="`preview-rack-${tIdx}`">
            <rect
              :x="rack.x"
              :y="rack.y"
              :width="rackWidth"
              :height="rackHeight"
              fill="#004a99"
              fill-opacity="0.6"
              stroke="rgba(255, 255, 255, 0.4)"
              stroke-width="1"
              :transform="`rotate(${rack?.rotation || 0}, ${rack.x + rackWidth / 2}, ${rack.y + rackHeight / 2})`"
            />
          </g>

          <rect
            v-for="pod in getPodBoundaries(layer.racks, layer.pods)"
            :key="`preview-pod-${pod!.id}`"
            :x="pod!.x"
            :y="pod!.y"
            :width="pod!.width"
            :height="pod!.height"
            fill="none"
            stroke="#ff4d4f"
            stroke-width="1.5"
            stroke-dasharray="3, 3"
          />

          <!-- Circuits Électriques -->
          <g v-if="layer.circuits?.length">
            <polyline
              v-for="(circuit, circuitIdx) in layer.circuits"
              :key="`preview-circuit-${layer.id}-${circuitIdx}`"
              :points="circuit.map(p => `${p.x},${p.y}`).join(' ')"
              fill="none"
              stroke="#3498db"
              stroke-width="3"
              stroke-linejoin="round"
              stroke-linecap="round"
              opacity="0.8"
            />
          </g>
          
          <!-- Poteaux -->
          <g v-if="layer.pillars?.length">
            <rect
              v-for="(pillar, pIdx) in layer.pillars"
              :key="`preview-pillar-${layer.id}-${pIdx}`"
              :x="pillar.x - 10"
              :y="pillar.y - 10"
              :width="20"
              :height="20"
              fill="#333"
              opacity="0.8"
            />
          </g>

          <rect
            :x="viewportRect.x"
            :y="viewportRect.y"
            :width="viewportRect.width"
            :height="viewportRect.height"
            class="mini-map-viewport"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-previews {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: row;
  gap: 16px;
  z-index: 100;
  pointer-events: none;
  padding: 8px;
}

.layer-preview-card {
  width: 160px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.layer-preview-card:hover {
  border-color: #475569;
  transform: translateY(-6px);
  box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.3);
}

.layer-preview-card.active {
  border-color: #004a99;
  border-width: 2px;
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

.preview-index-badge {
  font-size: 10px;
  font-weight: 800;
  background: #334155;
  color: #94a3b8;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.layer-preview-card.active .preview-index-badge {
  background: #004a99;
  color: white;
}

.preview-title {
  font-size: 11px;
  font-weight: 700;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.layer-preview-card.active .preview-title {
  color: white;
}

.active-indicator {
  width: 6px;
  height: 6px;
  background-color: #2ecc71;
  border-radius: 50%;
  box-shadow: 0 0 8px #2ecc71;
}

.mini-map-container {
  padding: 6px;
  background: #0f172a;
}

.mini-map {
  width: 100%;
  height: 90px;
  background: #1e293b;
  border-radius: 6px;
  display: block;
}

.mini-map-viewport {
  fill: rgba(0, 74, 153, 0.1);
  stroke: #004a99;
  stroke-width: 2;
  stroke-dasharray: none;
  pointer-events: none;
}
</style>
