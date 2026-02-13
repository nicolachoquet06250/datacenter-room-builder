<script lang="ts">
type Props = {
  selectedCircuitIndices: number[];
  circuits: Circuit[];
  coord?: string | null;
}

type Emits = {
  (e: 'delete-selection'): void;
  (e: 'update-name', index: number, value: string): void;
  (e: 'update-rotation', index: number, value: number): void;
  (e: 'update-x', index: number, value: number): void;
  (e: 'update-y', index: number, value: number): void;
  (e: 'coord-updated', evt: Event): void;
}
</script>

<script setup lang="ts">
import {computed, type ComputedRef, inject} from 'vue';

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isMultiple = computed(() => props.selectedCircuitIndices.length > 1);

const firstCircuit = computed(() => {
  if (props.selectedCircuitIndices.length === 0) return null;
  return props.circuits[props.selectedCircuitIndices[0]!] || null;
});

const langs = inject<ComputedRef<Record<string, string>>>('langs', computed(() => ({})))

const onNameInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update-name', props.selectedCircuitIndices[0]!, target.value);
};

const onCoordChange = (event: Event) => {
  emit('coord-updated', event);
};
</script>

<template>
  <div>
    <div class="panel-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon">
        <path d="M18 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3 3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Z"/>
        <path d="M13 9h2"/>
        <path d="M9 9h2"/>
        <path d="M11 4H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h6"/>
        <circle cx="11" cy="9" r="2"/>
      </svg>
      <h3>{{ langs['FloorPlanBuilder:Panels:Circuits:Title'] }}</h3>
    </div>

    <div v-if="!isMultiple && firstCircuit" class="property-form">
      <div class="form-group">
        <label>{{ langs['FloorPlanBuilder:Panels:Circuits:Name'] }}</label>
        <input type="text" :value="firstCircuit.name" @input="onNameInput" />
      </div>

      <div class="form-group">
        <label>{{ langs['FloorPlanBuilder:Panels:Circuits:Coordinates'] }} (ex: A1)</label>
        <input type="text" :value="coord ?? ''" placeholder="A1, B2, AA5..." @input="onCoordChange" />
      </div>
    </div>

    <div v-else-if="isMultiple" class="property-info">
      <span class="info-label">{{ langs['FloorPlanBuilder:Panels:Circuits:Multiple:Title'] }}</span>
      <span class="info-value">{{ selectedCircuitIndices.length }}</span>
    </div>

    <div class="actions">
      <button @click="$emit('delete-selection')" class="btn btn-danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
        {{ langs['FloorPlanBuilder:Panels:Circuits:Remove'] }}
      </button>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.property-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  > .form-group {
    width: 100%;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  width: calc(50% - 10px);
}

label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

input {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #1e293b;
}

.property-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 6px;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.actions {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #f3f4f6;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
}
</style>
