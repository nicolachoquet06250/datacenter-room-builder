<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css';
import {computed, onMounted, onUnmounted, ref, useTemplateRef, watch} from 'vue';
import Modal from './Modal.vue';
import BuilderToolbar from './room-builder/BuilderToolbar.vue';
import BuilderCanvas from './room-builder/BuilderCanvas.vue';
import BuilderContextMenu from './room-builder/BuilderContextMenu.vue';
import BuilderPropertiesPanel from './room-builder/BuilderPropertiesPanel.vue';
import BuilderLayerPreviews from './room-builder/BuilderLayerPreviews.vue';
import {rackHeight, rackWidth, useRoomBuilderGeometry} from '../composables/useRoomBuilderGeometry';
import { useRoomBuilderHistory } from '../composables/useRoomBuilderHistory';
import { useNotify } from '../composables/useNotify';
import {useDrawRoomWalls} from "../composables/useDrawRoomWalls.ts";
import {useCanvas} from "../composables/useCanvas.ts";
import {useLayers} from "../composables/useLayers.ts";
import {usePan} from "../composables/usePan.ts";
import {useContextMenu} from "../composables/useContextMenu.ts";
import {usePodsCrud} from "../composables/usePodsCrud.ts";
import {useRacksCrud} from "../composables/useRacksCrud.ts";
import {useWalls} from "../composables/useWalls.ts";

const props = withDefaults(
  defineProps<{
    roomId: number;
    roomName: string;
    layers?: Layer[] | string;
  }>(),
  {
    layers: () => []
  }
);

const emit = defineEmits<{
  (e: 'saved', payload: { racks: Rack[]; pods: Pod[]; walls: Point[]; layers: Layer[] }): void;
}>();

const {
  getPodBoundaries, getWallBoundingBox,
  getConstrainedPoint, isPointInPolygon
} = useRoomBuilderGeometry();
const {error: notifyError} = useNotify();

const {
  layers,
  currentLayerIndex,
  clearLayers,
  initialize: initializeLayers
} = useLayers(props.layers);
const roomName = ref(props.roomName);

const {
  wallPreviewPoint, isWallSelected, isDrawingWalls, wallsRef, walls,
  cancelDrawingWalls, toggleIsDrawingWalls, createWall
} = useDrawRoomWalls();

watch(currentLayerIndex, () => {
  selectedRackIndices.value = [];
  isWallSelected.value = false;
});

const {
  canvasWidth, canvasHeight,
  updateCanvasSize
} = useCanvas(useTemplateRef<InstanceType<typeof BuilderCanvas>>('canvasComponent'));

const zoomLevel = ref(1);

const {isPanning, panStart, panStop, panRunning} = usePan(zoomLevel);

const {
  racks, selectedRackIndices,
  rotatingRack,
  panOffset, draggingRack,
  createRack: addRack,
  rotateRack,
  startDragRack, dragRack,
  startRotateRack,
  duplicateRack, copyRack,
  pastRack, updateRackName,
  updateRackRotation
} = useRacksCrud(zoomLevel, props.roomId);

const podBoundaries = computed(() => getPodBoundaries(racks.value as Rack[], pods.value));

const wallBoundingBox = computed(() => {
  if (isDrawingWalls.value) return null;
  return getWallBoundingBox(walls.value);
});

const horizontalCoords = computed(() => {
  if (!wallBoundingBox.value) return [];
  const coords = [] as Array<{ label: string; x: number; y: number }>;
  const steps = Math.floor(wallBoundingBox.value.width / 20);
  for (let i = 0; i < steps; i++) {
    const label = (i + 1).toString();
    coords.push({
      label,
      x: wallBoundingBox.value.minX + (i * 20) + 10,
      y: wallBoundingBox.value.maxY + 20
    });
  }
  return coords;
});

const verticalCoords = computed(() => {
  if (!wallBoundingBox.value) return [];
  const coords = [] as Array<{ label: string; x: number; y: number }>;
  const steps = Math.floor(wallBoundingBox.value.height / 20);
  for (let i = 0; i < steps; i++) {
    const label = String.fromCharCode(65 + (i % 26));
    let finalLabel = label;
    if (i >= 26) {
      const prefix = String.fromCharCode(65 + Math.floor(i / 26) - 1);
      finalLabel = prefix + label;
    }
    coords.push({
      label: finalLabel,
      x: wallBoundingBox.value.minX - 20,
      y: wallBoundingBox.value.maxY - (i * 20) - 10
    });
  }
  return coords;
});

const viewportRect = computed(() => {
  return {
    x: -panOffset.value.x,
    y: -panOffset.value.y,
    width: canvasWidth.value / zoomLevel.value,
    height: canvasHeight.value / zoomLevel.value
  };
});

