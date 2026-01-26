import { ref, type Ref } from 'vue';

export const useWallResizer = (walls: Ref<Point[]>) => {
  const draggingWallSegment = ref<{ index: number; isHorizontal: boolean } | null>(null);

  const startDraggingWall = (index: number, isHorizontal: boolean) => {
    draggingWallSegment.value = { index, isHorizontal };
  };

  const stopDraggingWall = () => {
    draggingWallSegment.value = null;
  };

  const dragWall = (x: number, y: number) => {
    if (draggingWallSegment.value === null) return;

    const { index, isHorizontal } = draggingWallSegment.value;
    const snapX = Math.round(x / 20) * 20;
    const snapY = Math.round(y / 20) * 20;

    const newWalls = walls.value.map(p => ({ ...p }));
    const n = newWalls.length;
    if (n === 0) return;
    
    const i1 = index;
    const i2 = (index + 1) % n;

    if (isHorizontal) {
      // Déplacement vertical pour un mur horizontal
      newWalls[i1]!.y = snapY;
      newWalls[i2]!.y = snapY;
      
      // Ajuster les murs adjacents pour maintenir l'orthogonalité
      const prev = (i1 - 1 + n) % n;
      const next = (i2 + 1) % n;
      
      newWalls[prev]!.x = newWalls[i1]!.x;
      newWalls[next]!.x = newWalls[i2]!.x;
    } else {
      // Déplacement horizontal pour un mur vertical
      newWalls[i1]!.x = snapX;
      newWalls[i2]!.x = snapX;

      // Ajuster les murs adjacents pour maintenir l'orthogonalité
      const prev = (i1 - 1 + n) % n;
      const next = (i2 + 1) % n;
      
      newWalls[prev]!.y = newWalls[i1]!.y;
      newWalls[next]!.y = newWalls[i2]!.y;
    }

    walls.value = newWalls;
  };

  return {
    draggingWallSegment,
    startDraggingWall,
    stopDraggingWall,
    dragWall
  };
};
