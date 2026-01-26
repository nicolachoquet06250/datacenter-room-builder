<script setup lang="ts">
defineEmits<{
  (e: 'create-pod'): void
}>()
</script>

<template>
  <button @click="$emit('create-pod')" class="btn btn-secondary">
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
      <path d="m21 8-9-4-9 4 9 4 9-4z"/>
      <path d="M21 12l-9 4-9-4"/>
      <path d="M21 16l-9 4-9-4"/>
    </svg>
    Créer un pod
  </button>
</template>

<style scoped>
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

.btn-secondary {
  background-color: #f8fafc;
  color: #475569;
  border-color: #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}
</style>