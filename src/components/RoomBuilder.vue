<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css';
import {computed, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect} from 'vue';
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
import {useZoom} from "../composables/useZoom.ts";
import {useModal} from "../composables/useModal.ts";
import {useFootprints} from "../composables/useFootprints.ts";

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

const propsLayers = computed<Layer[]>(() => typeof props.layers === 'string' ? JSON.parse(props.layers) : props.layers)

watchEffect(() => {
  console.log(propsLayers.value)
})

const emit = defineEmits<{
  (e: 'saved', payload: { layers: Layer[] }): void;
}>();

const {
  getPodBoundaries, getWallBoundingBox,
  getConstrainedPoint,
  isPointInPolygon
} = useRoomBuilderGeometry();
const {error: notifyError} = useNotify();

const {
  wallPreviewPoint, isWallSelected, isDrawingWalls, wallsRef, walls,
  cancelDrawingWalls, toggleIsDrawingWalls, createWall
} = useDrawRoomWalls();

const {
  layers,
  currentLayerIndex,
  clearLayers,
  initialize: initializeLayers,
  currentLayer
} = useLayers(walls, props.layers);

const {
  selectedUnits,
  isSelecting,
  startSelection,
  updateSelection,
  stopSelection,
  createFootprint,
  deleteFootprint,
  changeFootprintColor,
  getFootprintAt
} = useFootprints(currentLayer, walls);

const roomName = ref(props.roomName);
const circuitPreviewPoint = ref<Point | null>(null);
const isDrawingCircuit = ref(false);
const currentCircuitPathIndex = ref<number | null>(null);
const selectedCircuitSegments = ref<Array<{ pathIndex: number; segmentIndex: number }>>([]);
const circuitPaths = computed({
  get: () => layers.value[currentLayerIndex.value]?.circuits ?? [],
  set: (val) => {
    if (layers.value[currentLayerIndex.value]) {
      layers.value[currentLayerIndex.value]!.circuits = val;
    }
  }
});

watch(currentLayerIndex, () => {
  selectedRackIndices.value = [];
  isWallSelected.value = false;
  selectedCircuitSegments.value = [];
  circuitPreviewPoint.value = null;
  isDrawingCircuit.value = false;
  currentCircuitPathIndex.value = null;
});

const {
  canvasWidth, canvasHeight,
  updateCanvasSize
} = useCanvas(useTemplateRef<InstanceType<typeof BuilderCanvas>>('canvasComponent'));

const {zoomLevel, zoomIn, zoomOut, onWheel} = useZoom();

const {isPanning, panStart, panStop, panRunning} = usePan(props.roomId);

const {
  racks, selectedRackIndices,
  rotatingRack,
  panOffset, draggingRack,
  createRack: addRackRaw,
  rotateRack, removeRack,
  startDragRack, dragRack,
  startRotateRack,
  duplicateRack, copyRack,
  pastRack, updateRackName,
  updateRackRotation,
  resetRackState
} = useRacksCrud(props.roomId);

const addRack = () => {
  if (currentLayerIndex.value === 0) return;
  addRackRaw();
};

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
    computed(() => typeof (racks.value as unknown as string) === 'string'
        ? JSON.parse(racks.value as unknown as string)
        : racks.value),
    selectedRackIndices,
    selectedUnits
);

const {selectWall: selectWallInternal} = useWalls(props.roomId);
const selectWall = (event: MouseEvent) => {
  if (currentLayerIndex.value === 0 || currentLayerIndex.value === 1) return;
  event.stopPropagation();
  selectWallInternal();
};
const {pods, createPod, selectPod, leavePod, deletePod} = usePodsCrud(props.roomId);

const confirmClearWalls = () => {
  takeSnapshot();
  clearLayers();
  wallsRef.value = [];
  currentLayerIndex.value = 0;
  isWallSelected.value = false;
  selectedRackIndices.value = [];
  cancelDrawingWalls();
};

const {
  showClearModal, clearModalConfig,
  triggerClearWalls, cancelModal
} = useModal(confirmClearWalls);

watch(() => props.roomId, async (newId) => {
  if (newId) {
    roomName.value = props.roomName;
  }
});

const isInteracting = computed(() =>
  draggingRack.value !== null ||
  rotatingRack.value !== null ||
  isPanning.value ||
  isDrawingWalls.value ||
  isSelecting.value ||
  contextMenu.value.show
);

