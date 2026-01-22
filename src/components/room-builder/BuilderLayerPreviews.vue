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
      <div class="preview-header">
        <span class="preview-index">{{ index + 1 }}</span>
        <div class="preview-title" :title="layer.name">{{ layer.name }}</div>
      </div>
      <div class="mini-map-container">
        <svg
          :viewBox="props.getWallBoundingBox(layer.walls)
            ? `${props.getWallBoundingBox(layer.walls)!.minX - 20} ${props.getWallBoundingBox(layer.walls)!.minY - 20} ${props.getWallBoundingBox(layer.walls)!.width + 40} ${props.getWallBoundingBox(layer.walls)!.height + 40}`
            : '0 0 100 100'"
          class="mini-map"
        >
          <polygon
            v-if="layer.walls?.length > 2"
            :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
            fill="rgba(255,255,255,0.05)"
            stroke="#666"
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
            stroke="#e74c3c"
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
              stroke="#3498db"
              stroke-width="2"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </g>

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
  </div>
</template>

<style scoped>
.layer-previews {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: row;
  gap: 12px;
  z-index: 20;
  pointer-events: none;
  padding: 8px;
}

.layer-preview-card {
  width: 140px;
  background: #2c3e50;
  border: 1px solid #1a252f;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.layer-preview-card:hover {
  border-color: #3498db;
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.layer-preview-card.active {
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.4), 0 8px 24px rgba(0, 0, 0, 0.5);
  transform: translateY(-4px) scale(1.02);
}

.layer-preview-card.active .preview-header {
  background: rgba(52, 152, 219, 0.2);
}

.layer-preview-card.active .preview-index {
  background: #2ecc71;
  box-shadow: 0 0 8px rgba(46, 204, 113, 0.4);
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.preview-index {
  font-size: 10px;
  font-weight: bold;
  background: #3498db;
  color: white;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.preview-title {
  font-size: 11px;
  font-weight: 600;
  color: #ecf0f1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.mini-map-container {
  padding: 4px;
  background: #1a252f;
}

.mini-map {
  width: 100%;
  height: 80px;
  background: #1e2a36;
  border-radius: 2px;
  display: block;
}

.mini-map-viewport {
  fill: rgba(52, 152, 219, 0.15);
  stroke: rgba(52, 152, 219, 0.6);
  stroke-width: 1.5;
  pointer-events: none;
}
</style>
