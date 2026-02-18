<script lang="ts">
type Props = {
  selectedRackIndices: number[];
  racks: Array<Rack | string>;
  isWallSelected: boolean;
  walls: Point[];
  unitCount: number;
  selectedPillarIndices: number[];
  pillars: Point[];
  selectedFootprint: Footprint | null;
  selectedCircuitIndices: number[];
  circuits: Circuit[];
  contextMenuOptions: { type: string; podId?: string };
  useItopForm: boolean;
}

type Emits = {
  (e: 'remove-rack', index: number): void;
  (e: 'create-pod'): void;
  (e: 'leave-pod'): void;
  (e: 'delete-pod', podId: string): void;
  (e: 'clear-selection'): void;
  (e: 'update-rack-name', value: string): void;
  (e: 'update-rack-rotation', value: number): void;
  (e: 'update-rack-x', value: number): void;
  (e: 'update-rack-y', value: number): void;
  (e: 'delete-pillar', index: number | number[]): void;
  (e: 'delete-footprint', id: string): void;
  (e: 'change-footprint-color', id: string): void;
  (e: 'update-footprint-x', id: string, value: number): void;
  (e: 'update-footprint-y', id: string, value: number): void;
  (e: 'update-footprint-name', id: string, value: string): void;
  (e: 'update-footprint-rotation', id: string, value: number): void;
  (e: 'update-circuit-name', index: number, value: string): void;
  (e: 'update-circuit-rotation', index: number, value: number): void;
  (e: 'update-circuit-x', index: number, value: number): void;
  (e: 'update-circuit-y', index: number, value: number): void;
  (e: 'delete-circuit-selection'): void;
  (e: 'clear-walls'): void;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import RackPanel from "../properties-panel/RackPanel.vue";
import PillarPanel from "../properties-panel/PillarPanel.vue";
import MultipleRackPanel from "../properties-panel/MultipleRackPanel.vue";
import FootprintPanel from "../properties-panel/FootprintPanel.vue";
import CircuitPanel from "../properties-panel/CircuitPanel.vue";
import RoomPropertiesPanel from "../properties-panel/RoomPropertiesPanel.vue";
import {useLayers} from "../../composables/useLayers.ts";
import {useRoomBuilderGeometry, rackWidth, rackHeight} from "../../composables/useRoomBuilderGeometry.ts";
import { SNAP_SIZE, GRID_SIZE } from "../../constants";

const props = defineProps<Props>();

const emit = defineEmits<Emits>();

const {currentLayerIndex} = useLayers(computed(() => props.walls));
const {getWallBoundingBox} = useRoomBuilderGeometry();
const wallBoundingBox = computed(() => getWallBoundingBox(props.walls));

const showPanel = computed(() => {
  if (props.walls.length > 0) return true;
  return currentLayerIndex.value === 3; // Index du layer "Baies"
});

const selectedPillar = computed(() => {
  if (!props.pillars || props.selectedPillarIndices.length === 0) return null;
  return props.pillars[props.selectedPillarIndices[0]!] ?? null;
});

const selectedRack = computed(() => {
  if (!props.racks || props.selectedRackIndices.length !== 1) return null;
  const rack = props.racks[props.selectedRackIndices[0]!];
  if (!rack || typeof rack === 'string') return null;
  return rack;
});

const selectedCircuit = computed(() => {
  if (!props.circuits || props.selectedCircuitIndices.length !== 1) return null;
  const circuit = props.circuits[props.selectedCircuitIndices[0]!];
  if (!circuit) return null;
  return circuit;
});

const coordLabel = computed(() => {
  const bbox = wallBoundingBox.value;
  const rack = selectedRack.value;
  if (!bbox || !rack || rack.x == null || rack.y == null) return '';

  // Front = bord du bas dans la référence non-rotée → coin avant gauche = bottom left
  const theta = ((rack.rotation || 0) % 360) * Math.PI / 180;
  const cx = rack.x + rackWidth / 2;
  const cy = rack.y + rackHeight / 2;

  const vblx = -rackWidth / 2;
  const vbly = rackHeight / 2;
  const rotVx = vblx * Math.cos(theta) - vbly * Math.sin(theta);
  const rotVy = vblx * Math.sin(theta) + vbly * Math.cos(theta);

  const px = cx + rotVx;
  const py = cy + rotVy;

  const iH = Math.floor((px - bbox.minX) / GRID_SIZE);
  const hLabel = (iH + 1).toString();
  const iV = Math.floor((bbox.maxY - py - 1) / GRID_SIZE);
  const letter = String.fromCharCode(65 + (iV % 26));
  let vLabel = letter;
  if (iV >= 26) {
    const prefix = String.fromCharCode(65 + Math.floor(iV / 26) - 1);
    vLabel = prefix + letter;
  }
  return `${vLabel}${hLabel}`;
});

const circuitCoordLabel = computed(() => {
  const bbox = wallBoundingBox.value;
  const circuit = selectedCircuit.value;
  if (!bbox || !circuit || circuit.x == null || circuit.y == null) return '';

  const cW = 40;
  const cH = 40;
  const px = circuit.x + cW; // coin bas droit X
  const py = circuit.y + cH; // coin bas droit Y

  const iH = Math.floor((px - bbox.minX - 1) / GRID_SIZE);
  const hLabel = (iH + 1).toString();
  const iV = Math.floor((bbox.maxY - py - 1) / GRID_SIZE);
  const letter = String.fromCharCode(65 + (iV % 26));
  let vLabel = letter;
  if (iV >= 26) {
    const prefix = String.fromCharCode(65 + Math.floor(iV / 26) - 1);
    vLabel = prefix + letter;
  }
  return `${vLabel}${hLabel}`;
});

const onCircuitCoordChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const val = (target.value || '').toUpperCase().replace(/\s+/g, '');
  const match = val.match(/^([A-Z]+)(\d+)$/);
  if (!match) return;
  const letters = match[1]!;
  const digits = match[2]!;
  let rowNumber = 0;
  for (let i = 0; i < letters.length; i++) {
    rowNumber = rowNumber * 26 + (letters.charCodeAt(i) - 64);
  }
  const rowIndex = rowNumber - 1; // zero-based
  const colNumber = parseInt(digits, 10);
  if (isNaN(colNumber) || colNumber <= 0) return;
  const colIndex = colNumber - 1; // zero-based
  const bbox = wallBoundingBox.value;
  if (!bbox) return;

  // Point voulu = coin bas droit du circuit sur la grille demandée
  const px = bbox.minX + (colIndex + 1) * GRID_SIZE;
  const py = bbox.maxY - (rowIndex + 1) * GRID_SIZE;

  const cW = 40;
  const cH = 40;

  let x = px - cW;
  let y = py - cH;

  x = Math.round(x / SNAP_SIZE) * SNAP_SIZE;
  y = Math.round(y / SNAP_SIZE) * SNAP_SIZE;

  const idx = props.selectedCircuitIndices[0]!;
  emit('update-circuit-x', idx, x);
  emit('update-circuit-y', idx, y);
};

const onNameInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update-rack-name', target.value);
};

const onRotationChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update-rack-rotation', Number(target.value));
};

const onCoordChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const val = (target.value || '').toUpperCase().replace(/\s+/g, '');
  const match = val.match(/^([A-Z]+)(\d+)$/);
  if (!match) return;
  const letters = match[1]!;
  const digits = match[2]!;
  // Convert letters (A=1) to zero-based row index
  let rowNumber = 0;
  for (let i = 0; i < letters.length; i++) {
    rowNumber = rowNumber * 26 + (letters.charCodeAt(i) - 64);
  }
  const rowIndex = rowNumber - 1; // zero-based
  const colNumber = parseInt(digits, 10);
  if (isNaN(colNumber) || colNumber <= 0) return;
  const colIndex = colNumber - 1; // zero-based
  const bbox = wallBoundingBox.value;
  const rack = selectedRack.value;
  if (!bbox || !rack) return;

  // Point voulu = coin avant gauche (bottom-left non-roté) sur la grille demandée
  const px = bbox.minX + colIndex * GRID_SIZE;
  const py = bbox.maxY - (rowIndex + 1) * GRID_SIZE;

  const theta = ((rack.rotation || 0) % 360) * Math.PI / 180;

  // vecteur bottom-left en repère centré
  const vblx = -rackWidth / 2;
  const vbly = rackHeight / 2;
  const rotVx = vblx * Math.cos(theta) - vbly * Math.sin(theta);
  const rotVy = vblx * Math.sin(theta) + vbly * Math.cos(theta);

  // Centre recherché
  const cx = px - rotVx;
  const cy = py - rotVy;

  // Recalcul du top left à partir du centre
  let x = cx - rackWidth / 2;
  let y = cy - rackHeight / 2;

  // Snap sur la grille de 20 px
  x = Math.round(x / SNAP_SIZE) * SNAP_SIZE;
  y = Math.round(y / SNAP_SIZE) * SNAP_SIZE;

  emit('update-rack-x', x);
  emit('update-rack-y', y);
};
</script>