const {
  undoStack, redoStack,
  takeSnapshot, undo, redo
} = useRoomBuilderHistory({
  layers,
  walls,
  currentLayerIndex
});

const {
  contextMenuOptions,
  contextMenu,
  openContextMenu
} = useContextMenu(
    computed(() => typeof racks.value === 'string' ? JSON.parse(racks.value) : racks.value),
    selectedRackIndices
);

const {selectWall} = useWalls();

const showClearModal = ref(false);
const clearModalConfig = ref({
  title: 'Supprimer la pièce',
  message: 'Voulez-vous vraiment supprimer la pièce ainsi que tous les racks et pods à l\'intérieur ?',
  confirmText: 'Supprimer',
  onConfirm: () => {}
});

const triggerClearWalls = () => {
  clearModalConfig.value.onConfirm = () => {
    confirmClearWalls();
    showClearModal.value = false;
  };
  showClearModal.value = true;
};

const confirmClearWalls = () => {
  takeSnapshot();
  clearLayers();
  wallsRef.value = [];
  currentLayerIndex.value = 0;
  isWallSelected.value = false;
  selectedRackIndices.value = [];
  cancelDrawingWalls();
};

const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3);
};

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.2);
};

watch(() => props.roomId, async (newId) => {
  if (newId) {
    roomName.value = props.roomName;
  }
});

const removeRack = (index: number) => {
  takeSnapshot();
  if (typeof racks.value === 'string') return;
  racks.value.splice(index, 1);
  selectedRackIndices.value = [];
};

const rackPositionsBeforeDrag = ref<{ x: number; y: number }[]>([]);

const isInteracting = computed(() =>
  draggingRack.value !== null ||
  rotatingRack.value !== null ||
  isPanning.value ||
  isDrawingWalls.value ||
  contextMenu.value.show
);

const {pods, createPod, selectPod, leavePod, deletePod} = usePodsCrud(selectedRackIndices, startDragRack);

const onMouseMoveSVG = (event: MouseEvent) => {
  if (isDrawingWalls.value) {
    const svg = event.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const x = (svgP.x / zoomLevel.value) - panOffset.value.x;
    const y = (svgP.y / zoomLevel.value) - panOffset.value.y;

    const lastPoint = walls.value.length > 0
        ? walls.value[walls.value.length - 1]
        : null;
    wallPreviewPoint.value = getConstrainedPoint(x, y, lastPoint!);
  }
};

const onMouseMove = (event: MouseEvent) => {
  if (isDrawingWalls.value) return;
  if (isPanning.value) return panRunning(event);
  if (draggingRack.value !== null) dragRack(event);
  else if (rotatingRack.value !== null) rotateRack(event);
};

const stopDrag = () => {
  panStop();
  draggingRack.value = null;
  rotatingRack.value = null;
  rackPositionsBeforeDrag.value = [];
};

const deselect = (event: MouseEvent) => {
  if (isDrawingWalls.value) {
    if (event.button !== 0) return;

    const svg = event.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const x = (svgP.x / zoomLevel.value) - panOffset.value.x;
    const y = (svgP.y / zoomLevel.value) - panOffset.value.y;

    const lastPoint = walls.value.length > 0 ? walls.value[walls.value.length - 1] : null;
    const constrained = getConstrainedPoint(x, y, lastPoint!);
    const snapX = constrained.x;
    const snapY = constrained.y;

    if (walls.value.length > 2) {
      const firstPoint = walls.value[0];
      const dist = Math.sqrt(Math.pow(snapX - (firstPoint?.x ?? 0), 2) + Math.pow(snapY - (firstPoint?.y ?? 0), 2));
      if (dist < 10) {
        cancelDrawingWalls();
        initializeLayers();

        return;
      }
    }

    takeSnapshot();
    createWall({ x: snapX, y: snapY });
    return;
  }
  if ((event.target as SVGElement).classList.contains('canvas-background')) {
    selectedRackIndices.value = [];
    isWallSelected.value = false;
    panStart();
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (isDrawingWalls.value && event.key === 'Escape') {
    cancelDrawingWalls();
    return;
  }
  const isCtrl = event.ctrlKey || event.metaKey;

  if (isCtrl && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (event.composedPath().some((el) =>
        !(el instanceof HTMLElement)
            ? false
            : (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    )) return;

    if (selectedRackIndices.value.length > 0) {
      event.preventDefault();
      takeSnapshot();
      const sortedIndices = [...selectedRackIndices.value].sort((a, b) => b - a);
      sortedIndices.forEach(index => {
        if (typeof racks.value === 'string') return;
        racks.value.splice(index, 1);
      });
      selectedRackIndices.value = [];
      return;
    }

    if (isWallSelected.value) {
      event.preventDefault();
      triggerClearWalls();
      return;
    }
  }

  if (isCtrl && event.key.toLowerCase() === 's') {
    event.preventDefault();
    save();
    return;
  }

  if (isCtrl && event.key.toLowerCase() === 'v') {
    event.preventDefault();
    pasteFromClipboard();
    return;
  }

  if (selectedRackIndices.value.length === 0) return;

  if (isCtrl && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    duplicateRack(selectedRackIndices.value[0]!);
  } else if (isCtrl && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    copyRack(selectedRackIndices.value[0]!);
  }
};

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);

    if (!data || typeof data !== 'object') return;

    if (data._type === 'rack') pastRack(data);
  } catch (err) {
    console.error('Failed to paste from clipboard: ', err);
  }
};

