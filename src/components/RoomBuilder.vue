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
const selectedCircuitSegmentKeys = computed(() =>
  selectedCircuitSegments.value.map(segment => `${segment.pathIndex}-${segment.segmentIndex}`)
);
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
  circuitPreviewPoint.value = null;
  isDrawingCircuit.value = false;
  currentCircuitPathIndex.value = null;
  selectedCircuitSegments.value = [];
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

const getDistanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  const projX = start.x + clampedT * dx;
  const projY = start.y + clampedT * dy;
  return Math.hypot(point.x - projX, point.y - projY);
};

const getCircuitSegmentAtPoint = (x: number, y: number, tolerance = 6) => {
  const point = {x, y};
  for (let pathIndex = 0; pathIndex < circuitPaths.value.length; pathIndex += 1) {
    const circuit = circuitPaths.value[pathIndex];
    if (!circuit || circuit.length < 2) continue;
    for (let segmentIndex = 0; segmentIndex < circuit.length - 1; segmentIndex += 1) {
      const start = circuit[segmentIndex]!;
      const end = circuit[segmentIndex + 1]!;
      if (getDistanceToSegment(point, start, end) <= tolerance) {
        return {pathIndex, segmentIndex};
      }
    }
  }
  return null;
};

const selectCircuitSegment = (event: MouseEvent, pathIndex: number, segmentIndex: number) => {
  if (event.detail > 1) return;
  event.stopPropagation();
  stopCircuitDrawing();
  selectedCircuitSegments.value = [{pathIndex, segmentIndex}];
};

const selectCircuitPath = (event: MouseEvent, pathIndex: number, segmentIndex: number) => {
  event.stopPropagation();
  stopCircuitDrawing();
  const circuit = circuitPaths.value[pathIndex];
  if (!circuit || circuit.length < 2) {
    selectedCircuitSegments.value = [{pathIndex, segmentIndex}];
    return;
  }
  selectedCircuitSegments.value = circuit.slice(0, -1).map((_, idx) => ({
    pathIndex,
    segmentIndex: idx
  }));
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
    const svg = event.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = (svgP.x / zoomLevel.value) - panOffset.value.x;
    const y = (svgP.y / zoomLevel.value) - panOffset.value.y;
    if (getCircuitSegmentAtPoint(x, y)) {
      circuitPreviewPoint.value = null;
      return;
    }
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
        if (event.detail > 1) {
          stopCircuitDrawing();
          return;
        }
        const hadSelection = selectedCircuitSegments.value.length > 0;
        selectedCircuitSegments.value = [];
        if (walls.value.length > 2 && isPointInPolygon(x, y, walls.value)) {
          if (hadSelection) {
            return;
          }
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

const deleteSelectedCircuitSegments = () => {
  if (selectedCircuitSegments.value.length === 0) return;

  takeSnapshot();
  const nextPaths = [...circuitPaths.value.map(p => [...p])];

  // Regrouper les segments par chemin pour les supprimer plus facilement
  const segmentsByPath: Record<number, number[]> = {};
  selectedCircuitSegments.value.forEach(({ pathIndex, segmentIndex }) => {
    if (!segmentsByPath[pathIndex]) {
      segmentsByPath[pathIndex] = [];
    }
    segmentsByPath[pathIndex].push(segmentIndex);
  });

  // Pour chaque chemin, supprimer les segments du plus grand index au plus petit
  Object.keys(segmentsByPath).forEach(pIdxStr => {
    const pathIndex = parseInt(pIdxStr);
    const indicesToDelete = segmentsByPath[pathIndex]!.sort((a, b) => b - a);
    
    indicesToDelete.forEach(() => {
      // Un segment relie le point segmentIndex au point segmentIndex + 1
      // Si on supprime un segment, on doit décider si on supprime un point ou si on coupe le chemin.
      // Dans le contexte d'un outil de dessin simple, si on sélectionne un segment, 
      // on veut généralement le faire disparaître.
      
      const path = nextPaths[pathIndex];
      if (path) {
        // Pour supprimer un segment, on peut soit supprimer l'un des points, 
        // soit diviser le chemin en deux.
        // Ici, si on supprime le segment entre i et i+1 :
        // Si c'est un segment au milieu, on peut éventuellement scinder le chemin.
        // Mais si l'utilisateur veut juste "effacer" des segments, on peut simplifier.
        
        // Approche : on retire le point de fin du segment. 
        // Si c'est le dernier segment, on retire le dernier point.
        // Si c'est au milieu, on risque de relier i à i+2, ce qui n'est pas "supprimer le segment".
        
        // Correction de l'approche : On va reconstruire les chemins.
        // Un chemin de N points a N-1 segments.
        // Marquer les segments à supprimer.
      }
    });
  });

  // Nouvelle approche plus robuste : recréer les chemins en filtrant les segments supprimés
  const finalPaths: Point[][] = [];
  
  circuitPaths.value.forEach((path, pathIndex) => {
    let currentNewPath: Point[] = [];
    const pathSegmentsToDelete = segmentsByPath[pathIndex] || [];
    
    for (let i = 0; i < path.length - 1; i++) {
      if (pathSegmentsToDelete.includes(i)) {
        // Segment supprimé : on termine le chemin actuel s'il existe
        if (currentNewPath.length > 1) {
          finalPaths.push(currentNewPath);
        }
        currentNewPath = [];
      } else {
        // Segment conservé
        if (currentNewPath.length === 0) {
          currentNewPath.push(path[i]!);
        }
        currentNewPath.push(path[i+1]!);
      }
    }
    
    if (currentNewPath.length > 1) {
      finalPaths.push(currentNewPath);
    }
  });

  circuitPaths.value = finalPaths;
  selectedCircuitSegments.value = [];
  if (currentCircuitPathIndex.value !== null) {
    stopCircuitDrawing();
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

    if (selectedCircuitSegments.value.length > 0) {
      event.preventDefault();
      deleteSelectedCircuitSegments();
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
        :selected-circuit-segment-keys="selectedCircuitSegmentKeys"

        @deselect="deselect"
        @mousemove-svg="onMouseMoveSVG"
        @start-drag="startDragRack"
        @open-context-menu="openContextMenu"
        @start-rotate="startRotateRack"
        @select-pod="selectPod"
        @select-wall="selectWall($event)"
        @select-circuit-segment="selectCircuitSegment"
        @select-circuit-path="selectCircuitPath"
      />

      <!-- Bouton de suppression flottant pour les segments de circuit -->
      <button
        v-if="selectedCircuitSegments.length > 0"
        class="floating-delete-btn"
        title="Supprimer la sélection"
        @click="deleteSelectedCircuitSegments"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
        <span>Supprimer</span>
      </button>

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

.floating-delete-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #ff4d4f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-weight: 500;
  transition: background-color 0.2s, transform 0.1s;
}

.floating-delete-btn:hover {
  background-color: #ff7875;
}

.floating-delete-btn:active {
  transform: translateY(1px);
}
</style>