<template>
  <template v-if="showPanel">
    <div v-if="selectedRackIndices.length === 1 && !isWallSelected" class="properties-panel">
      <RackPanel
          v-if="selectedRack"
          v-bind="{...selectedRack, coord: coordLabel}"
          :use-itop-form="useItopForm"
          @name-updated="onNameInput"
          @rotation-changed="onRotationChange"
          @coord-updated="onCoordChange"
          @remove-rack="$emit('remove-rack', selectedRack.id)"
      />
    </div>

    <div v-else-if="isWallSelected && currentLayerIndex === 0" class="properties-panel">
      <RoomPropertiesPanel
        :wall-count="walls.length"
        :unit-count="unitCount"
        @clear-walls="$emit('clear-walls')"
      />
    </div>

    <div v-else-if="selectedPillarIndices.length > 0" class="properties-panel">
      <PillarPanel
        :selected-pillar="selectedPillar"
        :selected-pillar-indices="selectedPillarIndices"
        @delete-pillar="$emit('delete-pillar', selectedPillarIndices)"
      />
    </div>

    <div v-else-if="selectedFootprint" class="properties-panel">
      <FootprintPanel
          :footprint="selectedFootprint"
          :use-itop-form="useItopForm"
          @delete-footprint="$emit('delete-footprint', $event)"
          @change-color="$emit('change-footprint-color', $event)"
          @update-x="(id, val) => $emit('update-footprint-x', id, val)"
          @update-y="(id, val) => $emit('update-footprint-y', id, val)"
          @update-name="(id, val) => $emit('update-footprint-name', id, val)"
          @update-rotation="(id, val) => $emit('update-footprint-rotation', id, val)"
      />
    </div>

    <div v-else-if="selectedCircuitIndices.length > 0" class="properties-panel">
      <CircuitPanel
        :selected-circuit-indices="selectedCircuitIndices"
        :circuits="circuits"
        v-bind="{ coord: circuitCoordLabel }"
        :use-itop-form="useItopForm"
        @coord-updated="onCircuitCoordChange"
        @delete-selection="$emit('delete-circuit-selection')"
        @update-name="(idx, val) => $emit('update-circuit-name', idx, val)"
        @update-rotation="(idx, val) => $emit('update-circuit-rotation', idx, val)"
        @update-x="(idx, val) => $emit('update-circuit-x', idx, val)"
        @update-y="(idx, val) => $emit('update-circuit-y', idx, val)"
      />
    </div>

    <div v-else-if="selectedRackIndices.length > 1" class="properties-panel">
      <MultipleRackPanel
          :selected-rack-indices="selectedRackIndices"
          :context-menu-options="contextMenuOptions"
          :use-itop-form="useItopForm"

          @create-pod="$emit('create-pod')"
          @delete-pod="$emit('delete-pod', contextMenuOptions.podId!)"
          @leave-pod="$emit('leave-pod')"
          @clear-selection="$emit('clear-selection')"
      />
    </div>
  </template>
</template>

<style scoped>
.properties-panel {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 280px;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.25rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  max-height: calc(100% - 18rem);
  overflow-y: auto;
  z-index: 9;
}

.properties-panel h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.property-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.property-group label svg {
  color: #9ca3af;
}

.properties-panel input,
.properties-panel select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #111827;
  transition: all 0.2s;
  box-sizing: border-box;
}
.properties-panel input:focus,
.properties-panel select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.info-label svg {
  color: #9ca3af;
}
</style>
