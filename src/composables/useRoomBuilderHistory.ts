import { ref, type Ref, type WritableComputedRef } from 'vue';

interface HistoryState {
  layers: Layer[];
  walls: Point[];
  currentLayerIndex: number;
}

interface HistoryDeps {
  layers: Ref<Layer[]>;
  walls: WritableComputedRef<Point[]>;
  currentLayerIndex: Ref<number>;
}

export const useRoomBuilderHistory = ({ layers, walls, currentLayerIndex }: HistoryDeps) => {
  const undoStack = ref<string[]>([]);
  const redoStack = ref<string[]>([]);

  const snapshotState = (): HistoryState => ({
    layers: layers.value,
    walls: walls.value,
    currentLayerIndex: currentLayerIndex.value
  });

  const takeSnapshot = () => {
    undoStack.value.push(JSON.stringify(snapshotState()));
    redoStack.value = [];
    if (undoStack.value.length > 50) {
      undoStack.value.shift();
    }
  };

  const applyState = (serializedState: string | undefined) => {
    if (!serializedState) return;
    const state = JSON.parse(serializedState) as HistoryState;
    if (state.layers) layers.value = state.layers;
    if (state.walls && !state.layers) walls.value = state.walls;
    if (state.currentLayerIndex !== undefined) currentLayerIndex.value = state.currentLayerIndex;
  };

  const undo = () => {
    if (undoStack.value.length > 0) {
      redoStack.value.push(JSON.stringify(snapshotState()));
      applyState(undoStack.value.pop());
    }
  };

  const redo = () => {
    if (redoStack.value.length > 0) {
      undoStack.value.push(JSON.stringify(snapshotState()));
      applyState(redoStack.value.pop());
    }
  };

  return {
    undoStack,
    redoStack,
    takeSnapshot,
    undo,
    redo
  };
};
