<script setup lang="ts">
defineProps<{
  podId: string;
}>()

defineEmits<{
  (e: 'leave-pod'): void
}>()
</script>

<template>
  <button @click="$emit('leave-pod')" class="btn btn-secondary">
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
      <path d="m9 11-4 4 4 4"/>
      <path d="M5 15h11a4 4 0 0 0 0-8h-1"/>
    </svg>
    Sortir du pod
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  line-height: 1.25rem;
  width: 100%;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

.btn-secondary:active:not(:disabled) {
  background-color: #545b62;
}
</style>