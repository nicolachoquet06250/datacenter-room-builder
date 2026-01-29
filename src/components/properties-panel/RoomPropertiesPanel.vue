<script lang="ts">
type Props = {
  wallCount: number;
  unitCount: number;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<Props>();

const UNIT_SIZE_MM = 600;
const UNIT_SIZE_M = UNIT_SIZE_MM / 1000;
const UNIT_AREA_M2 = UNIT_SIZE_M * UNIT_SIZE_M;

const totalArea = computed(() => (props.unitCount * UNIT_AREA_M2).toFixed(2));
</script>

<template>
  <div class="panel-header">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
    <h3>Propriétés de la pièce</h3>
  </div>

  <div class="room-properties">
    <div class="property-group">
      <label>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        Nombre de murs
      </label>
      <input type="text" :value="wallCount" disabled />
    </div>

    <div class="property-group">
      <label>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
        Nombre d'unités
      </label>
      <input type="text" :value="unitCount" disabled />
    </div>

    <div class="property-group">
      <label>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        Superficie totale
      </label>
      <div class="area-value">
        <input type="text" :value="totalArea" disabled />
        <span class="unit">m²</span>
      </div>
      <small class="helper-text">Basé sur une unité de 600mm</small>
    </div>
  </div>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.header-icon {
  color: #3b82f6;
}

.property-group {
  margin-bottom: 1.25rem;
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

input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #111827;
  background-color: #f9fafb;
  box-sizing: border-box;
}

.area-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.area-value input {
  flex: 1;
}

.unit {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4b5563;
}

.helper-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
