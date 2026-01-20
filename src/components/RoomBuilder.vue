<script lang="ts">
export interface Rack {
  id: number;
  roomId: number;
  name: string;
  x: number;
  y: number;
  rotation: number | null;
  podId?: string | null;
}

export interface Pod {
  id: string;
  name: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Layer {
  id: number;
  name: string;
  racks: Rack[];
  pods: Pod[];
  walls: Point[];
}

const rack_width = 50;
const rack_height = 50;
</script>

<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css'
import Notify from 'simple-notify';
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import Modal from './Modal.vue';

const props = withDefaults(
    defineProps<{
      roomId: number;
      roomName: string;
      racks: Rack[];
      pods: Pod[];
      walls: Point[];
      layers?: Layer[];
    }>(),
    {
      racks: () => [],
      pods: () => [],
      walls: () => [],
      layers: () => []
    }
);

const layers = ref<Layer[]>([]);
const currentLayerIndex = ref(0);

const racks = computed({
  get: () => layers.value[currentLayerIndex.value]?.racks || [],
  set: (val) => {
    if (layers.value[currentLayerIndex.value]) {
      layers.value[currentLayerIndex.value]!.racks = val;
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

const wallsRef = ref<Point[]>([]);
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
const roomName = ref(props.roomName);

const isDrawingWalls = ref(false);
const wallPreviewPoint = ref<Point | null>(null);

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
  walls.value = [];
  layers.value = [];
  currentLayerIndex.value = 0;
  isWallSelected.value = false;
  selectedRackIndices.value = [];
  isDrawingWalls.value = false;
  wallPreviewPoint.value = null;
};

const getPodBoundaries = (layerRacks: Rack[], layerPods: Pod[]) => {
  return layerPods.map(pod => {
    const podRacks = layerRacks.filter(r => r.podId === pod.id);
    if (podRacks.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    podRacks.forEach(rack => {
      const corners = [
        { x: rack.x, y: rack.y },
        { x: rack.x + rack_width, y: rack.y },
        { x: rack.x, y: rack.y + rack_height },
        { x: rack.x + rack_width, y: rack.y + rack_height }
      ];

      if (rack.rotation) {
        const angle = (rack.rotation * Math.PI) / 180;
        const cx = rack.x + rack_width / 2;
        const cy = rack.y + rack_height / 2;
        
        corners.forEach(c => {
          const x = cx + (c.x - cx) * Math.cos(angle) - (c.y - cy) * Math.sin(angle);
          const y = cy + (c.x - cx) * Math.sin(angle) + (c.y - cy) * Math.cos(angle);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });
      } else {
        corners.forEach(c => {
          minX = Math.min(minX, c.x);
          minY = Math.min(minY, c.y);
          maxX = Math.max(maxX, c.x);
          maxY = Math.max(maxY, c.y);
        });
      }
    });

    const padding = 10;
    return {
      id: pod.id,
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + 2 * padding,
      height: (maxY - minY) + 2 * padding
    };
  }).filter(Boolean);
};

const podBoundaries = computed(() => getPodBoundaries(racks.value, pods.value));

const zoomLevel = ref(1);
const panOffset = ref({ x: 0, y: 0 });

const getWallBoundingBox = (walls: Point[]) => {
  if (walls.length < 3) return null;
  
  let minX = Math.min(...walls.map(p => p.x));
  let minY = Math.min(...walls.map(p => p.y));
  let maxX = Math.max(...walls.map(p => p.x));
  let maxY = Math.max(...walls.map(p => p.y));
  
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

const wallBoundingBox = computed(() => {
  if (isDrawingWalls.value) return null;
  return getWallBoundingBox(walls.value);
});

const horizontalCoords = computed(() => {
  if (!wallBoundingBox.value) return [];
  const coords = [];
  const steps = Math.floor(wallBoundingBox.value.width / 20);
  for (let i = 0; i < steps; i++) {
    const label = (i + 1).toString();
    coords.push({
      label,
      x: wallBoundingBox.value.minX + (i * 20) + 10, // centré dans la cellule de 20px
      y: wallBoundingBox.value.maxY + 20
    });
  }
  return coords;
});

const verticalCoords = computed(() => {
  if (!wallBoundingBox.value) return [];
  const coords = [];
  const steps = Math.floor(wallBoundingBox.value.height / 20);
  for (let i = 0; i < steps; i++) {
    const label = String.fromCharCode(65 + (i % 26)); // A-Z
    let finalLabel = label;
    if (i >= 26) {
      const prefix = String.fromCharCode(65 + Math.floor(i / 26) - 1);
      finalLabel = prefix + label;
    }
    coords.push({
      label: finalLabel,
      x: wallBoundingBox.value.minX - 20,
      y: wallBoundingBox.value.maxY - (i * 20) - 10 // de bas en haut
    });
  }
  return coords;
});

// Undo/Redo logic
const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);

const takeSnapshot = () => {
  undoStack.value.push(JSON.stringify({ layers: layers.value, walls: walls.value, currentLayerIndex: currentLayerIndex.value }));
  redoStack.value = []; // Clear redo stack on new action
  if (undoStack.value.length > 50) { // Limit history size
    undoStack.value.shift();
  }
};

const undo = () => {
  if (undoStack.value.length > 0) {
    redoStack.value.push(JSON.stringify({ layers: layers.value, walls: walls.value, currentLayerIndex: currentLayerIndex.value }));
    const previousState = undoStack.value.pop();
    if (previousState) {
      const state = JSON.parse(previousState);
      if (state.layers) layers.value = state.layers;
      if (state.walls && !state.layers) walls.value = state.walls;
      if (state.currentLayerIndex !== undefined) currentLayerIndex.value = state.currentLayerIndex;
    }
  }
};

const redo = () => {
  if (redoStack.value.length > 0) {
    undoStack.value.push(JSON.stringify({ layers: layers.value, walls: walls.value, currentLayerIndex: currentLayerIndex.value }));
    const nextState = redoStack.value.pop();
    if (nextState) {
      const state = JSON.parse(nextState);
      if (state.layers) layers.value = state.layers;
      if (state.walls && !state.layers) walls.value = state.walls;
      if (state.currentLayerIndex !== undefined) currentLayerIndex.value = state.currentLayerIndex;
    }
  }
};

const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3);
};

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.2);
};

// Watch for props changes to reload data
watch(() => props.roomId, async (newId) => {
  if (newId) {
    roomName.value = props.roomName;
    // await loadRoom();
  }
});

const selectedRackIndices = ref<number[]>([]);
const isWallSelected = ref(false);

const addRack = () => {
  if (walls.value.length === 0) return;
  isWallSelected.value = false;
  takeSnapshot();

  let startX = 40;
  let startY = 40;

  if (wallBoundingBox.value) {
    // Positionner au centre de la boîte englobante des murs
    const centerX = wallBoundingBox.value.minX + wallBoundingBox.value.width / 2;
    const centerY = wallBoundingBox.value.minY + wallBoundingBox.value.height / 2;
    
    // Aligner sur la grille (20px) et centrer le rack (rack_width/2)
    startX = Math.round((centerX - rack_width / 2) / 20) * 20;
    startY = Math.round((centerY - rack_height / 2) / 20) * 20;

    // Si le centre est en dehors de la pièce (cas d'une pièce en L ou U),
    // on essaie de trouver un point à l'intérieur en parcourant la boîte englobante.
    if (!isPointInPolygon(startX + rack_width / 2, startY + rack_height / 2, walls.value)) {
      let found = false;
      // Parcourir la grille à l'intérieur du bounding box pour trouver un point valide
      for (let x = wallBoundingBox.value.minX + 20; x < wallBoundingBox.value.maxX; x += 20) {
        for (let y = wallBoundingBox.value.minY + 20; y < wallBoundingBox.value.maxY; y += 20) {
          if (isPointInPolygon(x, y, walls.value)) {
            startX = Math.round((x - rack_width / 2) / 20) * 20;
            startY = Math.round((y - rack_height / 2) / 20) * 20;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
  }

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

const removeRack = async (index: number) => {
  takeSnapshot();
  racks.value.splice(index, 1);
  selectedRackIndices.value = [];
};

// Drag & Drop logic simple
const draggingRack = ref<number | null>(null);
const isPanning = ref(false);
const rotatingRack = ref<number | null>(null);

const isInteracting = computed(() => 
  draggingRack.value !== null ||
  rotatingRack.value !== null ||
  isPanning.value ||
  isDrawingWalls.value ||
  contextMenu.value.show
);
const lastMousePos = { x: 0, y: 0 };
const rackPositionsBeforeDrag = ref<{x: number, y: number}[]>([]);
const startRotationAngle = ref(0);
const initialRackRotation = ref(0);

const startDragRack = (event: MouseEvent, index: number) => {
  if (isDrawingWalls.value) return;
  if (event.button !== 0) return; // Only left click for dragging
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

  // Store initial positions of all racks (to keep track of "real" non-snapped positions during drag)
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
  
  const table = racks.value[index];
  const centerX = (table?.x ?? 0) + rack_width / 2 + panOffset.value.x;
  const centerY = (table?.y ?? 0) + rack_height / 2 + panOffset.value.y;

  startRotationAngle.value = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
  initialRackRotation.value = table?.rotation || 0;
};

const getConstrainedPoint = (currentX: number, currentY: number, lastPoint: Point | null): Point => {
  const snapX = Math.round(currentX / 20) * 20;
  const snapY = Math.round(currentY / 20) * 20;

  if (!lastPoint) {
    return { x: snapX, y: snapY };
  }

  const dx = snapX - lastPoint.x;
  const dy = snapY - lastPoint.y;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Seuil pour décider si on est plus proche du diagonal ou des axes
  // Si absDx est proche de absDy, on prend le diagonal
  // Sinon on prend l'axe le plus long
  
  if (absDx > absDy * 1.5) {
    // Horizontal
    return { x: snapX, y: lastPoint.y };
  } else if (absDy > absDx * 1.5) {
    // Vertical
    return { x: lastPoint.x, y: snapY };
  } else {
    // 45 degrés
    const dist = Math.round((absDx + absDy) / 2 / 20) * 20;
    return {
      x: lastPoint.x + (dx >= 0 ? dist : -dist),
      y: lastPoint.y + (dy >= 0 ? dist : -dist)
    };
  }
};

const isPointInPolygon = (x: number, y: number, polygon: Point[]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.x, yi = polygon[i]!.y;
    const xj = polygon[j]!.x, yj = polygon[j]!.y;

    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const onMouseMoveSVG = (event: MouseEvent) => {
  if (isDrawingWalls.value) {
    const svg = event.currentTarget as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    // On doit aussi compenser le scale et le translate du groupe <g>
    const x = (svgP.x / zoomLevel.value) - panOffset.value.x;
    const y = (svgP.y / zoomLevel.value) - panOffset.value.y;
    
    const lastPoint = walls.value.length > 0 ? walls.value[walls.value.length - 1] : null;
    wallPreviewPoint.value = getConstrainedPoint(x, y, lastPoint!);
  }
};

const onMouseMove = (event: MouseEvent) => {
  if (isDrawingWalls.value) return;
  if (isPanning.value) {
    panOffset.value.x += event.movementX / zoomLevel.value;
    panOffset.value.y += event.movementY / zoomLevel.value;
    return;
  }
  if (draggingRack.value !== null) {
    const deltaX = (event.clientX - lastMousePos.x) / zoomLevel.value;
    const deltaY = (event.clientY - lastMousePos.y) / zoomLevel.value;

    selectedRackIndices.value.forEach(index => {
      const table = racks.value[index];
      const initialPos = rackPositionsBeforeDrag.value[index];
      if (!table || !initialPos) return;
      
      const rawX = initialPos.x + deltaX;
      const rawY = initialPos.y + deltaY;
      
      // Snap to grid (20px)
      const snapX = Math.round(rawX / 20) * 20;
      const snapY = Math.round(rawY / 20) * 20;

      // Vérifier si la nouvelle position (centre du rack) est à l'intérieur des murs
      if (walls.value.length > 2) {
        if (isPointInPolygon(snapX + rack_width / 2, snapY + rack_height / 2, walls.value)) {
          table.x = snapX;
          table.y = snapY;
        }
      } else {
        table.x = snapX;
        table.y = snapY;
      }
    });
  } else if (rotatingRack.value !== null) {
    const table = racks.value[rotatingRack.value];
    const centerX = (table?.x ?? 0) + (rack_width ?? 0) / 2 + panOffset.value.x;
    const centerY = (table?.y ?? 0) + (rack_height ?? 0) / 2 + panOffset.value.y;
    
    const currentAngle = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
    const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);
    
    const rawRotation = (initialRackRotation.value + deltaAngle) % 360;
    // Snap to 45° increments
    table!.rotation = Math.round(rawRotation / 45) * 45;
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
    
    // Si on clique sur le premier point, on ferme le polygone et on arrête le mode dessin
    if (walls.value.length > 2) {
      const firstPoint = walls.value[0];
      const dist = Math.sqrt(Math.pow(snapX - (firstPoint?.x ?? 0), 2) + Math.pow(snapY - (firstPoint?.y ?? 0), 2));
      if (dist < 10) {
        const finalWalls = [...walls.value];
        isDrawingWalls.value = false;
        wallPreviewPoint.value = null;

        // Génération des 3 layers
        const layerNames = ['Circuits électriques', 'Surfaces au sol', 'Baies'];
        layers.value = layerNames.map((name, index) => ({
          id: index + 1,
          name: name,
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

const emit = defineEmits<{
  (e: 'saved', payload: {racks: Rack[], pods: Pod[], walls: Point[], layers: Layer[]}): void;
}>();

const handleKeyDown = (event: KeyboardEvent) => {
  if (isDrawingWalls.value && event.key === 'Escape') {
    isDrawingWalls.value = false;
    wallPreviewPoint.value = null;
    return;
  }
  const isCtrl = event.ctrlKey || event.metaKey;

  // Undo / Redo
  if (isCtrl && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }

  // Suppression
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Si on est dans un input, on ne supprime pas la table/chaise
    if (event.composedPath().some((el) => {
      if (!(el instanceof HTMLElement)) return false;
      return (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    })) {
      return;
    }

    if (selectedRackIndices.value.length > 0) {
      event.preventDefault();
      takeSnapshot();
      // On trie par index décroissant pour ne pas décaler les index lors de la suppression
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
  const table = racks.value[index];
  const newRack = JSON.parse(JSON.stringify(table));
  delete newRack.id;
  newRack.name = `${table?.name} (copie)`;
  newRack.x += 20;
  newRack.y += 20;
  
  racks.value.push(newRack);
  selectedRackIndices.value = [racks.value.length - 1];
};

const copyRack = (index: number) => {
  const table = racks.value[index];
  const copyData = JSON.parse(JSON.stringify(table));
  delete copyData.id;
  copyData._type = 'rack'; // Tag to identify it as a table
  
  // Copy to system clipboard as JSON string
  navigator.clipboard.writeText(JSON.stringify(copyData))
    .then(() => console.log('Rack copied to clipboard'))
    .catch(err => console.error('Failed to copy table: ', err));
};

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);
    
    if (!data || typeof data !== 'object') return;

    // Handle pasting a table
    if (data._type === 'rack') {
      takeSnapshot();
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
    emit('saved', {
      racks: racks.value, 
      pods: pods.value, 
      walls: walls.value,
      layers: layers.value
    });
  } catch (e) {
    console.error(e);
    // @ts-ignore
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

const contextMenu = ref<{ x: number, y: number, show: boolean }>({ x: 0, y: 0, show: false });

const contextMenuOptions = computed(() => {
  if (selectedRackIndices.value.length === 0) return { type: 'none' };

  const selectedRacks = selectedRackIndices.value.map(idx => racks.value[idx]!);
  const podsInSelection = [...new Set(selectedRacks.map(r => r.podId).filter(Boolean))];

  if (podsInSelection.length === 0) {
    return { type: 'create_pod' };
  }

  if (podsInSelection.length === 1) {
    const podId = podsInSelection[0]!;
    const racksInPod = racks.value.filter(r => r.podId === podId);
    const allRacksOfPodSelected = racksInPod.every(r => 
      selectedRackIndices.value.includes(racks.value.indexOf(r))
    );

    if (allRacksOfPodSelected) {
      return { type: 'delete_pod', podId };
    } else {
      return { type: 'leave_pod', podId };
    }
  }

  // Multiple pods or mixed selected - for now just leave pod of the first one or ignore
  return { type: 'leave_pod', podId: podsInSelection[0]! };
});

const openContextMenu = (event: MouseEvent, index: number) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Si le rack n'est pas déjà sélectionné, on le sélectionne (et on déselectionne les autres sauf si Ctrl est pressé)
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
    racks.value[index]!.podId = null;
  });
  
  closeContextMenu();
  
  new Notify({
    status: 'success',
    title: 'Pod quitté',
    text: `Les racks sélectionnés ont été sortis de leur pod`,
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
  
  // Sortir tous les racks de ce pod (au cas où certains n'étaient pas sélectionnés, 
  // même si la logique actuelle dit qu'on ne propose l'option que si tout est sélectionné)
  racks.value.forEach(r => {
    if (r.podId === podId) {
      r.podId = null;
    }
  });
  
  // Supprimer le pod de la liste
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
  racks.value.forEach((rack, index) => {
    if (rack.podId === podId) {
      podRacksIndices.push(index);
    }
  });

  if (podRacksIndices.length > 0) {
    selectedRackIndices.value = podRacksIndices;
    // On simule le début d'un drag pour le premier rack du pod pour activer la logique de déplacement
    startDragRack(event, podRacksIndices[0]!);
  }
};

const clearWalls = () => {
  triggerClearWalls();
};

onMounted(async () => {
  if (props.layers && props.layers.length > 0) {
    layers.value = typeof props.layers === 'string' ? JSON.parse(props.layers) : props.layers;
    currentLayerIndex.value = 0;
  } else {
    // Fallback aux anciennes props si pas de layers
    if (props.walls && props.walls.length > 0) {
      const initialWalls = typeof props.walls === 'string' ? JSON.parse(props.walls) : props.walls;
      // Si on a des murs mais pas de layers, on peut soit les mettre dans wallsRef soit générer les layers
      walls.value = initialWalls;
      
      const initialRacks = typeof props.racks === 'string' ? JSON.parse(props.racks) : props.racks;
      const initialPods = typeof props.pods === 'string' ? JSON.parse(props.pods) : props.pods;

      // Si on a déjà des murs, on génère les 3 layers avec le contenu existant sur le premier layer
      const layerNames = ['Circuits électriques', 'Surfaces au sol', 'Baies'];
      layers.value = layerNames.map((name, index) => ({
        id: index + 1,
        name: name,
        racks: index === 0 ? initialRacks : [],
        pods: index === 0 ? initialPods : [],
        walls: JSON.parse(JSON.stringify(initialWalls))
      }));
    }
  }
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="builder-container" @mousemove="onMouseMove" @mouseup="stopDrag" @wheel="onWheel">
    <div class="toolbar">
      <div class="room-info">
        <label>Nom: <input v-model="roomName" /></label>
      </div>
      <div class="history-controls">
        <button class="btn btn-sm btn-secondary" @click="undo" :disabled="undoStack.length === 0" title="Annuler (Ctrl+Z)">↶</button>
        <button class="btn btn-sm btn-secondary" @click="redo" :disabled="redoStack.length === 0" title="Rétablir (Ctrl+Maj+Z)">↷</button>
      </div>
      <button class="btn btn-secondary" @click="addRack" :disabled="walls.length === 0" :title="walls.length === 0 ? 'Dessinez d\'abord les murs pour ajouter des racks' : ''">Ajouter un rack</button>
      <button class="btn" :class="isDrawingWalls ? 'btn-primary' : 'btn-secondary'" @click="isDrawingWalls = !isDrawingWalls">
        {{ isDrawingWalls ? 'Arrêter les murs' : 'Dessiner les murs' }}
      </button>
      <button v-if="walls.length > 0" class="btn btn-danger" @click="clearWalls">Supprimer la pièce</button>

      <div class="zoom-controls">
        <button class="btn btn-sm btn-secondary" @click="zoomOut" :disabled="zoomLevel <= 0.2">-</button>
        <span class="zoom-text">{{ Math.round(zoomLevel * 100) }}%</span>
        <button class="btn btn-sm btn-secondary" @click="zoomIn" :disabled="zoomLevel >= 3">+</button>
      </div>
      <button @click="save" class="btn btn-primary">Sauvegarder</button>
      <p class="hint">Glissez les éléments pour les placer.</p>
    </div>

    <div class="canvas-area">
      <svg
          width="100%"
          height="600"
          class="canvas-svg"
          :class="{ interacting: isInteracting, 'drawing-walls': isDrawingWalls }"
          @mousedown="deselect"
          @mousemove="onMouseMoveSVG"
      >
        <defs>
          <pattern id="grid" :width="20 * zoomLevel" :height="20 * zoomLevel" patternUnits="userSpaceOnUse">
            <path :d="`M ${20 * zoomLevel} 0 L 0 0 0 ${20 * zoomLevel}`" fill="none" stroke="#eee" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" class="canvas-background" :transform="`translate(${(panOffset.x * zoomLevel) % (20 * zoomLevel)}, ${(panOffset.y * zoomLevel) % (20 * zoomLevel)})`" />

        <g :transform="`scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`">
          <!-- Non-active layers (background) -->
          <g v-for="(layer, lIdx) in layers" :key="'layer-' + layer.id" 
             v-show="lIdx !== currentLayerIndex"
             class="layer-inactive"
          >
            <!-- Walls -->
            <polyline
                v-if="layer.walls.length > 0"
                :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
                fill="none"
                stroke="#333"
                stroke-width="4"
                stroke-linejoin="round"
                stroke-linecap="round"
            />
            <polygon
                v-if="layer.walls.length > 2"
                :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
                class="room-surface"
                stroke="#333"
                stroke-width="4"
                stroke-linejoin="round"
            />

            <!-- Pods boundaries -->
            <rect
                v-for="pod in getPodBoundaries(layer.racks, layer.pods)"
                :key="pod!.id"
                :x="pod!.x"
                :y="pod!.y"
                :width="pod!.width"
                :height="pod!.height"
                class="pod-rect"
            />

            <!-- Racks -->
            <g v-for="(table, tIdx) in layer.racks" :key="'rack-' + tIdx">
              <g :transform="`rotate(${table?.rotation || 0}, ${table.x + rack_width / 2}, ${table.y + rack_height / 2})`">
                <rect
                    :x="table.x" :y="table.y"
                    :width="rack_width" :height="rack_height"
                    class="table-rect"
                    :class="{ grouped: table.podId }"
                />
                <text
                    :x="table.x + rack_width / 2"
                    :y="table.y + rack_height / 2"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    class="table-label"
                >{{ table.name }}</text>
              </g>
            </g>
          </g>

          <!-- Active Layer -->
          <g class="layer-active">
            <!-- Walls -->
            <polyline
                v-if="walls.length > 0"
                :points="walls.map(p => `${p.x},${p.y}`).join(' ')"
                fill="none"
                stroke="#333"
                stroke-width="4"
                stroke-linejoin="round"
                stroke-linecap="round"
            />
            <polygon
                v-if="!isDrawingWalls && walls.length > 2"
                :points="walls.map(p => `${p.x},${p.y}`).join(' ')"
                class="room-surface"
                :class="{ selected: isWallSelected }"
                @mousedown.stop="isWallSelected = true; selectedRackIndices = []"
                stroke="#333"
                stroke-width="4"
                stroke-linejoin="round"
            />
          <!-- Preview line when drawing -->
          <circle
              v-if="isDrawingWalls && wallPreviewPoint"
              :cx="wallPreviewPoint.x"
              :cy="wallPreviewPoint.y"
              r="4"
              fill="#333"
          />
          <line
              v-if="isDrawingWalls && walls.length > 0 && wallPreviewPoint"
              :x1="walls[walls.length - 1]?.x"
              :y1="walls[walls.length - 1]?.y"
              :x2="wallPreviewPoint.x"
              :y2="wallPreviewPoint.y"
              stroke="#333"
              stroke-width="4"
              stroke-linejoin="round"
              stroke-linecap="round"
          />
          <!-- Closing line preview -->
          <line
              v-if="isDrawingWalls && walls.length > 2 && wallPreviewPoint"
              :x1="wallPreviewPoint.x"
              :y1="wallPreviewPoint.y"
              :x2="walls[0]?.x"
              :y2="walls[0]?.y"
              stroke="rgba(0,0,0,0.2)"
              stroke-width="2"
              stroke-dasharray="2,2"
          />

          <!-- Pods boundaries -->
          <rect
              v-for="pod in podBoundaries"
              :key="pod!.id"
              :x="pod!.x"
              :y="pod!.y"
              :width="pod!.width"
              :height="pod!.height"
              class="pod-rect"
              :class="{ selected: selectedRackIndices.length > 0 && racks[selectedRackIndices[0]!]?.podId === pod!.id }"
              @mousedown="selectPod($event, pod!.id)"
          />

          <!-- Coordinates -->
          <g v-if="wallBoundingBox" class="coordinates-labels">
            <text
                v-for="(coord, idx) in horizontalCoords"
                :key="'h-' + idx"
                :x="coord.x"
                :y="coord.y"
                text-anchor="middle"
                class="coord-text"
            >{{ coord.label }}</text>
            <text
                v-for="(coord, idx) in verticalCoords"
                :key="'v-' + idx"
                :x="coord.x"
                :y="coord.y"
                text-anchor="end"
                dominant-baseline="middle"
                class="coord-text"
            >{{ coord.label }}</text>
          </g>

          <g v-for="(table, tIdx) in racks" :key="tIdx">
            <g :transform="`rotate(${table?.rotation || 0}, ${table.x + rack_width / 2}, ${table.y + rack_height / 2})`">
              <!-- Rack -->
              <rect
                  :x="table.x" :y="table.y"
                  :width="rack_width" :height="rack_height"
                  class="table-rect"
                  :class="{ selected: selectedRackIndices.includes(tIdx), grouped: table.podId }"
                  @mousedown="startDragRack($event, tIdx)"
                  @contextmenu="openContextMenu($event, tIdx)"
              />

              <!-- Indicateur de l'avant du rack (en bas du carré par défaut) -->
              <line
                  :x1="table.x + 1" :y1="table.y + (rack_height / 10) * 9"
                  :x2="table.x + (rack_width - 1)" :y2="table.y + (rack_height / 10) * 9"
                  class="rack-front-line"
              />

              <text
                  :x="table.x + rack_width / 2"
                  :y="table.y + rack_height / 2"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="table-label"
                  :transform="`rotate(${- (table?.rotation || 0)}, ${table.x + rack_width / 2}, ${table.y + rack_height / 2})`"
              >
                {{ table.name }}
              </text>

              <!-- Poignées de rotation sur les coins (visibles seulement si sélectionnée seule) -->
              <template v-if="selectedRackIndices.length === 1 && selectedRackIndices[0] === tIdx">
                <circle
                    v-for="(pos, pIdx) in [
                    {x: table.x, y: table.y},
                    {x: table.x + rack_width, y: table.y},
                    {x: table.x, y: table.y + rack_height},
                    {x: table.x + rack_width, y: table.y + rack_height}
                  ]"
                    :key="pIdx"
                    :cx="pos.x" :cy="pos.y" r="6"
                    class="rotation-handle"
                    @mousedown="startRotateRack($event, tIdx)"
                />
              </template>
            </g>
          </g>
        </g>
      </g>
    </svg>

      <div v-if="contextMenu.show" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }">
        <ul>
          <li v-if="contextMenuOptions.type === 'create_pod'" @click="createPod">Créer un nouveau pod</li>
          <li v-if="contextMenuOptions.type === 'leave_pod'" @click="leavePod">Sortir du pod</li>
          <li v-if="contextMenuOptions.type === 'delete_pod'" @click="deletePod(contextMenuOptions.podId!)">Supprimer le pod</li>
        </ul>
      </div>

      <Modal
        :show="showClearModal"
        :title="clearModalConfig.title"
        :message="clearModalConfig.message"
        :confirm-text="clearModalConfig.confirmText"
        @confirm="clearModalConfig.onConfirm"
        @cancel="showClearModal = false"
      />

      <div v-if="selectedRackIndices.length === 1 && !isWallSelected" class="properties-panel">
        <div v-if="racks[selectedRackIndices[0]!]">
          <h3>Rack</h3>
          <label>Nom: <input v-model="racks[selectedRackIndices[0]!]!.name" @keyup.delete.stop.prevent="() => {}" /></label>
          <label>Rotation (°): <input type="number" v-model.number="racks[selectedRackIndices[0]!]!.rotation" step="45" @change="racks[selectedRackIndices[0]!]!.rotation = Math.round((racks[selectedRackIndices[0]!]?.rotation ?? 0) / 45) * 45" /></label>
          <label v-if="racks[selectedRackIndices[0]!]?.podId">Pod ID: <span>{{ racks[selectedRackIndices[0]!]?.podId }}</span></label>

          <div class="actions">
            <button @click="removeRack(selectedRackIndices[0]!)" class="btn btn-danger">Supprimer le rack</button>
          </div>
        </div>
      </div>
      <div v-else-if="selectedRackIndices.length > 1" class="properties-panel">
        <div>
          <h3>Sélection multiple</h3>
          <p>{{ selectedRackIndices.length }} racks sélectionnés</p>
          <div class="actions">
             <button v-if="contextMenuOptions.type === 'create_pod'" @click="createPod" class="btn btn-secondary">Créer un pod</button>
             <button v-if="contextMenuOptions.type === 'leave_pod'" @click="leavePod" class="btn btn-secondary">Sortir du pod</button>
             <button v-if="contextMenuOptions.type === 'delete_pod'" @click="deletePod(contextMenuOptions.podId!)" class="btn btn-danger">Supprimer le pod</button>
             <button @click="selectedRackIndices = []" class="btn btn-outline-secondary">Désélectionner tout</button>
          </div>
        </div>
      </div>
      <div v-if="layers.length > 0" class="layer-previews">
        <div 
          v-for="(layer, index) in layers" 
          :key="'preview-' + layer.id"
          class="layer-preview-card"
          :class="{ active: currentLayerIndex === index }"
          @click="currentLayerIndex = index"
        >
          <div class="preview-title">{{ layer.name }}</div>
          <svg
            :viewBox="getWallBoundingBox(layer.walls) ? `${getWallBoundingBox(layer.walls)!.minX - 20} ${getWallBoundingBox(layer.walls)!.minY - 20} ${getWallBoundingBox(layer.walls)!.width + 40} ${getWallBoundingBox(layer.walls)!.height + 40}` : '0 0 100 100'"
            class="mini-map"
          >
            <!-- Walls -->
            <polygon
                v-if="layer.walls.length > 2"
                :points="layer.walls.map(p => `${p.x},${p.y}`).join(' ')"
                fill="rgba(0,0,0,0.05)"
                stroke="#333"
                stroke-width="2"
            />
            
            <!-- Racks -->
            <g v-for="(table, tIdx) in layer.racks" :key="'preview-rack-' + tIdx">
              <rect
                  :x="table.x" :y="table.y"
                  :width="rack_width" :height="rack_height"
                  fill="#d2b48c"
                  stroke="#8b4513"
                  stroke-width="1"
                  :transform="`rotate(${table?.rotation || 0}, ${table.x + rack_width / 2}, ${table.y + rack_height / 2})`"
              />
            </g>

            <!-- Pods -->
            <rect
                v-for="pod in getPodBoundaries(layer.racks, layer.pods)"
                :key="'preview-pod-' + pod!.id"
                :x="pod!.x"
                :y="pod!.y"
                :width="pod!.width"
                :height="pod!.height"
                fill="none"
                stroke="red"
                stroke-width="1"
                stroke-dasharray="2, 2"
            />
          </svg>
        </div>
      </div>
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
.toolbar {
  padding: 1rem;
  background: #f4f4f4;
  display: flex;
  gap: 1rem;
  align-items: center;
  border-bottom: 1px solid #ccc;
  flex-wrap: wrap;
}
.history-controls {
  display: flex;
  gap: 5px;
}
.room-info input {
  padding: 0.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: white;
}
.canvas-svg {
  cursor: grab;
}
.canvas-svg:active {
  cursor: grabbing;
}
.canvas-svg.interacting {
  cursor: grabbing;
}
.table-rect {
  fill: #d2b48c;
  stroke: #8b4513;
  stroke-width: 2;
  cursor: move;
}
.table-rect.selected {
  stroke: #ff4500;
  stroke-width: 3;
}
.room-surface {
  fill: rgba(0,0,0,0.03);
  cursor: pointer;
}
.room-surface.selected {
  fill: rgba(255, 69, 0, 0.1);
  stroke: #ff4500;
}
.table-rect.grouped {
  fill: #e3f2fd;
  stroke: #90caf9;
}

.pod-rect {
  fill: rgba(255, 0, 0, 0.05);
  stroke: red;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
  cursor: pointer;
  pointer-events: all;
  transition: fill 0.2s;
}
.pod-rect:hover {
  fill: rgba(255, 0, 0, 0.1);
}
.pod-rect.selected {
  stroke: #ff4500;
  fill: rgba(255, 69, 0, 0.1);
  stroke-dasharray: none;
}

.coord-text {
  font-size: 10px;
  fill: #666;
  user-select: none;
  pointer-events: none;
  font-weight: bold;
}

.table-rect.grouped.selected {
  stroke: #ff4500;
}
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
  z-index: 1000;
}
.context-menu ul {
  list-style: none;
  margin: 0;
  padding: 5px 0;
}
.context-menu li {
  padding: 8px 15px;
  cursor: pointer;
}
.context-menu li:hover {
  background-color: #f0f0f0;
}
.btn-outline-secondary {
  background: transparent;
  border: 1px solid #ccc;
  color: #333;
}
.btn-outline-secondary:hover {
  background: #f4f4f4;
}
.rack-front-line {
  stroke: #ff4500;
  stroke-width: 4;
}
.rotation-handle {
  fill: white;
  stroke: #ff4500;
  stroke-width: 2;
  cursor: alias;
}
.table-label {
  pointer-events: none;
  font-size: 12px;
  font-weight: bold;
  user-select: none;
}
.canvas-svg.interacting {
  user-select: none;
}
.properties-panel {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 280px;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 1.25rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  max-height: calc(100% - 2rem);
  overflow-y: auto;
  z-index: 10;
}
.properties-panel h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 0.5rem;
}
.properties-panel label {
  display: block;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4b5563;
}
.properties-panel input, .properties-panel select {
  width: calc(100% - 10px);
  margin-top: 0.25rem;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #1f2937;
  transition: border-color 0.2s;
}
.properties-panel input:focus, .properties-panel select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}
.properties-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 1rem;
}
.layer-selector {
  display: flex;
  gap: 5px;
  margin: 0 10px;
  padding: 5px;
  background: #f5f5f5;
  border-radius: 4px;
}

.layer-selector .btn {
  padding: 4px 8px;
  font-size: 0.8rem;
}

.layer-inactive {
  opacity: 0.3;
  pointer-events: none;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 4px;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.zoom-text {
  font-size: 0.8rem;
  min-width: 45px;
  text-align: center;
  font-weight: 600;
  color: #374151;
}

.hint {
  font-size: 0.8rem;
  color: #666;
}
.canvas-svg.drawing-walls {
  cursor: crosshair !important;
}

.layer-previews {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: row;
  gap: 10px;
  z-index: 20;
  pointer-events: none;
}

.layer-preview-card {
  width: 150px;
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 5px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.2s;
}

.layer-preview-card:hover {
  border-color: #2563eb;
  transform: scale(1.05);
}

.layer-preview-card.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.preview-title {
  font-size: 0.7rem;
  font-weight: bold;
  margin-bottom: 4px;
  color: #4b5563;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-map {
  width: 100%;
  height: 100px;
  background: #f9fafb;
  border-radius: 4px;
}
</style>
