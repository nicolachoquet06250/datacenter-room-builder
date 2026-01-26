<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  selectedSegments: Array<{ pathIndex: number; segmentIndex: number }>;
  circuits: Point[][];
}>();

defineEmits<{
  (e: 'delete-selection'): void;
}>();

const sectionCount = computed(() => {
  if (props.selectedSegments.length === 0) return 0;
  
  // Si on a sélectionné un chemin entier, on compte ses segments
  // Dans RoomBuilder.vue, selectCircuitPath sélectionne tous les segments d'un chemin.
  // Si on a sélectionné plusieurs segments éparpillés (pas encore possible via l'UI mais prévu par le type),
  // on affiche simplement le nombre de segments sélectionnés.
  return props.selectedSegments.length;
});

const isWholePath = computed(() => {
  if (props.selectedSegments.length === 0) return false;
  const pathIndex = props.selectedSegments[0]!.pathIndex;
  const circuit = props.circuits[pathIndex];
  if (!circuit) return false;
  
  // Vérifier si tous les segments du chemin sont sélectionnés
  const pathSegments = props.selectedSegments.filter(s => s.pathIndex === pathIndex);
  return pathSegments.length === circuit.length - 1;
});
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
      <h3>Propriétés du Circuit</h3>
    </div>

    <div class="property-info">
      <span class="info-label">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        Nombre de sections
      </span>
      <span class="info-value">{{ sectionCount }}</span>
    </div>

    <div v-if="isWholePath" class="property-info">
      <span class="info-label">Type</span>
      <span class="info-value">Chemin complet</span>
    </div>
    <div v-else class="property-info">
      <span class="info-label">Type</span>
      <span class="info-value">Segment(s) individuel(s)</span>
    </div>

    <div class="actions">
      <button @click="$emit('delete-selection')" class="btn btn-danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
        Supprimer la sélection
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
  background-color: #fee2e2;
}
</style>
