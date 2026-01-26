import { computed, ref, type Ref } from 'vue';
import { useLayers } from './useLayers';

export const usePillars = (walls: Ref<Point[]>) => {
  const isDrawingPillar = ref(false);
  const pillarPreviewPoint = ref<Point | null>(null);

  const selectedPillarIndex = ref<number | null>(null);
  const draggingPillarIndex = ref<number | null>(null);

  const { layers, currentLayerIndex } = useLayers(walls);

  const pillars = computed({
    get: () => layers.value[currentLayerIndex.value]?.pillars ?? [],
    set: (val) => {
      if (layers.value[currentLayerIndex.value]) {
        layers.value[currentLayerIndex.value]!.pillars = val;
      }
    }
  });

  const toggleIsDrawingPillar = () => {
    isDrawingPillar.value = !isDrawingPillar.value;
    if (isDrawingPillar.value) {
      selectedPillarIndex.value = null;
    } else {
      pillarPreviewPoint.value = null;
    }
  };

  const addPillar = (point: Point) => {
    const newPillars = [...pillars.value];
    // Éviter les doublons au même endroit
    if (!newPillars.some(p => p.x === point.x && p.y === point.y)) {
      newPillars.push(point);
      pillars.value = newPillars;
    }
  };

  const removePillar = (index: number) => {
    const newPillars = [...pillars.value];
    newPillars.splice(index, 1);
    pillars.value = newPillars;
    if (selectedPillarIndex.value === index) {
      selectedPillarIndex.value = null;
    }
  };

  const movePillar = (index: number, point: Point) => {
    const newPillars = [...pillars.value];
    if (newPillars[index]) {
      newPillars[index] = { ...point };
      pillars.value = newPillars;
    }
  };

  return {
    isDrawingPillar,
    pillarPreviewPoint,
    selectedPillarIndex,
    draggingPillarIndex,
    pillars,
    toggleIsDrawingPillar,
    addPillar,
    removePillar,
    movePillar
  };
};
