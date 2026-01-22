<script setup lang="ts">
const props = defineProps<{
  roomName: string;
  undoDisabled: boolean;
  redoDisabled: boolean;
  canAddRack: boolean;
  canClearWalls: boolean;
  isDrawingWalls: boolean;
  zoomLevel: number;
  canZoomOut: boolean;
  canZoomIn: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:roomName', value: string): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'addRack'): void;
  (e: 'toggleWalls'): void;
  (e: 'clearWalls'): void;
  (e: 'zoomOut'): void;
  (e: 'zoomIn'): void;
  (e: 'save'): void;
}>();

const onRoomNameInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:roomName', target.value);
};
</script>

<template>
  <div class="toolbar">
    <div class="room-info">
      <label>Nom: <input :value="props.roomName" @input="onRoomNameInput" /></label>
    </div>
    <div class="history-controls">
      <button class="btn btn-sm btn-secondary" @click="emit('undo')" :disabled="props.undoDisabled" title="Annuler (Ctrl+Z)">↶</button>
      <button class="btn btn-sm btn-secondary" @click="emit('redo')" :disabled="props.redoDisabled" title="Rétablir (Ctrl+Maj+Z)">↷</button>
    </div>
    <button
      class="btn btn-secondary"
      @click="emit('addRack')"
      :disabled="!props.canAddRack"
      :title="!props.canAddRack ? 'Dessinez d\'abord les murs pour ajouter des racks' : ''"
    >
      Ajouter un rack
    </button>
    <button class="btn" :class="props.isDrawingWalls ? 'btn-primary' : 'btn-secondary'" @click="emit('toggleWalls')">
      {{ props.isDrawingWalls ? 'Arrêter les murs' : 'Dessiner les murs' }}
    </button>
    <button v-if="props.canClearWalls" class="btn btn-danger" @click="emit('clearWalls')">Supprimer la pièce</button>

    <div class="zoom-controls">
      <button class="btn btn-sm btn-secondary" @click="emit('zoomOut')" :disabled="!props.canZoomOut">-</button>
      <span class="zoom-text">{{ Math.round(props.zoomLevel * 100) }}%</span>
      <button class="btn btn-sm btn-secondary" @click="emit('zoomIn')" :disabled="!props.canZoomIn">+</button>
    </div>
    <button @click="emit('save')" class="btn btn-primary">Sauvegarder</button>
    <p class="hint">Glissez les éléments pour les placer.</p>
  </div>
</template>

<style scoped>
.toolbar {
  padding: 1rem;
  background: #f4f4f4;
  display: flex;
  gap: 1rem;
  align-items: center;
  border-bottom: 1px solid #ccc;
  flex-wrap: wrap;
}
.history-controls {
  display: flex;
  gap: 5px;
}
.room-info input {
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 4px;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.zoom-text {
  font-size: 0.8rem;
  min-width: 45px;
  text-align: center;
  font-weight: 600;
  color: #374151;
}

.hint {
  font-size: 0.8rem;
  color: #666;
}
</style>
