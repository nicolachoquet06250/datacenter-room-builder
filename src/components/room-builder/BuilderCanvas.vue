<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  layers: Layer[];
  currentLayerIndex: number;
  walls: Point[];
  racks: Array<Rack | string>;
  isDrawingWalls: boolean;
  wallPreviewPoint: Point | null;
  circuitPreviewPoint: Point | null;
  podBoundaries: Array<{ id: string; x: number; y: number; width: number; height: number } | null>;
  wallBoundingBox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } | null;
  horizontalCoords: Array<{ label: string; x: number; y: number }>;
  verticalCoords: Array<{ label: string; x: number; y: number }>;
  selectedRackIndices: number[];
  zoomLevel: number;
  panOffset: { x: number; y: number };
  isWallSelected: boolean;
  rackWidth: number;
  rackHeight: number;
  isInteracting: boolean;
  getPodBoundaries: (racks: Rack[], pods: { id: string; name: string }[]) => Array<{ id: string; x: number; y: number; width: number; height: number } | null>;
  selectedUnits: Point[];
}>();

const emit = defineEmits<{
  (e: 'deselect', event: MouseEvent): void;
  (e: 'mousemove-svg', event: MouseEvent): void;
  (e: 'start-drag', event: MouseEvent, index: number): void;
  (e: 'open-context-menu', event: MouseEvent, index: number): void;
  (e: 'start-rotate', event: MouseEvent, index: number): void;
  (e: 'select-pod', event: MouseEvent, podId: string): void;
  (e: 'select-wall', event: MouseEvent): void;
}>();

const svgRef = ref<SVGSVGElement | null>(null);

defineExpose({ svgRef });
</script>

