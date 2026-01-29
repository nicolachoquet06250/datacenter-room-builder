import { computed, ref, type Ref } from 'vue';
import { useLayers } from './useLayers';

export const usePillars = (walls: Ref<Point[]>) => {
  const isDrawingPillar = ref(false);
  const pillarPreviewPoint = ref<Point | null>(null);

  const selectedPillarIndices = ref<number[]>([]);
  const draggingPillarIndex = ref<number | null>(null);

  const { layers } = useLayers(walls);

  const pillars = computed({
    get: () => layers.value[0]?.pillars ?? [],
    set: (val) => {
      layers.value.forEach(layer => {
        layer.pillars = JSON.parse(JSON.stringify(val));
      });
    }
  });

  const toggleIsDrawingPillar = () => {
    isDrawingPillar.value = !isDrawingPillar.value;
    if (isDrawingPillar.value) {
      selectedPillarIndices.value = [];
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
    selectedPillarIndices.value = selectedPillarIndices.value
      .filter(i => i !== index)
      .map(i => i > index ? i - 1 : i);
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
    selectedPillarIndices,
    draggingPillarIndex,
    pillars,
    toggleIsDrawingPillar,
    addPillar,
    removePillar,
    movePillar
  };
};
