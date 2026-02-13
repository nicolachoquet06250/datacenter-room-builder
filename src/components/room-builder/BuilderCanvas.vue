<script lang="ts">
const circuitWidth = 40;
const circuitHeight = 40;
const itop_url = import.meta.env.VITE_ITOP_BASE_URL;

type Props = {
  layers: Layer[];
  currentLayerIndex: number;
  walls: Point[];
  racks: Array<Rack | string>;
  isDrawingWalls: boolean;
  isDrawingCircuit: boolean;
  wallPreviewPoint: Point | null;
  podBoundaries: Array<(Point & Size & { id: string }) | null>;
  wallBoundingBox: (Size & MinPoint & MaxPoint) | null;
  horizontalCoords: (Point & { label: string })[];
  verticalCoords: (Point & { label: string })[];
  selectedRackIndices: number[];
  zoomLevel: number;
  panOffset: Point;
  isWallSelected: boolean;
  isDrawingPillar: boolean;
  pillarPreviewPoint: Point | null;
  selectedPillarIndices: number[];
  rackWidth: number;
  rackHeight: number;
  isInteracting: boolean;
  selectedUnits: Point[];
  hoveredUnit: Point | null;
  gridLabel: string;
  selectedFootprintId: string | null;
  selectedCircuitIndices: number[];
  isDataLoading: boolean;
}

type Emits = {
  (e: 'deselect', event: MouseEvent): void;
  (e: 'mousemove-svg', event: MouseEvent): void;
  (e: 'start-drag', event: MouseEvent, index: number): void;
  (e: 'open-context-menu', event: MouseEvent, index: number): void;
  (e: 'start-rotate', event: MouseEvent, index: number): void;
  (e: 'select-pod', event: MouseEvent, podId: string): void;
  (e: 'select-wall', event: MouseEvent): void;
  (e: 'start-drag-wall', event: MouseEvent, index: number, isHorizontal: boolean): void;
  (e: 'delete-pillar', index: number): void;
  (e: 'select-pillar', event: MouseEvent, index: number): void;
  (e: 'start-drag-pillar', event: MouseEvent, index: number): void;
  (e: 'select-circuit', event: MouseEvent, index: number): void;
  (e: 'start-drag-circuit', event: MouseEvent, index: number): void;
  (e: 'select-footprint', id: string): void;
  (e: 'start-drag-footprint', event: MouseEvent, id: string): void;
  (e: 'drop-rack', event: DragEvent): void;
  (e: 'dragover-rack', event: DragEvent): void;
}
</script>

<script setup lang="ts">
import {inject, ref} from 'vue';
import {exposedFunctions} from "../RoomBuilder.vue";
import type {ExposedFunctions} from "../RoomBuilder.vue";
import BuilderGrid from "./BuilderGrid.vue";
import {getContrastColor} from "../../utils/colors";

const props = withDefaults(defineProps<Props>(), {
  selectedPillarIndices: () => []
});

const emit = defineEmits<Emits>();

const svgRef = ref<SVGSVGElement | null>(null);

const {getPodBoundaries, getGridLabel} = inject<ExposedFunctions>(exposedFunctions, {} as ExposedFunctions);

const getPreviewLabel = (point: Point | null, walls: Point[], wallBoundingBox: any) => {
  if (!point) return '';
  if (walls.length === 0) return '';
  
  if (walls.length === 1) {
    const first = walls[0]!;
    // On détermine la direction du segment de preview
    const isHorizontal = Math.abs(point.y - first.y) < 1;
    const isVertical = Math.abs(point.x - first.x) < 1;
    
    if (isHorizontal && !isVertical) return getGridLabel(point.x, point.y, wallBoundingBox, 'number');
    if (isVertical && !isHorizontal) return getGridLabel(point.x, point.y, wallBoundingBox, 'letter');
    return getGridLabel(point.x, point.y, wallBoundingBox, 'full');
  }
  
  return getGridLabel(point.x, point.y, wallBoundingBox, 'full');
};

