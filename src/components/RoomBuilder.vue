<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css';
import Notify from 'simple-notify';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Modal from './Modal.vue';
import BuilderToolbar from './room-builder/BuilderToolbar.vue';
import BuilderCanvas from './room-builder/BuilderCanvas.vue';
import BuilderContextMenu from './room-builder/BuilderContextMenu.vue';
import BuilderPropertiesPanel from './room-builder/BuilderPropertiesPanel.vue';
import BuilderLayerPreviews from './room-builder/BuilderLayerPreviews.vue';
import { useRoomBuilderGeometry } from '../composables/useRoomBuilderGeometry';
import { useRoomBuilderHistory } from '../composables/useRoomBuilderHistory';
import type { Layer, Pod, Point, Rack } from '../types/roomBuilder';
import { rackHeight, rackWidth } from '../types/roomBuilder';

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

const { getPodBoundaries, getWallBoundingBox, getConstrainedPoint, isPointInPolygon } = useRoomBuilderGeometry();

const layers = ref<Layer[]>([]);
const currentLayerIndex = ref(0);
const roomName = ref(props.roomName);

const wallsRef = ref<Point[]>([]);
const racks = computed({
  get: () => (layers.value[currentLayerIndex.value]?.racks || []) as Rack[] | string,
  set: (val) => {
    if (layers.value[currentLayerIndex.value]) {
      layers.value[currentLayerIndex.value]!.racks = val as Rack[];
    }
  }
});

const pods = computed({
  get: () => layers.value[currentLayerIndex.value]?.pods || [],
  set: (val) => {
    if (layers.value[currentLayerIndex.value]) {
      layers.value[currentLayerIndex.value]!.pods = val;
    }
  }
});

const walls = computed({
  get: () => layers.value.length > 0 ? (layers.value[currentLayerIndex.value]?.walls || []) : wallsRef.value,
  set: (val) => {
    if (layers.value.length > 0 && layers.value[currentLayerIndex.value]) {
      layers.value[currentLayerIndex.value]!.walls = val;
    } else {
      wallsRef.value = val;
    }
  }
});

const isDrawingWalls = ref(false);
const wallPreviewPoint = ref<Point | null>(null);
const isWallSelected = ref(false);
const selectedRackIndices = ref<number[]>([]);

const canvasComponent = ref<InstanceType<typeof BuilderCanvas> | null>(null);
const canvasWidth = ref(800);
const canvasHeight = ref(600);

const updateCanvasSize = () => {
  const svgElement = canvasComponent.value?.svgRef ?? null;
  if (svgElement) {
    canvasWidth.value = svgElement.clientWidth;
    canvasHeight.value = svgElement.clientHeight;
  }
};

const zoomLevel = ref(1);
const panOffset = ref({ x: 0, y: 0 });

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

const { undoStack, redoStack, takeSnapshot, undo, redo } = useRoomBuilderHistory({
  layers,
  walls,
  currentLayerIndex
});

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
  layers.value = [];
  wallsRef.value = [];
  currentLayerIndex.value = 0;
  isWallSelected.value = false;
  selectedRackIndices.value = [];
  isDrawingWalls.value = false;
  wallPreviewPoint.value = null;
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

