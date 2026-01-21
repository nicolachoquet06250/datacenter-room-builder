<script setup lang="ts">
import { computed } from 'vue';

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
  return rack as Rack;
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
  <div v-if="props.selectedRackIndices.length === 1 && !props.isWallSelected" class="properties-panel">
    <div v-if="selectedRack">
      <h3>Rack</h3>
      <label>
        Nom:
        <input
          :value="selectedRack.name"
          @input="onNameInput"
          @keyup.delete.stop.prevent="() => {}"
        />
      </label>
      <label>
        Rotation (°):
        <input
          type="number"
          :value="selectedRack.rotation ?? 0"
          step="45"
          @change="onRotationChange"
        />
      </label>
      <label v-if="selectedRack.podId">Pod ID: <span>{{ selectedRack.podId }}</span></label>

      <div class="actions">
        <button @click="emit('remove-rack', props.selectedRackIndices[0]!)" class="btn btn-danger">Supprimer le rack</button>
      </div>
    </div>
  </div>
  <div v-else-if="props.selectedRackIndices.length > 1" class="properties-panel">
    <div>
      <h3>Sélection multiple</h3>
      <p>{{ props.selectedRackIndices.length }} racks sélectionnés</p>
      <div class="actions">
        <button v-if="props.contextMenuOptions.type === 'create_pod'" @click="emit('create-pod')" class="btn btn-secondary">Créer un pod</button>
        <button v-if="props.contextMenuOptions.type === 'leave_pod'" @click="emit('leave-pod')" class="btn btn-secondary">Sortir du pod</button>
        <button v-if="props.contextMenuOptions.type === 'delete_pod'" @click="emit('delete-pod', props.contextMenuOptions.podId!)" class="btn btn-danger">Supprimer le pod</button>
        <button @click="emit('clear-selection')" class="btn btn-outline-secondary">Désélectionner tout</button>
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
.properties-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 0.5rem;
}
.properties-panel label {
  display: block;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4b5563;
}
.properties-panel input,
.properties-panel select {
  width: calc(100% - 10px);
  margin-top: 0.25rem;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #1f2937;
  transition: border-color 0.2s;
}
.properties-panel input:focus,
.properties-panel select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}
.actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 1rem;
}
.btn-outline-secondary {
  background: transparent;
  border: 1px solid #ccc;
  color: #333;
}
.btn-outline-secondary:hover {
  background: #f4f4f4;
}
</style>