<template>
  <svg
    ref="svgRef"
    width="100%"
    height="600"
    class="canvas-svg"
    :class="{ interacting: props.isInteracting, 'drawing-walls': props.isDrawingWalls }"
    @mousedown="emit('deselect', $event)"
    @mousemove="emit('mousemove-svg', $event)"
  >
    <defs>
      <pattern id="grid" :width="20 * props.zoomLevel" :height="20 * props.zoomLevel" patternUnits="userSpaceOnUse">
        <path :d="`M ${20 * props.zoomLevel} 0 L 0 0 0 ${20 * props.zoomLevel}`" fill="none" stroke="#eee" stroke-width="1" />
      </pattern>
    </defs>
    <rect
      width="100%"
      height="100%"
      fill="url(#grid)"
      class="canvas-background"
      :transform="`translate(${(props.panOffset.x * props.zoomLevel) % (20 * props.zoomLevel)}, ${(props.panOffset.y * props.zoomLevel) % (20 * props.zoomLevel)})`"
    />

    <g :transform="`scale(${props.zoomLevel}) translate(${props.panOffset.x}, ${props.panOffset.y})`">
        <g
          v-for="(layer, lIdx) in props.layers"
          :key="`layer-${layer.id}`"
          v-show="lIdx !== props.currentLayerIndex"
          class="layer-inactive"
        >
          <g v-if="lIdx === 1" class="footprints-layer">
            <g v-for="footprint in layer.footprints" :key="footprint.id">
              <rect
                v-for="(unit, uIdx) in footprint.units"
                :key="uIdx"
                :x="unit.x"
                :y="unit.y"
                :width="20"
                :height="20"
                :fill="footprint.color"
                fill-opacity="0.2"
              />
            </g>
          </g>
          <polyline
            v-if="layer.walls.length > 0"
          :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="#333"
          stroke-width="4"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <polygon
          v-if="layer.walls.length > 2"
          :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
          class="room-surface"
          stroke="#333"
          stroke-width="4"
          stroke-linejoin="round"
        />
        <polyline
          v-if="layer.circuits?.length"
          :points="layer.circuits.map(p => `${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="#0d6efd"
          stroke-width="3"
          stroke-linejoin="round"
          stroke-linecap="round"
          class="circuit-line"
        />

        <rect
          v-for="pod in props.getPodBoundaries(layer.racks, layer.pods)"
          :key="pod!.id"
          :x="pod!.x"
          :y="pod!.y"
          :width="pod!.width"
          :height="pod!.height"
          class="pod-rect"
        />

        <g v-for="(rack, tIdx) in layer.racks" :key="`rack-${tIdx}`">
          <g :transform="`rotate(${rack?.rotation || 0}, ${rack.x + props.rackWidth / 2}, ${rack.y + props.rackHeight / 2})`">
            <rect
              :x="rack.x"
              :y="rack.y"
              :width="props.rackWidth"
              :height="props.rackHeight"
              class="rack-rect"
              :class="{ grouped: rack.podId }"
            />
            <text
              :x="rack.x + props.rackWidth / 2"
              :y="rack.y + props.rackHeight / 2"
              text-anchor="middle"
              dominant-baseline="middle"
              class="rack-label"
            >{{ rack.name }}</text>
          </g>
        </g>
      </g>

      <g class="layer-active">
        <g v-if="props.currentLayerIndex === 1" class="footprints-layer">
          <g v-for="footprint in props.layers[1]?.footprints" :key="footprint.id">
            <rect
              v-for="(unit, uIdx) in footprint.units"
              :key="uIdx"
              :x="unit.x"
              :y="unit.y"
              :width="20"
              :height="20"
              :fill="footprint.color"
              fill-opacity="0.4"
              stroke="white"
              stroke-width="0.5"
            />
          </g>
          <rect
            v-for="(unit, uIdx) in props.selectedUnits"
            :key="`selected-${uIdx}`"
            :x="unit.x"
            :y="unit.y"
            :width="20"
            :height="20"
            fill="rgba(0, 123, 255, 0.4)"
            stroke="white"
            stroke-width="0.5"
          />
        </g>

        <polyline
          v-if="props.walls.length > 0"
          :points="props.walls.map(p => `${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="#333"
          stroke-width="4"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <polygon
          v-if="!props.isDrawingWalls && props.walls.length > 2"
          :points="props.walls.map(p => `${p.x},${p.y}`).join(' ')"
          class="room-surface"
          :class="{ selected: props.isWallSelected, 'layer-footprints': props.currentLayerIndex === 1 }"
          @mousedown="emit('select-wall', $event)"
          stroke="#333"
          stroke-width="4"
          stroke-linejoin="round"
        />

        <circle
          v-if="props.isDrawingWalls && props.wallPreviewPoint"
          :cx="props.wallPreviewPoint.x"
          :cy="props.wallPreviewPoint.y"
          r="4"
          fill="#333"
        />
        <line
          v-if="props.isDrawingWalls && props.walls.length > 0 && props.wallPreviewPoint"
          :x1="props.walls[props.walls.length - 1]?.x"
          :y1="props.walls[props.walls.length - 1]?.y"
          :x2="props.wallPreviewPoint.x"
          :y2="props.wallPreviewPoint.y"
          stroke="#333"
          stroke-width="4"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <line
          v-if="props.isDrawingWalls && props.walls.length > 2 && props.wallPreviewPoint"
          :x1="props.wallPreviewPoint.x"
          :y1="props.wallPreviewPoint.y"
          :x2="props.walls[0]?.x"
          :y2="props.walls[0]?.y"
          stroke="rgba(0,0,0,0.2)"
          stroke-width="2"
          stroke-dasharray="2,2"
        />
        <polyline
          v-if="props.layers[props.currentLayerIndex]?.circuits?.length"
          :points="props.layers[props.currentLayerIndex]?.circuits?.map(p => `${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="#0d6efd"
          stroke-width="3"
          stroke-linejoin="round"
          stroke-linecap="round"
          class="circuit-line"
        />
        <circle
          v-if="props.currentLayerIndex === 0 && props.circuitPreviewPoint"
          :cx="props.circuitPreviewPoint.x"
          :cy="props.circuitPreviewPoint.y"
          r="3"
          fill="#0d6efd"
        />
        <line
          v-if="props.currentLayerIndex === 0 && props.layers[props.currentLayerIndex]?.circuits?.length && props.circuitPreviewPoint"
          :x1="props.layers[props.currentLayerIndex]?.circuits?.[props.layers[props.currentLayerIndex]?.circuits?.length - 1]?.x"
          :y1="props.layers[props.currentLayerIndex]?.circuits?.[props.layers[props.currentLayerIndex]?.circuits?.length - 1]?.y"
          :x2="props.circuitPreviewPoint.x"
          :y2="props.circuitPreviewPoint.y"
          stroke="#0d6efd"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <rect
          v-for="pod in props.podBoundaries"
          :key="pod!.id"
          :x="pod!.x"
          :y="pod!.y"
          :width="pod!.width"
          :height="pod!.height"
          class="pod-rect"
          :class="{ selected: props.selectedRackIndices.length > 0 && (props.racks as Rack[])[props.selectedRackIndices[0]!]?.podId === pod!.id }"
          @mousedown="emit('select-pod', $event, pod!.id)"
        />

        <g v-if="props.wallBoundingBox" class="coordinates-labels">
          <text
            v-for="(coord, idx) in props.horizontalCoords"
            :key="`h-${idx}`"
            :x="coord.x"
            :y="coord.y"
            text-anchor="middle"
            class="coord-text"
          >{{ coord.label }}</text>
          <text
            v-for="(coord, idx) in props.verticalCoords"
            :key="`v-${idx}`"
            :x="coord.x"
            :y="coord.y"
            text-anchor="end"
            dominant-baseline="middle"
            class="coord-text"
          >{{ coord.label }}</text>
        </g>

        <g v-for="(rack, tIdx) in props.racks" :key="tIdx">
          <template v-if="typeof rack !== 'string'">
            <g :transform="`rotate(${rack?.rotation || 0}, ${rack.x + props.rackWidth / 2}, ${rack.y + props.rackHeight / 2})`">
              <rect
                :x="rack.x"
                :y="rack.y"
                :width="props.rackWidth"
                :height="props.rackHeight"
                class="rack-rect"
                :class="{ selected: props.selectedRackIndices.includes(tIdx), grouped: rack.podId }"
                @mousedown="emit('start-drag', $event, tIdx)"
                @contextmenu="emit('open-context-menu', $event, tIdx)"
              />

              <line
                :x1="rack.x + 1"
                :y1="rack.y + (props.rackHeight / 10) * 9"
                :x2="rack.x + (props.rackWidth - 1)"
                :y2="rack.y + (props.rackHeight / 10) * 9"
                class="rack-front-line"
              />

              <text
                :x="rack.x + props.rackWidth / 2"
                :y="rack.y + props.rackHeight / 2"
                text-anchor="middle"
                dominant-baseline="middle"
                class="rack-label"
                :transform="`rotate(${- (rack?.rotation || 0)}, ${rack.x + props.rackWidth / 2}, ${rack.y + props.rackHeight / 2})`"
              >
                {{ rack.name }}
              </text>

              <template v-if="props.selectedRackIndices.length === 1 && props.selectedRackIndices[0] === tIdx">
                <circle
                  v-for="(pos, pIdx) in [
                    {x: rack.x, y: rack.y},
                    {x: rack.x + props.rackWidth, y: rack.y},
                    {x: rack.x, y: rack.y + props.rackHeight},
                    {x: rack.x + props.rackWidth, y: rack.y + props.rackHeight}
                  ]"
                  :key="pIdx"
                  :cx="pos.x"
                  :cy="pos.y"
                  r="6"
                  class="rotation-handle"
                  @mousedown="emit('start-rotate', $event, tIdx)"
                />
              </template>
            </g>
          </template>
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.canvas-svg {
  cursor: grab;
}
.canvas-svg:active {
  cursor: grabbing;
}
.canvas-svg.interacting {
  cursor: grabbing;
}
.canvas-svg.interacting {
  user-select: none;
}
.canvas-svg.drawing-walls {
  cursor: crosshair !important;
}
.rack-rect {
  fill: #d2b48c;
  stroke: #8b4513;
  stroke-width: 2;
  cursor: move;
}
.rack-rect.selected {
  stroke: #ff4500;
  stroke-width: 3;
}
.room-surface {
  fill: rgba(0,0,0,0.03);
  cursor: pointer;
}
.room-surface.layer-footprints {
  pointer-events: all;
}
.room-surface.selected {
  fill: rgba(255, 69, 0, 0.1);
  stroke: #ff4500;
}
.rack-rect.grouped {
  fill: #e3f2fd;
  stroke: #90caf9;
}
.rack-rect.grouped.selected {
  stroke: #ff4500;
}
.pod-rect {
  fill: rgba(255, 0, 0, 0.05);
  stroke: red;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
  cursor: pointer;
  pointer-events: all;
  transition: fill 0.2s;
}
.pod-rect:hover {
  fill: rgba(255, 0, 0, 0.1);
}
.pod-rect.selected {
  stroke: #ff4500;
  fill: rgba(255, 69, 0, 0.1);
  stroke-dasharray: none;
}
.coord-text {
  font-size: 10px;
  fill: #666;
  user-select: none;
  pointer-events: none;
  font-weight: bold;
}
.rack-front-line {
  stroke: #ff4500;
  stroke-width: 4;
}
.rotation-handle {
  fill: white;
  stroke: #ff4500;
  stroke-width: 2;
  cursor: alias;
}
.rack-label {
  pointer-events: none;
  font-size: 12px;
  font-weight: bold;
  user-select: none;
}
.layer-inactive {
  opacity: 0.3;
  pointer-events: none;
}
.circuit-line {
  pointer-events: none;
}
</style>
