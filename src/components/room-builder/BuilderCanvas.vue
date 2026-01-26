<script lang="ts">
const itop_url = import.meta.env.VITE_ITOP_BASE_URL;
</script>

<script setup lang="ts">
import {computed, inject, ref} from 'vue';
import {exposedFunctions} from "../RoomBuilder.vue";
import type {ExposedFunctions} from "../RoomBuilder.vue";

const props = defineProps<{
  layers: Layer[];
  currentLayerIndex: number;
  walls: Point[];
  racks: Array<Rack | string>;
  isDrawingWalls: boolean;
  isDrawingCircuit: boolean;
  wallPreviewPoint: Point | null;
  circuitPreviewPoint: Point | null;
  podBoundaries: Array<(Point & Size & { id: string }) | null>;
  wallBoundingBox: (Size & MinPoint & MaxPoint) | null;
  horizontalCoords: (Point & { label: string })[];
  verticalCoords: (Point & { label: string })[];
  selectedRackIndices: number[];
  zoomLevel: number;
  panOffset: Point;
  isWallSelected: boolean;
  rackWidth: number;
  rackHeight: number;
  isInteracting: boolean;
  selectedUnits: Point[];
  selectedCircuitSegmentKeys: string[];
}>();

const emit = defineEmits<{
  (e: 'deselect', event: MouseEvent): void;
  (e: 'mousemove-svg', event: MouseEvent): void;
  (e: 'start-drag', event: MouseEvent, index: number): void;
  (e: 'open-context-menu', event: MouseEvent, index: number): void;
  (e: 'start-rotate', event: MouseEvent, index: number): void;
  (e: 'select-pod', event: MouseEvent, podId: string): void;
  (e: 'select-wall', event: MouseEvent): void;
  (e: 'select-circuit-segment', event: MouseEvent, pathIndex: number, segmentIndex: number): void;
  (e: 'select-circuit-path', event: MouseEvent, pathIndex: number, segmentIndex: number): void;
}>();

const svgRef = ref<SVGSVGElement | null>(null);
const lastCircuitPoint = computed(() => {
  const circuits = props.layers[props.currentLayerIndex]?.circuits;
  if (!circuits?.length) return null;
  const lastPath = circuits[circuits.length - 1];
  if (!lastPath?.length) return null;
  return lastPath[lastPath.length - 1];
});

const selectedSegmentKeys = computed(() => new Set(props.selectedCircuitSegmentKeys));

const isSegmentSelected = (pathIndex: number, segmentIndex: number) =>
  selectedSegmentKeys.value.has(`${pathIndex}-${segmentIndex}`);

const {getPodBoundaries} = inject<ExposedFunctions>(exposedFunctions, {} as ExposedFunctions)

defineExpose({svgRef});
</script>

