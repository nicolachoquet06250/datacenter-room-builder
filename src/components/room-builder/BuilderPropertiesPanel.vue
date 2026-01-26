<script setup lang="ts">
import * as pods from '../properties-panel/pods';

import { computed } from 'vue';
import RackPanel from "../properties-panel/RackPanel.vue";

const props = defineProps<{
  selectedRackIndices: number[];
  racks: Array<Rack | string>;
  isWallSelected: boolean;
  contextMenuOptions: { type: string; podId?: string };
}>();

const emit = defineEmits<{
  (e: 'remove-rack', index: number): void;
  (e: 'create-pod'): void;
  (e: 'leave-pod'): void;
  (e: 'delete-pod', podId: string): void;
  (e: 'clear-selection'): void;
  (e: 'update-rack-name', value: string): void;
  (e: 'update-rack-rotation', value: number): void;
}>();

const selectedRack = computed(() => {
  if (props.selectedRackIndices.length !== 1) return null;
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
</script>

<template>
  <div v-if="selectedRackIndices.length === 1 && !isWallSelected" class="properties-panel">
    <RackPanel
        v-if="selectedRack"
        v-bind="selectedRack"
        @name-updated="onNameInput"
        @rotation-changed="onRotationChange"
        @remove-rack="$emit('remove-rack', selectedRackIndices[0]!)"
    />
  </div>

  <div v-else-if="selectedRackIndices.length > 1" class="properties-panel">
    <div>
      <div class="panel-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
        <h3>Sélection multiple</h3>
      </div>

      <p class="selection-count">
        {{ selectedRackIndices.length }} éléments sélectionnés
      </p>

      <div class="actions">
        <component
            :is="pods[contextMenuOptions.type as keyof typeof pods]"

            @create-pod="$emit('create-pod')"
            @delete-pod="$emit('delete-pod', contextMenuOptions.podId!)"
            @leave-pod="$emit('leave-pod')"
        />
        <component
            :is="pods.ClearSelection"
            @clear-selection="$emit('clear-selection')"
        />
      </div>
    </div>
  </div>
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
  max-height: calc(100% - 2rem);
  overflow-y: auto;
  z-index: 10;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.header-icon {
  color: #6b7280;
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

.selection-count {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.5rem 0 1.25rem 0;
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 1.25rem;
}
</style>
