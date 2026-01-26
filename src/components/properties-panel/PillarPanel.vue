<script setup lang="ts">
defineProps<{
  selectedPillar: Point | null
  selectedPillarIndex?: number | null
}>()

defineEmits<{
  (e: 'delete-pillar'): void
}>()
</script>

<template>
  <div class="panel-header">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
    <h3>Propriétés du poteau</h3>
  </div>

  <div v-if="selectedPillar" class="pillar-properties">
    <div class="property-group">
      <label>Position X</label>
      <input type="number" :value="selectedPillar.x" disabled />
    </div>
    <div class="property-group">
      <label>Position Y</label>
      <input type="number" :value="selectedPillar.y" disabled />
    </div>

    <div class="actions">
      <button class="btn btn-danger" @click="$emit('delete-pillar')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        Supprimer le poteau
      </button>
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

input,
select {
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

.property-group {
  margin-bottom: 1rem;
}
</style>