<template>
  <svg
      ref="svgRef"
      width="100%"
      height="100%"
      class="canvas-svg"
      :class="{
        interacting: isInteracting,
        'drawing-walls': isDrawingWalls
      }"
      @mousedown="emit('deselect', $event)"
      @mousemove="emit('mousemove-svg', $event)"
  >
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

    <g :transform="`scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`">
      <g
          v-for="(layer, lIdx) in layers"
          :key="`layer-${layer.id}`"
          v-show="lIdx !== currentLayerIndex"
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
        <polygon
            v-if="layer.walls?.length > 2"
            :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
            class="room-surface"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="1"
            stroke-linejoin="round"
        />
        <g v-if="layer.circuits?.length">
          <polyline
              v-for="(circuit, circuitIdx) in layer.circuits"
              :key="`circuit-${layer.id}-${circuitIdx}`"
              :points="circuit.map(p => `${p.x},${p.y}`).join(' ')"
              fill="none"
              stroke="#0d6efd"
              stroke-width="3"
              stroke-linejoin="round"
              stroke-linecap="round"
              class="circuit-line"
          />
        </g>

        <rect
            v-for="pod in getPodBoundaries(layer.racks, layer.pods)"
            :key="pod!.id"
            :x="pod!.x"
            :y="pod!.y"
            :width="pod!.width"
            :height="pod!.height"
            class="pod-rect"
        />

        <g v-for="(rack, tIdx) in layer.racks" :key="`rack-${tIdx}`">
          <g :transform="`rotate(${rack?.rotation || 0}, ${rack.x + rackWidth / 2}, ${rack.y + rackHeight / 2})`">
            <rect
                :x="rack.x"
                :y="rack.y"
                :width="rackWidth"
                :height="rackHeight"
                class="rack-rect"
                :class="{ grouped: rack.podId }"
            />
            <image
                :x="rack.x + 2"
                :y="rack.y + 2"
                :width="12"
                :height="12"
                :href="`${itop_url}/images/icons/icons8-rack.svg`"
            />
            <text
                :x="rack.x + rackWidth / 2"
                :y="rack.y + rackHeight / 2"
                text-anchor="middle"
                dominant-baseline="middle"
                class="rack-label"
            >
              {{ rack.name }}
            </text>
          </g>
        </g>
      </g>

      <g class="layer-active">
        <g v-if="currentLayerIndex === 1" class="footprints-layer">
          <g v-for="footprint in layers[1]?.footprints" :key="footprint.id">
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
              v-for="(unit, uIdx) in selectedUnits"
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

        <polygon
            v-if="!isDrawingWalls && walls.length > 2"
            :points="walls.map(p => `${p.x},${p.y}`).join(' ')"
            fill="none"
            stroke="#333"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
            style="pointer-events: none;"
        />
        <polyline
            v-else-if="walls.length > 0"
            :points="walls.map(p => `${p.x},${p.y}`).join(' ')"
            fill="none"
            stroke="#333"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
            style="pointer-events: none;"
        />
        <polygon
            v-if="!isDrawingWalls && walls.length > 2"
            :points="walls.map(p => `${p.x},${p.y}`).join(' ')"
            class="room-surface"
            :class="{
              selected: isWallSelected,
              'layer-footprints': currentLayerIndex === 1
            }"
            @mousedown="emit('select-wall', $event)"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="1"
            stroke-linejoin="round"
        />

        <circle
            v-if="isDrawingWalls && wallPreviewPoint"
            :cx="wallPreviewPoint.x"
            :cy="wallPreviewPoint.y"
            r="4"
            fill="#333"
        />
        <line
            v-if="isDrawingWalls && walls.length > 0 && wallPreviewPoint"
            :x1="walls[walls.length - 1]?.x"
            :y1="walls[walls.length - 1]?.y"
            :x2="wallPreviewPoint.x"
            :y2="wallPreviewPoint.y"
            stroke="#333"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
        />
        <line
            v-if="isDrawingWalls && walls.length > 2 && wallPreviewPoint"
            :x1="wallPreviewPoint.x"
            :y1="wallPreviewPoint.y"
            :x2="walls[0]?.x"
            :y2="walls[0]?.y"
            stroke="rgba(0,0,0,0.2)"
            stroke-width="2"
            stroke-dasharray="2,2"
        />
        <g v-if="layers[currentLayerIndex]?.circuits?.length">
          <g v-for="(circuit, circuitIdx) in layers[currentLayerIndex]?.circuits"
             :key="`circuit-active-${circuitIdx}`">
            <line
                v-for="(point, pointIdx) in circuit.slice(0, -1)"
                :key="`circuit-segment-${circuitIdx}-${pointIdx}`"
                :x1="point.x"
                :y1="point.y"
                :x2="circuit[pointIdx + 1]!.x"
                :y2="circuit[pointIdx + 1]!.y"
                class="circuit-segment"
                :class="{
                  selected: isSegmentSelected(circuitIdx, pointIdx)
                }"
                @mousedown.stop
                @click.stop="emit('select-circuit-segment', $event, circuitIdx, pointIdx)"
                @dblclick.stop="emit('select-circuit-path', $event, circuitIdx, pointIdx)"
            />
          </g>
        </g>
        <circle
            v-if="currentLayerIndex === 0 && circuitPreviewPoint"
            :cx="circuitPreviewPoint.x"
            :cy="circuitPreviewPoint.y"
            r="3"
            fill="#0d6efd"
        />
        <line
            v-if="currentLayerIndex === 0 && isDrawingCircuit && lastCircuitPoint && circuitPreviewPoint"
            :x1="lastCircuitPoint.x"
            :y1="lastCircuitPoint.y"
            :x2="circuitPreviewPoint.x"
            :y2="circuitPreviewPoint.y"
            stroke="#0d6efd"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
        />

        <rect
            v-for="pod in podBoundaries"
            :key="pod!.id"
            :x="pod!.x"
            :y="pod!.y"
            :width="pod!.width"
            :height="pod!.height"
            class="pod-rect"
            :class="{
              selected: selectedRackIndices.length > 0 && (racks as Rack[])[selectedRackIndices[0]!]?.podId === pod!.id
            }"
            @mousedown="emit('select-pod', $event, pod!.id)"
        />

        <g v-if="wallBoundingBox" class="coordinates-labels">
          <text
              v-for="(coord, idx) in horizontalCoords"
              :key="`h-${idx}`"
              :x="coord.x"
              :y="coord.y"
              text-anchor="middle"
              class="coord-text"
          >
            {{ coord.label }}
          </text>
          <text
              v-for="(coord, idx) in verticalCoords"
              :key="`v-${idx}`"
              :x="coord.x"
              :y="coord.y"
              text-anchor="end"
              dominant-baseline="middle"
              class="coord-text"
          >
            {{ coord.label }}
          </text>
        </g>

        <g v-for="(rack, tIdx) in racks" :key="tIdx">
          <template v-if="typeof rack !== 'string'">
            <g :transform="`rotate(${rack?.rotation || 0}, ${rack.x + rackWidth / 2}, ${rack.y + rackHeight / 2})`">
              <rect
                  :x="rack.x"
                  :y="rack.y"
                  :width="rackWidth"
                  :height="rackHeight"
                  class="rack-rect"
                  :class="{
                    selected: selectedRackIndices.includes(tIdx),
                    grouped: rack.podId
                  }"
                  @mousedown="emit('start-drag', $event, tIdx)"
                  @contextmenu="emit('open-context-menu', $event, tIdx)"
              />

              <image
                  :x="rack.x + 2"
                  :y="rack.y + 2"
                  :width="12"
                  :height="12"
                  :href="`${itop_url}/images/icons/icons8-rack.svg`"
              />

              <line
                  :x1="rack.x + 1"
                  :y1="rack.y + (rackHeight / 10) * 9"
                  :x2="rack.x + (rackWidth - 1)"
                  :y2="rack.y + (rackHeight / 10) * 9"
                  class="rack-front-line"
              />

              <text
                  :x="rack.x + rackWidth / 2"
                  :y="rack.y + rackHeight / 2"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="rack-label"
                  :transform="`rotate(${- (rack?.rotation || 0)}, ${rack.x + rackWidth / 2}, ${rack.y + rackHeight / 2})`"
              >
                {{ rack.name }}
              </text>

              <template v-if="selectedRackIndices.length === 1 && selectedRackIndices[0] === tIdx">
                <circle
                    v-for="(pos, pIdx) in [
                    {x: rack.x, y: rack.y},
                    {x: rack.x + rackWidth, y: rack.y},
                    {x: rack.x, y: rack.y + rackHeight},
                    {x: rack.x + rackWidth, y: rack.y + rackHeight}
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
  user-select: none;
  display: block;
}