const addRack = () => {
  if (walls.value.length === 0) return;
  isWallSelected.value = false;
  takeSnapshot();

  let startX = 40;
  let startY = 40;

  if (wallBoundingBox.value) {
    const centerX = wallBoundingBox.value.minX + wallBoundingBox.value.width / 2;
    const centerY = wallBoundingBox.value.minY + wallBoundingBox.value.height / 2;

    startX = Math.round((centerX - rackWidth / 2) / 20) * 20;
    startY = Math.round((centerY - rackHeight / 2) / 20) * 20;

    if (!isPointInPolygon(startX + rackWidth / 2, startY + rackHeight / 2, walls.value)) {
      let found = false;
      for (let x = wallBoundingBox.value.minX + 20; x < wallBoundingBox.value.maxX; x += 20) {
        for (let y = wallBoundingBox.value.minY + 20; y < wallBoundingBox.value.maxY; y += 20) {
          if (isPointInPolygon(x, y, walls.value)) {
            startX = Math.round((x - rackWidth / 2) / 20) * 20;
            startY = Math.round((y - rackHeight / 2) / 20) * 20;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }

  if (typeof racks.value === 'string') return;

  racks.value.push({
    id: racks.value.length + 1,
    roomId: props.roomId,
    name: `Rack ${racks.value.length + 1}`,
    x: startX,
    y: startY,
    rotation: 0
  });
  selectedRackIndices.value = [racks.value.length - 1];
};

const removeRack = (index: number) => {
  takeSnapshot();
  if (typeof racks.value === 'string') return;
  racks.value.splice(index, 1);
  selectedRackIndices.value = [];
};

const draggingRack = ref<number | null>(null);
const isPanning = ref(false);
const rotatingRack = ref<number | null>(null);
const rackPositionsBeforeDrag = ref<{ x: number; y: number }[]>([]);
const startRotationAngle = ref(0);
const initialRackRotation = ref(0);
const lastMousePos = { x: 0, y: 0 };

const isInteracting = computed(() =>
  draggingRack.value !== null ||
  rotatingRack.value !== null ||
  isPanning.value ||
  isDrawingWalls.value ||
  contextMenu.value.show
);

const startDragRack = (event: MouseEvent, index: number) => {
  if (isDrawingWalls.value) return;
  if (event.button !== 0) return;
  isWallSelected.value = false;
  takeSnapshot();
  draggingRack.value = index;

  if (event.ctrlKey || event.metaKey) {
    if (selectedRackIndices.value.includes(index)) {
      selectedRackIndices.value = selectedRackIndices.value.filter(i => i !== index);
    } else {
      selectedRackIndices.value.push(index);
    }
  } else {
    if (!selectedRackIndices.value.includes(index)) {
      selectedRackIndices.value = [index];
    }
  }

  if (typeof racks.value === 'string') return;

  rackPositionsBeforeDrag.value = racks.value.map(r => ({ x: r.x, y: r.y }));

  lastMousePos.x = event.clientX;
  lastMousePos.y = event.clientY;
};

const startRotateRack = (event: MouseEvent, index: number) => {
  if (isDrawingWalls.value) return;
  isWallSelected.value = false;
  takeSnapshot();
  event.stopPropagation();
  rotatingRack.value = index;
  selectedRackIndices.value = [index];

  if (typeof racks.value === 'string') return;

  const rack = racks.value[index];
  const centerX = (rack?.x ?? 0) + rackWidth / 2 + panOffset.value.x;
  const centerY = (rack?.y ?? 0) + rackHeight / 2 + panOffset.value.y;

  startRotationAngle.value = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
  initialRackRotation.value = rack?.rotation || 0;
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

    const lastPoint = walls.value.length > 0 ? walls.value[walls.value.length - 1] : null;
    wallPreviewPoint.value = getConstrainedPoint(x, y, lastPoint!);
  }
};

const onMouseMove = (event: MouseEvent) => {
  if (isDrawingWalls.value) return;
  if (typeof racks.value === 'string') return;
  if (isPanning.value) {
    panOffset.value.x += event.movementX / zoomLevel.value;
    panOffset.value.y += event.movementY / zoomLevel.value;
    return;
  }
  if (draggingRack.value !== null) {
    const deltaX = (event.clientX - lastMousePos.x) / zoomLevel.value;
    const deltaY = (event.clientY - lastMousePos.y) / zoomLevel.value;

    selectedRackIndices.value.forEach(index => {
      const rack = racks.value[index] as Rack;
      const initialPos = rackPositionsBeforeDrag.value[index];
      if (!rack || !initialPos) return;

      const rawX = initialPos.x + deltaX;
      const rawY = initialPos.y + deltaY;

      const snapX = Math.round(rawX / 20) * 20;
      const snapY = Math.round(rawY / 20) * 20;

      if (walls.value.length > 2) {
        if (isPointInPolygon(snapX + rackWidth / 2, snapY + rackHeight / 2, walls.value)) {
          rack.x = snapX;
          rack.y = snapY;
        }
      } else {
        rack.x = snapX;
        rack.y = snapY;
      }
    });
  } else if (rotatingRack.value !== null) {
    const rack = racks.value[rotatingRack.value];
    const centerX = (rack?.x ?? 0) + (rackWidth ?? 0) / 2 + panOffset.value.x;
    const centerY = (rack?.y ?? 0) + (rackHeight ?? 0) / 2 + panOffset.value.y;

    const currentAngle = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
    const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);

    const rawRotation = (initialRackRotation.value + deltaAngle) % 360;
    rack!.rotation = Math.round(rawRotation / 45) * 45;
  }
};

const stopDrag = () => {
  draggingRack.value = null;
  rotatingRack.value = null;
  isPanning.value = false;
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
        const finalWalls = [...walls.value];
        isDrawingWalls.value = false;
        wallPreviewPoint.value = null;

        const layerNames = ['Circuits électriques', 'Surfaces au sol', 'Baies'];
        layers.value = layerNames.map((name, index) => ({
          id: index + 1,
          name,
          racks: [],
          pods: [],
          walls: JSON.parse(JSON.stringify(finalWalls))
        }));
        currentLayerIndex.value = 0;

        return;
      }
    }

    takeSnapshot();
    walls.value.push({ x: snapX, y: snapY });
    return;
  }
  if ((event.target as SVGElement).classList.contains('canvas-background')) {
    selectedRackIndices.value = [];
    isWallSelected.value = false;
    isPanning.value = true;
  }
};

