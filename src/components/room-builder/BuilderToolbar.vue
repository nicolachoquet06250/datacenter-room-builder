<script lang="ts">
type Props = {
  undoDisabled: boolean;
  redoDisabled: boolean;
  canAddRack: boolean;
  showAddRack: boolean;
  canClearWalls: boolean;
  isDrawingWalls: boolean;
  isDrawingPillar: boolean;
  zoomLevel: number;
  canZoomOut: boolean;
  canZoomIn: boolean;
  selectedLayoutIndex: number | null;
  radius: number;
}

type Emits = {
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'addRack'): void;
  (e: 'toggleWalls'): void;
  (e: 'togglePillar'): void;
  (e: 'clearWalls'): void;
  (e: 'zoomOut'): void;
  (e: 'zoomIn'): void;
  (e: 'save'): void;
}
</script>

<script setup lang="ts">
import {computed} from "vue";

const props = defineProps<Props>();

defineEmits<Emits>();

const roomName = defineModel<string>('roomName');

const radius = computed(() => `${props.radius}px`);
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-section room-info">
      <input 
        v-model="roomName"
        placeholder="Nom de la salle"
        title="Nom de la salle"
      />
    </div>

    <div class="toolbar-divider"/>

    <div class="toolbar-section history-controls">
      <button
          class="toolbar-btn"
          :disabled="undoDisabled"
          title="Annuler (Ctrl+Z)"
          @click="$emit('undo')"
      >
        <span class="icon">↶</span>
      </button>

      <button
          class="toolbar-btn"
          :disabled="redoDisabled"
          title="Rétablir (Ctrl+Maj+Z)"
          @click="$emit('redo')"
      >
        <span class="icon">↷</span>
      </button>
    </div>

    <div class="toolbar-divider"/>

    <div class="toolbar-section zoom-controls">
      <button
          class="toolbar-btn"
          :disabled="!canZoomOut"
          title="Zoom arrière"
          @click="$emit('zoomOut')"
      >-</button>

      <span class="zoom-text">
        {{ Math.round(zoomLevel * 100) }}%
      </span>

      <button
          class="toolbar-btn"
          :disabled="!canZoomIn"
          title="Zoom avant"
          @click="$emit('zoomIn')"
      >+</button>
    </div>

    <template v-if="showAddRack">
      <div class="toolbar-divider"/>

      <div class="toolbar-section rack-controls">
        <button
            class="toolbar-btn"
            @click="$emit('addRack')"
            :disabled="!canAddRack"
            :title="!canAddRack ? 'Dessinez d\'abord les murs pour ajouter des racks' : 'Ajouter un rack'"
        >
          <span class="icon">+</span>

          <span class="label">Rack</span>
        </button>
      </div>
    </template>

    <div class="toolbar-section action-controls" v-if="selectedLayoutIndex === 0">
      <div class="toolbar-divider"/>

      <button
          class="toolbar-btn"
          :class="{ 'active': isDrawingWalls }"
          @click="$emit('toggleWalls')"
          :title="isDrawingWalls ? 'Arrêter les murs' : 'Dessiner les murs'"
      >
        <span class="icon">✏️</span>

        <span class="label">Murs</span>
      </button>

      <button
          class="toolbar-btn"
          :class="{ 'active': isDrawingPillar }"
          @click="$emit('togglePillar')"
          :title="isDrawingPillar ? 'Arrêter les poteaux' : 'Dessiner des poteaux'"
      >
        <span class="icon">⬛</span>
        <span class="label">Poteaux</span>
      </button>

      <button
          v-if="canClearWalls"
          class="toolbar-btn btn-danger"
          @click="$emit('clearWalls')"
          title="Supprimer la pièce"
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
        <span class="label">Sauvegarder</span>
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
