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
  (e: 'update-circuit-name', index: number, value: string): void;
  (e: 'update-circuit-rotation', index: number, value: number): void;
  (e: 'update-circuit-x', index: number, value: number): void;
  (e: 'update-circuit-y', index: number, value: number): void;
  (e: 'delete-circuit-selection'): void;
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

const props = defineProps<Props>();

const emit = defineEmits<Emits>();

const {currentLayerIndex} = useLayers(computed(() => props.walls));

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

const onNameInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update-rack-name', target.value);
};

const onRotationChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update-rack-rotation', Number(target.value));
};

const onXChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update-rack-x', Number(target.value));
};

const onYChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update-rack-y', Number(target.value));
};
</script>

<template>
  <template v-if="showPanel">
    <div v-if="selectedRackIndices.length === 1 && !isWallSelected" class="properties-panel">
      <RackPanel
          v-if="selectedRack"
          v-bind="selectedRack"
          @name-updated="onNameInput"
          @rotation-changed="onRotationChange"
          @x-updated="onXChange"
          @y-updated="onYChange"
          @remove-rack="$emit('remove-rack', selectedRackIndices[0]!)"
      />
    </div>

    <div v-else-if="isWallSelected && currentLayerIndex === 0" class="properties-panel">
      <RoomPropertiesPanel
        :wall-count="walls.length"
        :unit-count="unitCount"
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
          @delete-footprint="$emit('delete-footprint', $event)"
          @change-color="$emit('change-footprint-color', $event)"
          @update-x="(id, val) => $emit('update-footprint-x', id, val)"
          @update-y="(id, val) => $emit('update-footprint-y', id, val)"
          @update-name="(id, val) => $emit('update-footprint-name', id, val)"
      />
    </div>

    <div v-else-if="selectedCircuitIndices.length > 0" class="properties-panel">
      <CircuitPanel
        :selected-circuit-indices="selectedCircuitIndices"
        :circuits="circuits"
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
