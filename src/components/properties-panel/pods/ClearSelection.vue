<script lang="ts">
type Emits = {
  (e: 'clear-selection'): void;
}
</script>

<script setup lang="ts">
defineEmits<Emits>()
</script>

<template>
  <button @click="$emit('clear-selection')" class="btn btn-outline">
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
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    Désélectionner tout
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

.btn-outline {
  background-color: transparent;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-outline:hover:not(:disabled) {
  background-color: #f8fafc;
  color: #1e293b;
  border-color: #cbd5e1;
}
</style>