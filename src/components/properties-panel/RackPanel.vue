<script lang="ts">
type Props = {
  podId?: string|null,
  name: string,
  rotation?: number|null
}

type Emits = {
  (e: 'remove-rack'): void;
  (e: 'name-updated', evt: Event): void;
  (e: 'rotation-changed', evt: Event): void;
}
</script>

<script setup lang="ts">
defineProps<Props>()

defineEmits<Emits>()
</script>

<template>
  <div>
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
          :value="name"
          placeholder="Ex: Rack A01"
          @input="$emit('name-updated', $event)"
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
            :value="rotation ?? 0"
            step="45"
            @input="$emit('rotation-changed', $event)"
        />
        <span class="suffix">deg</span>
      </div>
    </div>

    <div v-if="podId" class="property-info">
        <span class="info-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-4-9 4 9 4 9-4z"/><path d="M21 12l-9 4-9-4"/><path d="M21 16l-9 4-9-4"/></svg>
          Pod ID
        </span>
      <span class="info-value">{{ podId }}</span>
    </div>

    <div class="actions">
      <button @click="$emit('remove-rack')" class="btn btn-danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        Supprimer le rack
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

.property-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: #f9fafb;
  border-radius: 6px;
  border: 1px solid #f3f4f6;
  margin-top: 1rem;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.info-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: #111827;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #fee2e2;
}
</style>