const getLabelOffset = (point: Point | null, wallBoundingBox: any) => {
  if (!point || !wallBoundingBox) return { x: 10, y: -25 };
  
  let offsetX = 10;
  let offsetY = -25;
  
  if (Math.abs(point.x - wallBoundingBox.minX) < 1) {
    offsetX = -45; // Gauche
  } else if (Math.abs(point.x - wallBoundingBox.maxX) < 1) {
    offsetX = 10; // Droite
  }
  
  if (Math.abs(point.y - wallBoundingBox.minY) < 1) {
    offsetY = -25; // Haut
  } else if (Math.abs(point.y - wallBoundingBox.maxY) < 1) {
    offsetY = 10; // Bas
  }
  
  return { x: offsetX, y: offsetY };
};

const handleSelectPillar = (e: MouseEvent, pIdx: number) => {
  if (!props.isDrawingPillar) {
    emit('select-pillar', e, pIdx);
    emit('start-drag-pillar', e, pIdx);
  }
}

const handleSelectCircuit = (e: MouseEvent, cIdx: number) => {
  emit('select-circuit', e, cIdx);
  emit('start-drag-circuit', e, cIdx);
}

const getFootprintCenter = (footprint: Footprint) => {
  if (!footprint.units || (footprint.units?.length ?? 0) === 0) return { x: 0, y: 0 };
  const minX = Math.min(...footprint.units.map(u => u.x));
  const maxX = Math.max(...footprint.units.map(u => u.x));
  const minY = Math.min(...footprint.units.map(u => u.y));
  const maxY = Math.max(...footprint.units.map(u => u.y));
  return {
    x: (minX + maxX + 20) / 2,
    y: (minY + maxY + 20) / 2
  };
};

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
        'drawing-walls': isDrawingWalls,
        'drawing-pillar': isDrawingPillar
      }"
      @mousedown="$emit('deselect', $event)"
      @mousemove="$emit('mousemove-svg', $event)"
      @dragover.prevent="$emit('dragover-rack', $event)"
      @drop="$emit('drop-rack', $event)"
      @click.right.prevent
  >
    <BuilderGrid
        :zoom-level="zoomLevel"
        :pan-offset="panOffset"
    />

    <g :transform="`scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`" v-if="!isDataLoading">
      <!-- On s'assure que le groupe actif est dessiné en DERNIER pour être au-dessus -->
      <g
          v-for="(layer, lIdx) in layers"
          :key="`layer-${layer?.id || lIdx}`"
          v-show="lIdx !== currentLayerIndex && layer?.walls?.length > 2"
          class="layer-inactive"
      >
        <g v-if="lIdx === 2 && layer?.footprints" class="footprints-layer">
          <g v-for="footprint in layer.footprints" :key="footprint.id">
            <template v-if="(footprint.units?.length ?? 0) > 0">
              <rect
                  v-for="(unit, uIdx) in footprint.units || []"
                  :key="uIdx"
                  :x="unit.x"
                  :y="unit.y"
                  :width="20"
                  :height="20"
                  :fill="footprint.color"
                  fill-opacity="0.2"
              />
              <text
                  v-if="footprint.name"
                  :x="getFootprintCenter(footprint).x"
                  :y="getFootprintCenter(footprint).y"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="footprint-label"
                  :fill="getContrastColor(footprint.color)"
                  fill-opacity="0.5"
                  pointer-events="none"
              >
                {{ footprint.name }}
              </text>
            </template>
          </g>
        </g>
        <polygon
            v-if="layer?.walls?.length > 2"
            :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
            class="room-surface"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="1"
            stroke-linejoin="round"
        />
        <rect
            v-for="(pillar, pIdx) in layer?.pillars || []"
            :key="`pillar-inactive-${layer?.id || lIdx}-${pIdx}`"
            :x="pillar.x - 10"
            :y="pillar.y - 10"
            :width="20"
            :height="20"
            fill="#333"
            class="pillar-rect inactive"
        />
        <g v-if="layer?.circuits?.length">
          <template v-for="(circuit, circuitIdx) in layer.circuits" :key="`circuit-${layer?.id || lIdx}-${circuitIdx}`">
            <g v-if="circuit && circuit.x !== null && circuit.x !== undefined && circuit.y !== null && circuit.y !== undefined"
               :transform="`rotate(${circuit.rotation || 0}, ${circuit.x + circuitWidth / 2}, ${circuit.y + circuitHeight / 2})`"
            >
              <rect
                  :x="circuit.x"
                  :y="circuit.y"
                  :width="circuitWidth"
                  :height="circuitHeight"
                  fill="none"
                  stroke="#63b3ed"
                  stroke-width="2"
              />
              <image
                  :x="circuit.x"
                  :y="circuit.y"
                  :width="circuitWidth"
                  :height="circuitHeight"
                  :href="`${itop_url}/env-production/Electricite/images/circuitelec.jpg`"
                  preserveAspectRatio="xMidYMid slice"
              />
            </g>
          </template>
        </g>

        <rect
            v-for="pod in (layer?.racks && layer?.pods ? getPodBoundaries(layer.racks, layer.pods).filter(Boolean) : [])"
            :key="pod!.id"
            :x="pod!.x"
            :y="pod!.y"
            :width="pod!.width"
            :height="pod!.height"
            class="pod-rect"
        />

        <g v-for="(rack, tIdx) in layer?.racks || []" :key="`rack-${tIdx}`">
          <g v-if="rack && rack.x !== undefined && rack.x !== null && rack.y !== undefined && rack.y !== null" :transform="`rotate(${rack?.rotation || 0}, ${rack.x + rackWidth / 2}, ${rack.y + rackHeight / 2})`">
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
                :transform="`rotate(${- (rack?.rotation || 0)}, ${rack.x + rackWidth / 2}, ${rack.y + rackHeight / 2})`"
            >
              {{ rack.name }}
            </text>
          </g>
        </g>
      </g>

      <g v-if="walls.length > 0 || currentLayerIndex === 3 || isDrawingWalls || isDrawingPillar" class="layer-active">
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
              'layer-footprints': currentLayerIndex === 2
            }"
            @mousedown.stop="(!isDrawingPillar && !isDrawingWalls) && $emit('select-wall', $event)"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="1"
            stroke-linejoin="round"
            :style="{ pointerEvents: isDrawingPillar ? 'none' : 'auto' }"
        />

        <g v-if="currentLayerIndex === 2 && layers[2]?.footprints" class="footprints-layer">
          <g v-for="footprint in layers[2].footprints" :key="footprint.id"
             @mousedown.stop="$emit('start-drag-footprint', $event, footprint.id)"
             class="footprint-group"
             :class="{ 'selected': footprint.id === selectedFootprintId }"
          >
            <template v-if="(footprint.units?.length ?? 0) > 0">
              <rect
                  v-for="(unit, uIdx) in footprint.units || []"
                  :key="uIdx"
                  :x="unit.x"
                  :y="unit.y"
                  :width="20"
                  :height="20"
                  :fill="footprint.color"
                  :fill-opacity="footprint.id === selectedFootprintId ? 0.6 : 0.4"
                  stroke="white"
                  :stroke-width="footprint.id === selectedFootprintId ? 1 : 0.5"
              />
              <text
                  v-if="footprint.name"
                  :x="getFootprintCenter(footprint).x"
                  :y="getFootprintCenter(footprint).y"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="footprint-label"
                  :fill="getContrastColor(footprint.color)"
                  pointer-events="none"
              >
                {{ footprint.name }}
              </text>
            </template>
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
          <rect
              v-if="hoveredUnit && !isInteracting"
              :x="hoveredUnit.x"
              :y="hoveredUnit.y"
              :width="20"
              :height="20"
              fill="#ff4500"
              fill-opacity="0.4"
              stroke="white"
              stroke-width="0.5"
              style="pointer-events: none"
          />
        </g>

        <rect
            v-if="isDrawingPillar && pillarPreviewPoint"
            :x="pillarPreviewPoint.x - 10"
            :y="pillarPreviewPoint.y - 10"
            :width="20"
            :height="20"
            fill="#333"
            fill-opacity="0.5"
            style="pointer-events: none; cursor: crosshair;"
        />

        <g v-if="!isDrawingWalls && isWallSelected && currentLayerIndex === 0">
          <line
              v-for="(point, index) in walls"
              :key="`wall-drag-handle-${index}`"
              :x1="point.x"
              :y1="point.y"
              :x2="walls[(index + 1) % walls.length]!.x"
              :y2="walls[(index + 1) % walls.length]!.y"
              stroke="transparent"
              stroke-width="10"
              :style="{ cursor: Math.abs(point.y - (walls[(index + 1) % walls.length]?.y ?? 0)) < 1 ? 'ns-resize' : 'ew-resize' }"
              @mousedown.stop="$emit('start-drag-wall', $event, index, Math.abs(point.y - (walls[(index + 1) % walls.length]?.y ?? 0)) < 1)"
          />
        </g>

        <template v-if="isDrawingWalls">
          <circle
              v-if="wallPreviewPoint"
              :cx="wallPreviewPoint.x"
              :cy="wallPreviewPoint.y"
              r="4"
              fill="#333"
              style="pointer-events: none;"
          />
          <g v-if="walls.length > 0" class="first-point-label" style="pointer-events: none;">
            <rect
                :x="walls[0]!.x + getLabelOffset(walls[0]!, wallBoundingBox).x"
                :y="walls[0]!.y + getLabelOffset(walls[0]!, wallBoundingBox).y"
                :width="getGridLabel(walls[0]!.x, walls[0]!.y, wallBoundingBox).length > 2 ? 40 : 30"
                height="18"
                rx="3"
                fill="rgba(0, 0, 0, 0.75)"
            />
            <text
                :x="walls[0]!.x + getLabelOffset(walls[0]!, wallBoundingBox).x + (getGridLabel(walls[0]!.x, walls[0]!.y, wallBoundingBox).length > 2 ? 20 : 15)"
                :y="walls[0]!.y + getLabelOffset(walls[0]!, wallBoundingBox).y + 12"
                text-anchor="middle"
                fill="white"
                style="font-size: 10px; font-weight: bold; font-family: sans-serif;"
            >
              {{ getGridLabel(walls[0]!.x, walls[0]!.y, wallBoundingBox) }}
            </text>
          </g>
          <g v-if="wallPreviewPoint && walls.length > 0" class="preview-coordinate-label" style="pointer-events: none;">
            <rect
                :x="wallPreviewPoint.x + getLabelOffset(wallPreviewPoint, wallBoundingBox).x"
                :y="wallPreviewPoint.y + getLabelOffset(wallPreviewPoint, wallBoundingBox).y"
                :width="getPreviewLabel(wallPreviewPoint, walls, wallBoundingBox).length > 2 ? 40 : 30"
                height="18"
                rx="3"
                fill="rgba(0, 0, 0, 0.75)"
            />
            <text
                :x="wallPreviewPoint.x + getLabelOffset(wallPreviewPoint, wallBoundingBox).x + (getPreviewLabel(wallPreviewPoint, walls, wallBoundingBox).length > 2 ? 20 : 15)"
                :y="wallPreviewPoint.y + getLabelOffset(wallPreviewPoint, wallBoundingBox).y + 12"
                text-anchor="middle"
                fill="white"
                style="font-size: 10px; font-weight: bold; font-family: sans-serif;"
            >
              {{ getPreviewLabel(wallPreviewPoint, walls, wallBoundingBox) }}
            </text>
          </g>
          <line
              v-if="walls.length > 0 && wallPreviewPoint"
              :x1="walls[walls.length - 1]?.x"
              :y1="walls[walls.length - 1]?.y"
              :x2="wallPreviewPoint.x"
              :y2="wallPreviewPoint.y"
              stroke="#333"
              stroke-width="4"
              stroke-linejoin="round"
              stroke-linecap="round"
              stroke-dasharray="8,4"
              opacity="0.6"
              style="pointer-events: none;"
          />
          <line
              v-if="walls.length > 2 && wallPreviewPoint"
              :x1="wallPreviewPoint.x"
              :y1="wallPreviewPoint.y"
              :x2="walls[0]?.x"
              :y2="walls[0]?.y"
              stroke="#333"
              stroke-width="4"
              stroke-linejoin="round"
              stroke-linecap="round"
              stroke-dasharray="8,4"
              opacity="0.6"
              style="pointer-events: none;"
          />
        </template>

        <g v-if="layers[currentLayerIndex]?.circuits?.length">
          <template v-for="(circuit, circuitIdx) in layers[currentLayerIndex]?.circuits" :key="`circuit-active-${circuitIdx}`">
            <g v-if="circuit.x !== null && circuit.x !== undefined && circuit.y !== null && circuit.y !== undefined"
               :transform="`rotate(${circuit.rotation || 0}, ${circuit.x + circuitWidth / 2}, ${circuit.y + circuitHeight / 2})`"
               @mousedown.stop="handleSelectCircuit($event, circuitIdx)"
            >
              <rect
                  :x="circuit.x"
                  :y="circuit.y"
                  :width="circuitWidth"
                  :height="circuitHeight"
                  class="circuit-rect"
                  :class="{
                    selected: selectedCircuitIndices.includes(circuitIdx)
                  }"
              />
              <image
                  :x="circuit.x"
                  :y="circuit.y"
                  :width="circuitWidth"
                  :height="circuitHeight"
                  :href="`${itop_url}/env-production/Electricite/images/circuitelec.jpg`"
                  preserveAspectRatio="xMidYMid slice"
                  style="pointer-events: none"
              />

              <template v-if="selectedCircuitIndices.length === 1 && selectedCircuitIndices[0] === circuitIdx">
                <circle
                    v-for="(pos, pIdx) in [
                    {x: circuit.x, y: circuit.y},
                    {x: circuit.x + circuitWidth, y: circuit.y},
                    {x: circuit.x, y: circuit.y + circuitHeight},
                    {x: circuit.x + circuitWidth, y: circuit.y + circuitHeight}
                  ]"
                    :key="pIdx"
                    :cx="pos.x"
                    :cy="pos.y"
                    r="6"
                    class="rotation-handle"
                    @mousedown="$emit('start-drag-circuit', $event, circuitIdx)"
                />
              </template>
            </g>
          </template>
        </g>


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
            @mousedown="$emit('select-pod', $event, pod!.id)"
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
          <template v-if="typeof rack !== 'string' && rack.x !== undefined && rack.x !== null && rack.y !== undefined && rack.y !== null">
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
                  @mousedown="$emit('start-drag', $event, tIdx)"
                  @contextmenu="$emit('open-context-menu', $event, tIdx)"
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
                    class="rotation-handle rack"
                    @mousedown="$emit('start-rotate', $event, tIdx)"
                />
              </template>
            </g>
          </template>
        </g>

        <g v-if="currentLayerIndex === 0 && layers[0]?.pillars?.length" class="pillars-layer">
          <rect
              v-for="(pillar, pIdx) in layers[0]!.pillars"
              :key="`pillar-global-${pIdx}`"
              :x="pillar.x - 10"
              :y="pillar.y - 10"
              :width="20"
              :height="20"
              :fill="selectedPillarIndices.includes(pIdx) ? '#0d6efd' : '#333'"
              :stroke="selectedPillarIndices.includes(pIdx) ? '#fff' : 'none'"
              :stroke-width="selectedPillarIndices.includes(pIdx) ? 2 : 0"
              class="pillar-rect"
              @mousedown.stop="handleSelectPillar($event, pIdx)"
          />
        </g>

        <g v-if="hoveredUnit && gridLabel" class="grid-tooltip" style="pointer-events: none;">
          <rect
              :x="hoveredUnit.x + 2"
              :y="hoveredUnit.y - 22"
              :width="gridLabel.length > 2 ? 32 : 24"
              height="18"
              rx="3"
              fill="rgba(0, 0, 0, 0.75)"
          />
          <text
              :x="hoveredUnit.x + (gridLabel.length > 2 ? 18 : 14)"
              :y="hoveredUnit.y - 10"
              text-anchor="middle"
              fill="white"
              style="font-size: 10px; font-weight: bold; font-family: sans-serif;"
          >
            {{ gridLabel }}
          </text>
        </g>
      </g>
    </g>
  </svg>

  <div v-if="isDataLoading" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background-color: rgba(0, 0, 0, 0.5);">
    <slot name="loader" />
  </div>
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

.canvas-svg.drawing-walls,
.canvas-svg.drawing-pillar {
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

  &.rack {
    cursor: alias;
  }
}

.rack-label {
  pointer-events: none;
  font-size: 11px;
  font-weight: 500;
  fill: #333;
  user-select: none;
}

.footprint-label {
  font-size: 10px;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  user-select: none;
}

.layer-inactive {
  opacity: 0.3;
  pointer-events: none;
}

.circuit-line {
  pointer-events: none;
  stroke: #63b3ed;
}

.circuit-segment {
  pointer-events: stroke;
  stroke: #63b3ed;
  stroke-width: 3;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.circuit-rect.selected {
  stroke: #ff4500;
  stroke-width: 2;
}

.footprint-group {
  cursor: move;
}

.footprint-group.selected rect {
  stroke: #2563eb;
  stroke-width: 1.5;
}
.footprint-group.draggable {
  cursor: move;
}

.pillar-rect {
  cursor: crosshair;
}

.pillar-rect.inactive {
  cursor: default;
}
</style>