const save = async () => {
  try {
    if (typeof racks.value === 'string') return;

    emit('saved', {
      racks: racks.value,
      pods: pods.value,
      walls: walls.value,
      layers: layers.value
    });
  } catch (e) {
    console.error(e);
    notifyError({
      text: 'Erreur lors de la sauvegarde'
    });
  }
};

const onWheel = (event: WheelEvent) => {
  if (event.ctrlKey) {
    event.preventDefault();
    event.deltaY < 0 ? zoomIn() : zoomOut();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="builder-container" @mousemove="onMouseMove" @mouseup="stopDrag" @wheel="onWheel">
    <BuilderToolbar
      v-model:room-name="roomName"
      :undo-disabled="undoStack.length === 0"
      :redo-disabled="redoStack.length === 0"
      :can-add-rack="walls.length > 0"
      :can-clear-walls="walls.length > 0"
      :is-drawing-walls="isDrawingWalls"
      :zoom-level="zoomLevel"
      :can-zoom-out="zoomLevel > 0.2"
      :can-zoom-in="zoomLevel < 3"

      @undo="undo"
      @redo="redo"
      @add-rack="addRack"
      @toggle-walls="toggleIsDrawingWalls"
      @clear-walls="triggerClearWalls"
      @zoom-out="zoomOut"
      @zoom-in="zoomIn"
      @save="save"
    />

    <div class="canvas-area">
      <BuilderCanvas
        ref="canvasComponent"
        :layers="layers"
        :current-layer-index="currentLayerIndex"
        :walls="walls"
        :racks="racks as Rack[]"
        :is-drawing-walls="isDrawingWalls"
        :wall-preview-point="wallPreviewPoint"
        :pod-boundaries="podBoundaries"
        :wall-bounding-box="wallBoundingBox"
        :horizontal-coords="horizontalCoords"
        :vertical-coords="verticalCoords"
        :selected-rack-indices="selectedRackIndices"
        :zoom-level="zoomLevel"
        :pan-offset="panOffset"
        :is-wall-selected="isWallSelected"
        :rack-width="rackWidth"
        :rack-height="rackHeight"
        :is-interacting="isInteracting"
        :get-pod-boundaries="getPodBoundaries"

        @deselect="deselect"
        @mousemove-svg="onMouseMoveSVG"
        @start-drag="startDragRack"
        @open-context-menu="openContextMenu"
        @start-rotate="startRotateRack"
        @select-pod="selectPod"
        @select-wall="selectWall"
      />

      <BuilderContextMenu
        :show="contextMenu.show"
        :x="contextMenu.x"
        :y="contextMenu.y"
        :options="contextMenuOptions"

        @create-pod="createPod"
        @leave-pod="leavePod"
        @delete-pod="deletePod"
      />

      <Modal
        :show="showClearModal"
        :title="clearModalConfig.title"
        :message="clearModalConfig.message"
        :confirm-text="clearModalConfig.confirmText"

        @confirm="clearModalConfig.onConfirm"
        @cancel="showClearModal = false"
      />

      <BuilderPropertiesPanel
        :selected-rack-indices="selectedRackIndices"
        :racks="racks as Rack[]"
        :is-wall-selected="isWallSelected"
        :context-menu-options="contextMenuOptions"

        @remove-rack="removeRack"
        @create-pod="createPod"
        @leave-pod="leavePod"
        @delete-pod="deletePod"
        @clear-selection="selectedRackIndices = []"
        @update-rack-name="updateRackName"
        @update-rack-rotation="updateRackRotation"
      />

      <BuilderLayerPreviews
        :layers="layers"
        v-model:current-layer-index="currentLayerIndex"
        :viewport-rect="viewportRect"
        :rack-width="rackWidth"
        :rack-height="rackHeight"
        :get-wall-bounding-box="getWallBoundingBox"
        :get-pod-boundaries="getPodBoundaries"
      />
    </div>
  </div>
</template>

<style scoped>
.builder-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: sans-serif;
}
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: white;
}
</style>
