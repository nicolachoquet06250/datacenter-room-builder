<script setup lang="ts">
defineProps<{
  layers: Layer[];
  langKeys: Record<string, string>;
}>()

const currentLayerIndex = defineModel<number>('currentLayerIndex');
</script>

<template>
  <div class="layer-dropdown-container">
    <select v-model="currentLayerIndex" class="layer-dropdown">
      <option
          v-for="(layer, index) in (layers as Layer[])"
          :key="`layer-option-${layer.id}`"
          :value="index"
      >
        {{ langKeys[layer.name] }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.layer-dropdown-container {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1;
}

.layer-dropdown {
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