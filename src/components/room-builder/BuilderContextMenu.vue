<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  options: { type: string; podId?: string };
}>();

const emit = defineEmits<{
  (e: 'create-pod'): void;
  (e: 'leave-pod'): void;
  (e: 'delete-pod', podId: string): void;
}>();
</script>

<template>
  <div v-if="props.show" class="context-menu" :style="{ top: props.y + 'px', left: props.x + 'px' }">
    <ul>
      <li v-if="props.options.type === 'create_pod'" @click="emit('create-pod')">Créer un nouveau pod</li>
      <li v-if="props.options.type === 'leave_pod'" @click="emit('leave-pod')">Sortir du pod</li>
      <li v-if="props.options.type === 'delete_pod'" @click="emit('delete-pod', props.options.podId!)">Supprimer le pod</li>
    </ul>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
  z-index: 1000;
}
.context-menu ul {
  list-style: none;
  margin: 0;
  padding: 5px 0;
}
.context-menu li {
  padding: 8px 15px;
  cursor: pointer;
}
.context-menu li:hover {
  background-color: #f0f0f0;
}
</style>
