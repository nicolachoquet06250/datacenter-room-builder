<script lang="ts">
type Props = {
  footprint: Footprint,
  useItopForm: boolean
}

type Emits = {
  (e: 'delete-footprint', id: string): void;
  (e: 'change-color', id: string): void;
  (e: 'update-x', id: string, value: number): void;
  (e: 'update-y', id: string, value: number): void;
  (e: 'update-name', id: string, value: string): void;
  (e: 'update-rotation', id: string, value: number): void;
}
</script>

<script setup lang="ts">
import {computed, type ComputedRef, inject} from 'vue';

const props = defineProps<Props>()

defineEmits<Emits>()

const minX = computed(() => {
  if (!props.footprint.units?.length) return 0;
  return Math.min(...props.footprint.units.map(u => u.x));
});

const minY = computed(() => {
  if (!props.footprint.units?.length) return 0;
  return Math.min(...props.footprint.units.map(u => u.y));
});

const langs = inject<ComputedRef<Record<string, string>>>('langs', computed(() => ({})))
</script>

<template>
  <div>
    <div class="panel-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>
      <h3>{{ langs['FloorPlanBuilder:Panels:Footprints:Title'] }}</h3>
    </div>

    <div class="property-info">
      <span class="info-label">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3H3v18h18V3zM8 6h8v2H8V6zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>
        ID
      </span>
      <span class="info-value">{{ footprint.id }}</span>
    </div>

    <div class="property-group">
      <label for="footprint-name">{{ langs['FloorPlanBuilder:Panels:Footprints:Name'] }}</label>
      <input
          id="footprint-name"
          type="text"
          :value="footprint.name"
          @input="(e) => $emit('update-name', footprint.id, (e.target as HTMLInputElement).value)"
          placeholder="Nom du footprint"
      />
    </div>

    <div class="property-info">
      <span class="info-label">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12l-1.41-1.41L13 17.17V3h-2v14.17l-6.59-6.58L3 12l9 9 9-9z"/></svg>
        {{ langs['FloorPlanBuilder:Panels:Footprints:Units'] }}
      </span>
      <span class="info-value">{{ footprint.units?.length }}</span>
    </div>

    <div class="property-row">
      <div class="property-group">
        <label for="footprint-x">X</label>
        <input
            id="footprint-x"
            type="number"
            :value="minX"
            step="20"
            @input="(e) => $emit('update-x', footprint.id, Number((e.target as HTMLInputElement).value))"
        />
      </div>
      <div class="property-group">
        <label for="footprint-y">Y</label>
        <input
            id="footprint-y"
            type="number"
            :value="minY"
            step="20"
            @input="(e) => $emit('update-y', footprint.id, Number((e.target as HTMLInputElement).value))"
        />
      </div>
    </div>

    <div class="property-group">
      <label for="footprint-rotation">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        {{ langs['FloorPlanBuilder:Panels:Footprints:Rotation'] }} (° )
      </label>
      <div class="input-with-suffix">
        <input
            id="footprint-rotation"
            type="number"
            :value="footprint.rotation ?? 0"
            step="90"
            @input="(e) => $emit('update-rotation', footprint.id, Number((e.target as HTMLInputElement).value))"
        />
        <span class="suffix">deg</span>
      </div>
    </div>

    <div class="property-group">
      <label>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
        {{ langs['FloorPlanBuilder:Panels:Footprints:Color'] }}
      </label>
      <div class="color-preview-container" @click="$emit('change-color', footprint.id)">
        <div class="color-preview" :style="{ backgroundColor: footprint.color }"></div>
        <span class="color-value">{{ footprint.color }}</span>
        <button class="btn-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
        </button>
      </div>
    </div>

    <div class="actions" v-if="!useItopForm || (footprint.units ?? []).length > 0">
      <button @click="$emit('delete-footprint', footprint.id)" class="btn btn-danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        {{ langs['FloorPlanBuilder:Panels:Footprints:Remove'] }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.property-row {
  display: flex;
  gap: 1rem;
}

.property-row .property-group {
  flex: 1;
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
  right: 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  pointer-events: none;
  text-transform: uppercase;
}

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

.property-group label svg {
  color: #9ca3af;
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
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  font-family: monospace;
}

.color-preview-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.color-preview-container:hover {
  border-color: #2563eb;
  background: #f0f9ff;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1);
}

.color-value {
  flex: 1;
  font-size: 0.875rem;
  color: #111827;
  font-family: monospace;
}

.btn-icon {
  background: none;
  border: none;
  color: #64748b;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 1.25rem;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #fee2e2;
}
</style>