const selectWall = () => {
  isWallSelected.value = true;
  selectedRackIndices.value = [];
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (isDrawingWalls.value && event.key === 'Escape') {
    isDrawingWalls.value = false;
    wallPreviewPoint.value = null;
    return;
  }
  const isCtrl = event.ctrlKey || event.metaKey;

  if (isCtrl && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (event.composedPath().some((el) => {
      if (!(el instanceof HTMLElement)) return false;
      return (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    })) {
      return;
    }

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

const duplicateRack = (index: number) => {
  takeSnapshot();
  if (typeof racks.value === 'string') return;
  const rack = racks.value[index];
  const newRack = JSON.parse(JSON.stringify(rack));
  delete newRack.id;
  newRack.name = `${rack?.name} (copie)`;
  newRack.x += 20;
  newRack.y += 20;

  racks.value.push(newRack);
  selectedRackIndices.value = [racks.value.length - 1];
};

const copyRack = (index: number) => {
  const rack = racks.value[index];
  const copyData = JSON.parse(JSON.stringify(rack));
  delete copyData.id;
  copyData._type = 'rack';

  navigator.clipboard.writeText(JSON.stringify(copyData))
    .then(() => console.log('Rack copied to clipboard'))
    .catch(err => console.error('Failed to copy rack: ', err));
};

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);

    if (!data || typeof data !== 'object') return;

    if (data._type === 'rack') {
      takeSnapshot();
      if (typeof racks.value === 'string') return;

      const newRack = data;
      delete newRack._type;
      newRack.x += 20;
      newRack.y += 20;

      racks.value.push(newRack);
      selectedRackIndices.value = [racks.value.length - 1];
    }
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
    new Notify({
      status: 'error',
      title: 'Erreur',
      text: 'Erreur lors de la sauvegarde',
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
  }
};

const onWheel = (event: WheelEvent) => {
  if (event.ctrlKey) {
    event.preventDefault();
    if (event.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }
};

const contextMenu = ref<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });

const contextMenuOptions = computed<{ type: string; podId?: string }>(() => {
  if (selectedRackIndices.value.length === 0) return { type: 'none' } as { type: string; podId?: string };

  if (typeof racks.value === 'string') return { type: 'none' } as { type: string; podId?: string };

  const selectedRacks = selectedRackIndices.value.map(idx => racks.value[idx]!) as Rack[];
  const podsInSelection = [...new Set(selectedRacks.map(r => r.podId).filter(Boolean))];

  if (podsInSelection.length === 0) {
    return { type: 'create_pod' } as { type: string; podId?: string };
  }

  if (podsInSelection.length === 1) {
    const podId = podsInSelection[0]!;
    const racksInPod = racks.value.filter(r => r.podId === podId);
    const allRacksOfPodSelected = racksInPod.every(r =>
      selectedRackIndices.value.includes(racks.value.indexOf(r as Rack & string))
    );

    if (allRacksOfPodSelected) {
      return { type: 'delete_pod', podId } as { type: string; podId?: string };
    }
    return { type: 'leave_pod', podId } as { type: string; podId?: string };
  }

  return { type: 'leave_pod', podId: podsInSelection[0] } as { type: string; podId?: string };
});

const openContextMenu = (event: MouseEvent, index: number) => {
  event.preventDefault();
  event.stopPropagation();

  if (!selectedRackIndices.value.includes(index)) {
    if (event.ctrlKey || event.metaKey) {
      selectedRackIndices.value.push(index);
    } else {
      selectedRackIndices.value = [index];
    }
  }

  contextMenu.value = {
    x: event.clientX,
    y: event.clientY,
    show: true
  };

  window.addEventListener('click', closeContextMenu);
};

const closeContextMenu = () => {
  contextMenu.value.show = false;
  window.removeEventListener('click', closeContextMenu);
};

const createPod = () => {
  if (selectedRackIndices.value.length < 1) return;

  takeSnapshot();
  const podId = `pod-${Date.now()}`;
  const podName = `Pod ${pods.value.length + 1}`;

  pods.value.push({ id: podId, name: podName });

  selectedRackIndices.value.forEach(index => {
    if (typeof racks.value === 'string') return;
    racks.value[index]!.podId = podId;
  });

  closeContextMenu();

  new Notify({
    status: 'success',
    title: 'Pod créé',
    text: `${podName} a été créé avec ${selectedRackIndices.value.length} racks`,
    autoclose: true,
    autotimeout: 3000,
    notificationsGap: 20,
    type: 'outline',
    position: 'right top',
    customClass: 'custom-notify'
  });
};

const leavePod = () => {
  if (selectedRackIndices.value.length < 1) return;
  takeSnapshot();

  selectedRackIndices.value.forEach(index => {
    if (typeof racks.value === 'string') return;
    racks.value[index]!.podId = null;
  });

  closeContextMenu();

  new Notify({
    status: 'success',
    title: 'Pod quitté',
    text: 'Les racks sélectionnés ont été sortis de leur pod',
    autoclose: true,
    autotimeout: 3000,
    notificationsGap: 20,
    type: 'outline',
    position: 'right top',
    customClass: 'custom-notify'
  });
};

const deletePod = (podId: string) => {
  takeSnapshot();

  if (typeof racks.value === 'string') return;

  racks.value.forEach(r => {
    if (r.podId === podId) {
      r.podId = null;
    }
  });

  const podIndex = pods.value.findIndex(p => p.id === podId);
  if (podIndex !== -1) {
    const podName = pods.value[podIndex]!.name;
    pods.value.splice(podIndex, 1);

    new Notify({
      status: 'success',
      title: 'Pod supprimé',
      text: `${podName} a été supprimé`,
      autoclose: true,
      autotimeout: 3000,
      notificationsGap: 20,
      type: 'outline',
      position: 'right top',
      customClass: 'custom-notify'
    });
  }

  closeContextMenu();
};

const selectPod = (event: MouseEvent, podId: string) => {
  if (isDrawingWalls.value) return;
  if (event.button !== 0) return;
  event.stopPropagation();
  isWallSelected.value = false;

  const podRacksIndices: number[] = [];
  if (typeof racks.value === 'string') return;

  racks.value.forEach((rack, index) => {
    if (rack.podId === podId) {
      podRacksIndices.push(index);
    }
  });

  if (podRacksIndices.length > 0) {
    selectedRackIndices.value = podRacksIndices;
    startDragRack(event, podRacksIndices[0]!);
  }
};

const updateRackName = (value: string) => {
  if (selectedRackIndices.value.length !== 1) return;
  if (typeof racks.value === 'string') return;
  const rack = racks.value[selectedRackIndices.value[0]!];
  if (!rack) return;
  rack.name = value;
};

const updateRackRotation = (value: number) => {
  if (selectedRackIndices.value.length !== 1) return;
  if (typeof racks.value === 'string') return;
  const rack = racks.value[selectedRackIndices.value[0]!];
  if (!rack) return;
  rack.rotation = Math.round((value ?? 0) / 45) * 45;
};

const clearWalls = () => {
  triggerClearWalls();
};

onMounted(() => {
  updateCanvasSize();
  window.addEventListener('resize', updateCanvasSize);
  if (props.layers && props.layers.length > 0) {
    layers.value = typeof props.layers === 'string' ? JSON.parse(props.layers) : props.layers;
    currentLayerIndex.value = 0;
  }
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
      :room-name="roomName"
      :undo-disabled="undoStack.length === 0"
      :redo-disabled="redoStack.length === 0"
      :can-add-rack="walls.length > 0"
      :can-clear-walls="walls.length > 0"
      :is-drawing-walls="isDrawingWalls"
      :zoom-level="zoomLevel"
      :can-zoom-out="zoomLevel > 0.2"
      :can-zoom-in="zoomLevel < 3"
      @update:roomName="roomName = $event"
      @undo="undo"
      @redo="redo"
      @add-rack="addRack"
      @toggle-walls="isDrawingWalls = !isDrawingWalls"
      @clear-walls="clearWalls"
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
        :racks="racks"
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
        :racks="racks"
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
        :current-layer-index="currentLayerIndex"
        :viewport-rect="viewportRect"
        :rack-width="rackWidth"
        :rack-height="rackHeight"
        :get-wall-bounding-box="getWallBoundingBox"
        :get-pod-boundaries="getPodBoundaries"
        @select-layer="currentLayerIndex = $event"
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