const stopCircuitDrawing = () => {
  isDrawingCircuit.value = false;
  circuitPreviewPoint.value = null;
  currentCircuitPathIndex.value = null;
};

const setSelectedCircuitSegments = (segments: Array<{ pathIndex: number; segmentIndex: number }>) => {
  selectedCircuitSegments.value = segments;
};

const selectCircuitSegment = (pathIndex: number, segmentIndex: number, includeAdjacent = false) => {
  const circuits = layers.value[currentLayerIndex.value]?.circuits ?? [];
  const circuit = circuits[pathIndex];
  if (!circuit || segmentIndex < 0 || segmentIndex >= circuit.length - 1) {
    return;
  }

  const selected = [{ pathIndex, segmentIndex }];
  if (includeAdjacent) {
    if (segmentIndex > 0) {
      selected.unshift({ pathIndex, segmentIndex: segmentIndex - 1 });
    }
    if (segmentIndex < circuit.length - 2) {
      selected.push({ pathIndex, segmentIndex: segmentIndex + 1 });
    }
  }
  setSelectedCircuitSegments(selected);
};

const onCircuitSegmentClick = (event: MouseEvent, pathIndex: number, segmentIndex: number) => {
  if (currentLayerIndex.value !== 0) return;
  event.stopPropagation();
  stopCircuitDrawing();
  circuitPreviewPoint.value = null;
  selectCircuitSegment(pathIndex, segmentIndex, false);
};

