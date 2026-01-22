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
      <div class="panel-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
        <h3>Propriétés du Rack</h3>
      </div>
      
      <div class="property-group">
        <label for="rack-name">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          Nom du rack
        </label>
        <input
          id="rack-name"
          :value="selectedRack.name"
          placeholder="Ex: Rack A01"
          @input="onNameInput"
          @keyup.delete.stop.prevent="() => {}"
        />
      </div>

      <div class="property-group">
        <label for="rack-rotation">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Rotation (° )
        </label>
        <div class="input-with-suffix">
          <input
            id="rack-rotation"
            type="number"
            :value="selectedRack.rotation ?? 0"
            step="45"
            @change="onRotationChange"
          />
          <span class="suffix">deg</span>
        </div>
      </div>

      <div v-if="selectedRack.podId" class="property-info">
        <span class="info-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-4-9 4 9 4 9-4z"/><path d="M21 12l-9 4-9-4"/><path d="M21 16l-9 4-9-4"/></svg>
          Pod ID
        </span>
        <span class="info-value">{{ selectedRack.podId }}</span>
      </div>

      <div class="actions">
        <button @click="emit('remove-rack', props.selectedRackIndices[0]!)" class="btn btn-danger btn-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          Supprimer le rack
        </button>
      </div>
    </div>
  </div>

  <div v-else-if="props.selectedRackIndices.length > 1" class="properties-panel">
    <div>
      <div class="panel-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
        <h3>Sélection multiple</h3>
      </div>
      
      <p class="selection-count">{{ props.selectedRackIndices.length }} éléments sélectionnés</p>
      
      <div class="actions">
        <button v-if="props.contextMenuOptions.type === 'create_pod'" @click="emit('create-pod')" class="btn btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-4-9 4 9 4 9-4z"/><path d="M21 12l-9 4-9-4"/><path d="M21 16l-9 4-9-4"/></svg>
          Créer un pod
        </button>
        <button v-if="props.contextMenuOptions.type === 'leave_pod'" @click="emit('leave-pod')" class="btn btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-4 4 4 4"/><path d="M5 15h11a4 4 0 0 0 0-8h-1"/></svg>
          Sortir du pod
        </button>
        <button v-if="props.contextMenuOptions.type === 'delete_pod'" @click="emit('delete-pod', props.contextMenuOptions.podId!)" class="btn btn-danger">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          Supprimer le pod
        </button>
        <button @click="emit('clear-selection')" class="btn btn-outline">Désélectionner tout</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.properties-panel {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 300px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  padding: 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  max-height: calc(100% - 3rem);
  overflow-y: auto;
  z-index: 100;
  transition: all 0.3s ease;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #f1f5f9;
}

.header-icon {
  color: #004a99;
}

.properties-panel h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.property-group {
  margin-bottom: 1.25rem;
}

.property-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.property-group input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #1e293b;
  transition: all 0.2s;
  box-sizing: border-box;
}

.property-group input:focus {
  outline: none;
  background-color: #fff;
  border-color: #004a99;
  box-shadow: 0 0 0 3px rgba(0, 74, 153, 0.1);
}

.input-with-suffix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-suffix input {
  padding-right: 3rem;
}

.suffix {
  position: absolute;
  right: 0.875rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
}

.property-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f1f5f9;
  border-radius: 8px;
  margin-bottom: 1.25rem;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 700;
  color: #334155;
  font-family: monospace;
}

.selection-count {
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 1.5rem;
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
  height: 32px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-full {
  width: 100%;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
}

.btn-secondary {
  background-color: #004a99;
  color: white;
}

.btn-secondary:hover {
  background-color: #003a7a;
}

.btn-outline {
  background-color: transparent;
  border-color: #cbd5e1;
  color: #64748b;
}

.btn-outline:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
  color: #334155;
}
</style>