.canvas-svg:active {
  cursor: grabbing;
}

.canvas-svg.interacting {
  cursor: grabbing;
}

.canvas-svg.drawing-walls {
  cursor: crosshair !important;
}

.rack-rect {
  fill: #ffffff;
  stroke: #007bff;
  stroke-width: 1;
  cursor: move;
}

.rack-rect.selected {
  stroke: #ff4500;
  stroke-width: 2;
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
}

.room-surface {
  fill: rgba(255, 255, 255, 0.1);
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 1;
  cursor: pointer;
}

.room-surface.layer-footprints {
  pointer-events: all;
}

.room-surface.selected {
  fill: rgba(255, 69, 0, 0.15);
  stroke: #ff4500;
  stroke-width: 2;
}

.rack-rect.grouped {
  fill: #e8f4fd;
  stroke: #3498db;
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
  fill: #ecf0f1;
  user-select: none;
  pointer-events: none;
  font-weight: bold;
}

.rack-front-line {
  stroke: #ff4500;
  stroke-width: 2;
}

.rotation-handle {
  fill: white;
  stroke: #ff4500;
  stroke-width: 1.5;
  cursor: alias;
}

.rack-label {
  pointer-events: none;
  font-size: 11px;
  font-weight: 500;
  fill: #333;
  user-select: none;
}

.layer-inactive {
  opacity: 0.3;
  pointer-events: none;
}

.circuit-line {
  pointer-events: none;
  stroke: #3498db;
}

.circuit-segment {
  pointer-events: stroke;
  stroke: #3498db;
  stroke-width: 3;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.circuit-segment.selected {
  stroke: #ff4500;
  stroke-width: 4;
}
</style>
