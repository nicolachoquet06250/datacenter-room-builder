<script lang="ts">
type Props = {
  selectedRackIndices: number[];
  contextMenuOptions: {type: string, podId?: string}
}

type Emits = {
  (e: 'create-pod'): void;
  (e: 'leave-pod'): void;
  (e: 'delete-pod'): void;
  (e: 'clear-selection'): void;
}
</script>

<script setup lang="ts">
import * as pods from "./pods";
import {computed, type ComputedRef, inject} from "vue";

defineProps<Props>();

defineEmits<Emits>();

const langs = inject<ComputedRef<Record<string, string>>>('langs', computed(() => ({})))
</script>

<template>
  <div>
    <div class="panel-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="header-icon"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
      <h3>{{ langs['FloorPlanBuilder:Panels:Racks:Multiple:Title'] }}</h3>
    </div>

    <p class="selection-count">
      {{ selectedRackIndices.length }} {{ langs['FloorPlanBuilder:Panels:Racks:Multiple:SelectedElements'] }}
    </p>

    <div class="actions">
      <component
          :is="pods[contextMenuOptions.type as keyof typeof pods]"

          @create-pod="$emit('create-pod')"
          @delete-pod="$emit('delete-pod')"
          @leave-pod="$emit('leave-pod')"
      />
      <component
          :is="pods.ClearSelection"
          @clear-selection="$emit('clear-selection')"
      />
    </div>
  </div>
</template>

<style scoped>
.selection-count {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.5rem 0 1.25rem 0;
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 1.25rem;
}
</style>