const onCircuitSegmentDoubleClick = (event: MouseEvent, pathIndex: number, segmentIndex: number) => {
  if (currentLayerIndex.value !== 0) return;
  event.stopPropagation();
  stopCircuitDrawing();
  circuitPreviewPoint.value = null;
  selectCircuitSegment(pathIndex, segmentIndex, true);
};

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

  if (currentLayerIndex.value === 0 && !isDrawingWalls.value) {
    if ((event.target as Element | null)?.closest('.circuit-segment')) {
      circuitPreviewPoint.value = null;
      return;
    }
    const svg = event.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = (svgP.x / zoomLevel.value) - panOffset.value.x;
    const y = (svgP.y / zoomLevel.value) - panOffset.value.y;
    if (walls.value.length > 2 && isPointInPolygon(x, y, walls.value)) {
      const lastPoint = isDrawingCircuit.value && currentCircuitPathIndex.value !== null
        ? circuitPaths.value[currentCircuitPathIndex.value]?.[circuitPaths.value[currentCircuitPathIndex.value]!.length - 1]
        : null;
      circuitPreviewPoint.value = getConstrainedPoint(x, y, lastPoint ?? null);
    } else {
      circuitPreviewPoint.value = null;
    }
  }

  if (currentLayerIndex.value === 1 && isSelecting.value) {
    const svg = event.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = (svgP.x / zoomLevel.value) - panOffset.value.x;
    const y = (svgP.y / zoomLevel.value) - panOffset.value.y;
    updateSelection(x, y);
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
  resetRackState();
  if (currentLayerIndex.value === 1) {
    stopSelection();
  }
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
  if ((event.target as SVGElement).classList.contains('canvas-background') ||
      (event.target as SVGElement).closest('.footprints-layer') ||
      (event.target as SVGElement).classList.contains('room-surface')) {
    const isFootprintClick = (event.target as SVGElement).closest('.footprints-layer');
    if (!isFootprintClick) {
      selectedRackIndices.value = [];
      isWallSelected.value = false;
    }

    const svg = event.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = (svgP.x / zoomLevel.value) - panOffset.value.x;
    const y = (svgP.y / zoomLevel.value) - panOffset.value.y;

    if (currentLayerIndex.value === 0) {
      if (event.button === 0) {
        setSelectedCircuitSegments([]);
        if (event.detail > 1) {
          stopCircuitDrawing();
          return;
        }
        if (walls.value.length > 2 && isPointInPolygon(x, y, walls.value)) {
          const lastPoint = isDrawingCircuit.value && currentCircuitPathIndex.value !== null
            ? circuitPaths.value[currentCircuitPathIndex.value]?.[circuitPaths.value[currentCircuitPathIndex.value]!.length - 1]
            : null;
          const constrained = getConstrainedPoint(x, y, lastPoint ?? null);
          takeSnapshot();
          if (!isDrawingCircuit.value || currentCircuitPathIndex.value === null) {
            const nextPaths = [...circuitPaths.value, [constrained]];
            circuitPaths.value = nextPaths;
            currentCircuitPathIndex.value = nextPaths.length - 1;
            isDrawingCircuit.value = true;
          } else {
            const nextPaths = [...circuitPaths.value];
            const activePath = [...(nextPaths[currentCircuitPathIndex.value] ?? [])];
            nextPaths[currentCircuitPathIndex.value] = [...activePath, constrained];
            circuitPaths.value = nextPaths;
          }
          circuitPreviewPoint.value = constrained;
          return;
        }
        panStart();
      }
    } else if (currentLayerIndex.value === 1) {
      if (event.button === 0) { // Left click
        startSelection(x, y);
        // Si on a cliqué à l'intérieur de la pièce pour sélectionner, on ne pan pas au clic gauche
        if (!isPointInPolygon(x, y, walls.value)) {
           panStart();
        }
      } else if (event.button === 2) { // Right click
        const footprint = getFootprintAt(x, y);
        const clickedUnitX = Math.floor(x / 20) * 20;
        const clickedUnitY = Math.floor(y / 20) * 20;
        const isUnitSelected = selectedUnits.value.some(u => u.x === clickedUnitX && u.y === clickedUnitY);

        if (footprint) {
          openContextMenu(event, null, footprint.id);
        } else if (isUnitSelected) {
          openContextMenu(event);
        }
      }
    } else {
      if (event.button === 0) {
        panStart();
      }
    }

    // Toujours autoriser le pan avec le clic milieu
    if (event.button === 1) {
      panStart();
    }
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (isDrawingWalls.value && event.key === 'Escape') {
    cancelDrawingWalls();
    return;
  }
  if (!isDrawingWalls.value && currentLayerIndex.value === 0 && (event.key === 'Escape' || event.key === 'Enter')) {
    stopCircuitDrawing();
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
    if (currentLayerIndex.value !== 0) {
      pasteFromClipboard();
    }
    return;
  }

  if (selectedRackIndices.value.length === 0) return;

  if (isCtrl && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    if (currentLayerIndex.value !== 0) {
      duplicateRack(selectedRackIndices.value[0]!);
    }
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
    emit('saved', {
      layers: layers.value
    });
    undoStack.value = [];
    redoStack.value = [];
  } catch (e) {
    console.error(e);
    notifyError({
      text: 'Erreur lors de la sauvegarde'
    });
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
  <div class="builder-container" @mousemove="onMouseMove" @mouseup="stopDrag" @wheel="onWheel" @contextmenu.prevent>
    <BuilderToolbar
      v-model:room-name="roomName"
      :undo-disabled="undoStack.length === 0"
      :redo-disabled="redoStack.length === 0"
      :can-add-rack="walls.length > 2"
      :show-add-rack="currentLayerIndex === 2"
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
        :is-drawing-circuit="isDrawingCircuit"
        :wall-preview-point="wallPreviewPoint"
        :circuit-preview-point="circuitPreviewPoint"
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
        :selected-units="selectedUnits"
        :selected-circuit-segments="selectedCircuitSegments"

        @deselect="deselect"
        @mousemove-svg="onMouseMoveSVG"
        @start-drag="startDragRack"
        @open-context-menu="openContextMenu"
        @start-rotate="startRotateRack"
        @select-pod="selectPod"
        @select-wall="selectWall($event)"
        @select-circuit-segment="onCircuitSegmentClick"
        @select-circuit-segment-adjacent="onCircuitSegmentDoubleClick"
      />

      <BuilderContextMenu
        :show="contextMenu.show"
        :x="contextMenu.x"
        :y="contextMenu.y"
        :options="contextMenuOptions"

        @create-pod="createPod"
        @leave-pod="leavePod"
        @delete-pod="deletePod"
        @create-footprint="createFootprint"
        @delete-footprint="deleteFootprint"
        @change-footprint-color="changeFootprintColor"
      />

      <Modal
        :show="showClearModal"
        :title="clearModalConfig.title"
        :message="clearModalConfig.message"
        :confirm-text="clearModalConfig.confirmText"

        @confirm="clearModalConfig.onConfirm"
        @cancel="cancelModal"
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
        :is-drawing-walls="isDrawingWalls"
        :wall-preview-point="wallPreviewPoint"
        :is-drawing-circuit="isDrawingCircuit"
        :circuit-preview-point="circuitPreviewPoint"
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #2c3e50;
}
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #004a99; /* Bleu iTop Designer */
}
</style>
