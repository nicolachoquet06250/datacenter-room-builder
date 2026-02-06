<script setup lang="ts">
import { rackHeight, rackWidth } from '../../composables/useRoomBuilderGeometry';

defineProps<{
  racks: Rack[];
  selectedRackId: number | null;
}>();

const emit = defineEmits<{
  (e: 'select-rack', id: number): void;
  (e: 'drag-start', event: DragEvent, rack: Rack): void;
}>();

const itop_url = import.meta.env.VITE_ITOP_BASE_URL;

const onDragStart = (event: DragEvent, rack: Rack) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('rackId', rack.id.toString());
    event.dataTransfer.dropEffect = 'move';

    // Créer une image fantôme SVG qui ressemble au rack dans le canvas
    const svgNS = "http://www.w3.org/2000/svg";
    const dragIcon = document.createElementNS(svgNS, "svg");
    dragIcon.setAttribute("width", rackWidth.toString());
    dragIcon.setAttribute("height", rackHeight.toString());
    dragIcon.setAttribute("viewBox", `0 0 ${rackWidth} ${rackHeight}`);
    dragIcon.style.position = 'absolute';
    dragIcon.style.top = '-1000px';
    dragIcon.style.left = '-1000px';
    
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", rackWidth.toString());
    rect.setAttribute("height", rackHeight.toString());
    rect.setAttribute("fill", "#ffffff");
    rect.setAttribute("stroke", "#007bff");
    rect.setAttribute("stroke-width", "1");
    dragIcon.appendChild(rect);

    const icon = document.createElementNS(svgNS, "image");
    icon.setAttribute("x", "2");
    icon.setAttribute("y", "2");
    icon.setAttribute("width", "12");
    icon.setAttribute("height", "12");
    icon.setAttribute("href", `${itop_url}/images/icons/icons8-rack.svg`);
    dragIcon.appendChild(icon);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", (rackWidth / 2).toString());
    text.setAttribute("y", (rackHeight / 2).toString());
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "#333");
    text.setAttribute("font-size", "11px");
    text.setAttribute("font-weight", "500");
    text.setAttribute("font-family", "inherit");
    text.textContent = rack.name;
    dragIcon.appendChild(text);

    document.body.appendChild(dragIcon);
    
    event.dataTransfer.setDragImage(dragIcon, rackWidth / 2, rackHeight / 2);
    
    // Nettoyer l'élément après un court délai
    setTimeout(() => {
      document.body.removeChild(dragIcon);
    }, 0);
  }
  emit('drag-start', event, rack);
};
</script>

<template>
  <div class="unplaced-racks-sidebar">
    <div class="sidebar-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
      <h3>Racks à positionner</h3>
    </div>
    <div class="racks-list">
      <div
        v-for="rack in racks"
        :key="rack.id"
        class="rack-item"
        :class="{ active: selectedRackId === rack.id }"
        draggable="true"
        @dragstart="onDragStart($event, rack)"
        @click="$emit('select-rack', rack.id)"
      >
        <div class="rack-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
        </div>
        <div class="rack-info">
          <div class="rack-name">{{ rack.name }}</div>
          <div class="rack-status">Position/Rotation manquante</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unplaced-racks-sidebar {
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

.racks-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.rack-item {
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

.rack-item:hover {
  background-color: #f1f5f9;
}

.rack-item.active {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.rack-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f1f5f9;
  border-radius: 6px;
  color: #64748b;
}

.active .rack-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.rack-info {
  flex: 1;
  min-width: 0;
}

.rack-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rack-status {
  font-size: 0.75rem;
  color: #94a3b8;
}
</style>
