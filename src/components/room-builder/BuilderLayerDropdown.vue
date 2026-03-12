<script setup lang="ts">
defineProps<{
  layers: Layer[];
  langKeys: Record<string, string>;
  radius: string
}>()

const currentLayerIndex = defineModel<number>('currentLayerIndex');
</script>

<template>
  <div class="layer-dropdown-container">
    <label>
      <span class="layer-dropdown-label">Layer courent:</span>
      <select v-model="currentLayerIndex" class="layer-dropdown">
        <option
            v-for="(layer, index) in (layers as Layer[])"
            :key="`layer-option-${layer.id}`"
            :value="index"
        >
          {{ langKeys[layer.name] }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.layer-dropdown-container {
  width: 100%;
  border-radius: v-bind(radius);
}

.layer-dropdown-label {
  color: #ffffff;
}

.layer-dropdown {
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: white;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  outline: none;
}

.layer-dropdown:focus {
  border-color: #004a99;
}
</style>