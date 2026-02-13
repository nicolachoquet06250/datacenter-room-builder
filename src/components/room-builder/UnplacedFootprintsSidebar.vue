<script setup lang="ts">
import {computed, type ComputedRef, inject} from "vue";

defineProps<{
  footprints: Footprint[];
  selectedFootprintId: string | null;
}>();

const emit = defineEmits<{
  (e: 'select-footprint', id: string): void;
  (e: 'drag-start', event: DragEvent, footprint: Footprint): void;
}>();

const langs = inject<ComputedRef<Record<string, string>>>('langs', computed(() => ({})))

const onDragStart = (event: DragEvent, footprint: Footprint) => {
  emit('drag-start', event, footprint);
  emit('select-footprint', footprint.id);
  
  if (event.dataTransfer) {
    event.dataTransfer.setData('footprintId', footprint.id);
    event.dataTransfer.effectAllowed = 'move';
    
    // Create a ghost image for better UX
    const ghost = document.createElement('div');
    ghost.style.width = `${(footprint.width || 1200) / 600 * 20}px`;
    ghost.style.height = `${(footprint.height || 1200) / 600 * 20}px`;
    ghost.style.backgroundColor = footprint.color || '#cbd5e0';
    ghost.style.opacity = '0.5';
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    document.body.appendChild(ghost);
    
    event.dataTransfer.setDragImage(ghost, ((footprint.width || 1200) / 600 * 20) / 2, ((footprint.height || 1200) / 600 * 20) / 2);
    
    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);
  }
};
</script>

<template>
  <div class="unplaced-footprints-sidebar">
    <div class="sidebar-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 3h18v18H3z"/>
        <path d="M3 9h18"/>
        <path d="M3 15h18"/>
        <path d="M9 3v18"/>
        <path d="M15 3v18"/>
      </svg>
      <h3>{{ langs['FloorPlanBuilder:Panels:FootprintsToSetPosition:Title'] }}</h3>
    </div>
    <div class="footprints-list">
      <div
        v-for="footprint in footprints"
        :key="footprint.id"
        class="footprint-item"
        :class="{ active: selectedFootprintId === footprint.id }"
        draggable="true"
        @dragstart="onDragStart($event, footprint)"
        @click="$emit('select-footprint', footprint.id)"
      >
        <div class="footprint-icon" :style="{ backgroundColor: footprint.color || '#cbd5e0' }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
        </div>
        <div class="footprint-info">
          <div class="footprint-name">{{ footprint.name || langs['FloorPlanBuilder:Panels:FootprintToSetPosition:Unnamed'] }}</div>
          <div class="footprint-status">{{ footprint.width }}mm x {{ footprint.height }}mm - {{ langs['FloorPlanBuilder:Panels:FootprintToSetPosition:MissingPosition'] }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unplaced-footprints-sidebar {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 240px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  max-height: calc(100% - 2rem);
  z-index: 9;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.footprints-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.footprint-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  margin-bottom: 0.25rem;
}

.footprint-item:hover {
  background-color: #f1f5f9;
}

.footprint-item.active {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.footprint-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: white;
}

.footprint-info {
  flex: 1;
  min-width: 0;
}

.footprint-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.footprint-status {
  font-size: 0.75rem;
  color: #94a3b8;
}
</style>
