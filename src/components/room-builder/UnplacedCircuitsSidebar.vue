<script setup lang="ts">
defineProps<{
  circuits: Circuit[];
  selectedCircuitId: string | null;
}>();

const emit = defineEmits<{
  (e: 'select-circuit', id: string): void;
  (e: 'drag-start', event: DragEvent, circuit: Circuit): void;
}>();

const itop_url = import.meta.env.VITE_ITOP_BASE_URL;
const circuitWidth = 40;
const circuitHeight = 40;

const onDragStart = (event: DragEvent, circuit: Circuit) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('circuitId', String(circuit.id));
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';

    // Créer une image fantôme SVG qui ressemble au circuit dans le canvas
    const svgNS = "http://www.w3.org/2000/svg";
    const dragIcon = document.createElementNS(svgNS, "svg");
    dragIcon.setAttribute("width", circuitWidth.toString());
    dragIcon.setAttribute("height", circuitHeight.toString());
    dragIcon.setAttribute("viewBox", `0 0 ${circuitWidth} ${circuitHeight}`);
    dragIcon.style.position = 'absolute';
    dragIcon.style.top = '-1000px';
    dragIcon.style.left = '-1000px';
    
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", circuitWidth.toString());
    rect.setAttribute("height", circuitHeight.toString());
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "#63b3ed");
    rect.setAttribute("stroke-width", "2");
    dragIcon.appendChild(rect);

    const icon = document.createElementNS(svgNS, "image");
    icon.setAttribute("x", "0");
    icon.setAttribute("y", "0");
    icon.setAttribute("width", circuitWidth.toString());
    icon.setAttribute("height", circuitHeight.toString());
    icon.setAttribute("href", `${itop_url}/env-production/Electricite/images/circuitelec.jpg`);
    icon.setAttribute("preserveAspectRatio", "xMidYMid slice");
    dragIcon.appendChild(icon);

    document.body.appendChild(dragIcon);
    
    event.dataTransfer.setDragImage(dragIcon, circuitWidth / 2, circuitHeight / 2);
    
    // Nettoyer l'élément après un court délai
    setTimeout(() => {
      document.body.removeChild(dragIcon);
    }, 0);
  }
  emit('drag-start', event, circuit);
};
</script>

<template>
  <div class="unplaced-circuits-sidebar">
    <div class="sidebar-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3 3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Z"/>
        <path d="M13 9h2"/>
        <path d="M9 9h2"/>
        <path d="M11 4H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h6"/>
        <circle cx="11" cy="9" r="2"/>
      </svg>
      <h3>Circuits à positionner</h3>
    </div>
    <div class="circuits-list">
      <div
        v-for="circuit in circuits"
        :key="circuit.id"
        class="circuit-item"
        :class="{ active: selectedCircuitId === String(circuit.id) }"
        draggable="true"
        @dragstart="onDragStart($event, circuit)"
        @click="$emit('select-circuit', String(circuit.id))"
      >
        <div class="circuit-icon">
           <img :src="`${itop_url}/env-production/Electricite/images/circuitelec.jpg`" alt="circuit" width="24" height="24" style="border-radius: 4px;" />
        </div>
        <div class="circuit-info">
          <div class="circuit-name">{{ circuit.name }}</div>
          <div class="circuit-status">Position manquante</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unplaced-circuits-sidebar {
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

.circuits-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.circuit-item {
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

.circuit-item:hover {
  background-color: #f1f5f9;
}

.circuit-item.active {
  background-color: #eff6ff;
  border-color: #3b82f6;
}

.circuit-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f1f5f9;
  border-radius: 6px;
  color: #64748b;
}

.active .circuit-icon {
  background: #dbeafe;
  color: #3b82f6;
}

.circuit-info {
  flex: 1;
  min-width: 0;
}

.circuit-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.circuit-status {
  font-size: 0.75rem;
  color: #94a3b8;
}
</style>
