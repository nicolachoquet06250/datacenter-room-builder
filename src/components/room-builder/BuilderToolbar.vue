<script lang="ts">
type Props = {
  undoDisabled: boolean;
  redoDisabled: boolean;
  canAddRack: boolean;
  showAddRack: boolean;
  canAddCircuit: boolean;
  showAddCircuit: boolean;
  canClearWalls: boolean;
  isDrawingWalls: boolean;
  isDrawingPillar: boolean;
  zoomLevel: number;
  canZoomOut: boolean;
  canZoomIn: boolean;
  selectedLayerIndex: number | null;
  radius: number;
  disableAddRacks: boolean
}

type Emits = {
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'add-rack'): void;
  (e: 'add-circuit'): void;
  (e: 'toggle-walls'): void;
  (e: 'toggle-pillar'): void;
  (e: 'clear-walls'): void;
  (e: 'zoom-out'): void;
  (e: 'zoom-in'): void;
  (e: 'reset-pan'): void;
  (e: 'save'): void;
}
</script>

<script setup lang="ts">
import {computed, type ComputedRef, inject} from "vue";

const props = defineProps<Props>();

defineEmits<Emits>();

const roomName = defineModel<string>('roomName');

const radius = computed(() => `${props.radius}px`);

const langs = inject<ComputedRef<Record<string, string>>>('langs', computed(() => ({})))
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-section room-info">
      <input 
        v-model="roomName"
        placeholder="Nom de la salle"
        :title="langs['FloorPlanBuilder:Toolbar:Room:Name']"
      />
    </div>

    <div class="toolbar-divider"/>

    <div class="toolbar-section history-controls">
      <button
          class="toolbar-btn"
          :disabled="undoDisabled"
          :title="`${langs['FloorPlanBuilder:Toolbar:History:Previous']} (Ctrl+Z)`"
          @click="$emit('undo')"
      >
        <span class="icon">↶</span>
      </button>

      <button
          class="toolbar-btn"
          :disabled="redoDisabled"
          :title="`${langs['FloorPlanBuilder:Toolbar:History:Next']} (Ctrl+Maj+Z)`"
          @click="$emit('redo')"
      >
        <span class="icon">↷</span>
      </button>
    </div>

    <div class="toolbar-divider"/>

    <div class="toolbar-section zoom-controls">
      <button
          class="toolbar-btn"
          :title="langs['FloorPlanBuilder:Toolbar:Move:Center']"
          @click="$emit('reset-pan')"
      >
        <span class="icon">🎯</span>
      </button>

      <div class="toolbar-divider"/>

      <button
          class="toolbar-btn"
          :disabled="!canZoomOut"
          :title="langs['FloorPlanBuilder:Toolbar:Zoom:Out']"
          @click="$emit('zoom-out')"
      >-</button>

      <span class="zoom-text">
        {{ Math.round(zoomLevel * 100) }}%
      </span>

      <button
          class="toolbar-btn"
          :disabled="!canZoomIn"
          :title="langs['FloorPlanBuilder:Toolbar:Zoom:In']"
          @click="$emit('zoom-in')"
      >+</button>
    </div>

    <template v-if="showAddRack && !disableAddRacks">
      <div class="toolbar-divider"/>

      <div class="toolbar-section rack-controls">
        <button
            class="toolbar-btn"
            @click="$emit('add-rack')"
            :disabled="!canAddRack"
            :title="langs['FloorPlanBuilder:Toolbar:Layers:Racks:Title']"
        >
          <span class="icon">+</span>

          <span class="label">{{ langs['FloorPlanBuilder:Toolbar:Layers:Racks'] }}</span>
        </button>
      </div>
    </template>

    <template v-if="showAddCircuit">
      <div class="toolbar-divider"/>

      <div class="toolbar-section circuit-controls">
        <button
            class="toolbar-btn"
            @click="$emit('add-circuit')"
            :disabled="!canAddCircuit"
            :title="langs['FloorPlanBuilder:Toolbar:Layers:Circuits:Title']"
        >
          <span class="icon">+</span>

          <span class="label">{{ langs['FloorPlanBuilder:Toolbar:Layers:Circuits'] }}</span>
        </button>
      </div>
    </template>

    <div class="toolbar-section action-controls" v-if="selectedLayerIndex === 0">
      <div class="toolbar-divider"/>

      <button
          class="toolbar-btn"
          :class="{ 'active': isDrawingWalls }"
          @click="$emit('toggle-walls')"
          :title="langs[`FloorPlanBuilder:Toolbar:Layers:Walls:Title:${isDrawingWalls ? 'Stop' : 'Start'}`]"
      >
        <span class="icon">✏️</span>

        <span class="label">{{ langs['FloorPlanBuilder:Toolbar:Layers:Walls'] }}</span>
      </button>

      <button
          class="toolbar-btn"
          :class="{ 'active': isDrawingPillar }"
          @click="$emit('toggle-pillar')"
          :title="langs[`FloorPlanBuilder:Toolbar:Layers:Walls:Pillars:Title:${isDrawingPillar ? 'Stop' : 'Start'}`]"
      >
        <span class="icon">⬛</span>
        <span class="label">{{ langs['FloorPlanBuilder:Toolbar:Layers:Walls:Pillars'] }}</span>
      </button>

      <button
          v-if="canClearWalls"
          class="toolbar-btn btn-danger"
          @click="$emit('clear-walls')"
          :title="langs['FloorPlanBuilder:Toolbar:Layers:Walls:Remove']"
      >
        <span class="icon">🗑️</span>
      </button>
    </div>

    <div class="toolbar-spacer"/>

    <div class="toolbar-section finish-controls">
      <span>
        <span /> = 600 mm
      </span>

      <div class="toolbar-divider"/>

      <button @click="$emit('save')" class="toolbar-btn btn-primary">
        <span class="icon">💾</span>
        <span class="label">{{ langs['FloorPlanBuilder:Toolbar:Save'] }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  height: 40px;
  padding: 0 8px;
  background: #2c3e50;
  display: flex;
  gap: 4px;
  align-items: center;
  border-bottom: 1px solid #1a252f;
  color: white;
  font-size: 13px;
  user-select: none;
  border-top-right-radius: v-bind(radius);
  border-top-left-radius: v-bind(radius);
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-section.finish-controls > span {
  display: inline-flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.toolbar-section.finish-controls > span > span {
  display: inline-block;
  height: 20px;
  width: 20px;
  border: 1px solid #1a252f;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.toolbar-spacer {
  flex: 1;
}

.room-info input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  padding: 4px 8px;
  color: white;
  font-size: 13px;
  width: 150px;
  transition: all 0.2s;
}

.room-info input:focus {
  background: rgba(255, 255, 255, 0.2);
  border-color: #3498db;
  outline: none;
}

.toolbar-btn {
  height: 28px;
  padding: 0 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #ecf0f1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.toolbar-btn:active:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background: #3498db;
  color: white;
}

.toolbar-btn.btn-primary {
  background: #27ae60;
  color: white;
  font-weight: 600;
}

.toolbar-btn.btn-primary:hover:not(:disabled) {
  background: #219150;
}

.toolbar-btn.btn-primary:active:not(:disabled) {
  background: #1e7e46;
}

.toolbar-btn.btn-danger {
  color: #e74c3c;
}

.toolbar-btn.btn-danger:hover:not(:disabled) {
  background: #e74c3c;
  color: white;
}

.toolbar-btn.btn-danger:active:not(:disabled) {
  background: #c0392b;
}

.icon {
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zoom-text {
  font-size: 11px;
  min-width: 40px;
  text-align: center;
  font-weight: 600;
  color: #bdc3c7;
}

.label {
  display: inline-block;
}

@media (max-width: 800px) {
  .label {
    display: none;
  }
}
</style>
