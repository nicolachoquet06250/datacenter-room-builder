<script lang="ts">
export const exposedFunctions = Symbol('exposedFunctions');

export type ExposedFunctions = {
  getWallBoundingBox(walls?: Point[] | undefined): (MinPoint & MaxPoint & Size) | null;
  getPodBoundaries(racks: Rack[], pods: { id: string; name: string }[]): Array<(Point & Size & { id: string }) | null>;
  getGridLabel(x: number, y: number, wallBoundingBox: (Size & MinPoint & MaxPoint) | null, mode?: 'full' | 'letter' | 'number'): string;
}

type Props = {
  roomId: number;
  roomName: string;
  layers?: string;
  radius?: number
  disableAddRacks?: boolean
  useItopForm?: boolean
  itopCreateRackUrl?: string,
  itopTooltipUrl?: string,
  isDataLoading?: boolean,
  language?: string,
  langKeys?: string,
  footprintColors?: string,
  withLayerPreview?: boolean,
  showLocationName?: boolean
}

type Emits = {
  (e: 'saved', payload: {
    roomName: string,
    layers: Layer[]
  }): void;
  (e: 'refresh'): void;
}
</script>

<script setup lang="ts">
import 'simple-notify/dist/simple-notify.css';
import {computed, onMounted, onUnmounted, provide, ref, useTemplateRef, watch, watchEffect} from 'vue';
import Modal from './Modal.vue';
import Tooltip from './Tooltip.vue';
import {
  BuilderToolbar, BuilderCanvas,
  BuilderContextMenu, BuilderPropertiesPanel,
  BuilderLayerPreviews, UnplacedRacksSidebar,
  UnplacedCircuitsSidebar, UnplacedFootprintsSidebar
} from './room-builder'
import {getRackDimensions, rackHeight, rackWidth, useRoomBuilderGeometry} from '../composables/useRoomBuilderGeometry';
import {useRoomBuilderHistory} from '../composables/useRoomBuilderHistory';
import {useNotify} from '../composables/useNotify';
import {useDrawRoomWalls} from "../composables/useDrawRoomWalls.ts";
import {useCanvas} from "../composables/useCanvas.ts";
import {useLayers} from "../composables/useLayers.ts";
import {usePan} from "../composables/usePan.ts";
import {useContextMenu} from "../composables/useContextMenu.ts";
import {usePodsCrud} from "../composables/usePodsCrud.ts";
import {useRacksCrud} from "../composables/useRacksCrud.ts";
import {useZoom} from "../composables/useZoom.ts";
import {useModal} from "../composables/useModal.ts";
import {colors, useFootprints} from "../composables/useFootprints.ts";
import {useWallResizer} from "../composables/useWallResizer.ts";
import {usePillars} from "../composables/usePillars.ts";
import {clearTooltipTimer, useSpecificTooltip, useTooltip} from "../composables/useTooltip.ts";
import {SNAP_SIZE, GRID_SIZE} from "../constants";
import BuilderLayerDropdown from "./room-builder/BuilderLayerDropdown.vue";

const props = withDefaults(
  defineProps<Props>(),
  {
    layers: '[]',
    radius: 0,
    disableAddRacks: false,
    useItopForm: false,
    itopCreateRackUrl: '/pages/UI.php?route=linkset.create_linked_object',
    itopTooltipUrl: '/pages/UI.php?route=object.summary',
    isDataLoading: false,
    language: 'FR FR',
    langKeys: JSON.stringify({
      'FR FR': {
        'FloorPlanBuilder:Toolbar:Room:Name': 'Nom de la salle',

        'FloorPlanBuilder:Toolbar:History:Previous': 'Annuler',
        'FloorPlanBuilder:Toolbar:History:Next': 'Rétablir',

        'FloorPlanBuilder:Toolbar:Move:Center': 'Recentrer',

        'FloorPlanBuilder:Toolbar:Zoom:In': 'Zoom avant',
        'FloorPlanBuilder:Toolbar:Zoom:Out': 'Zoom arrière',

        'FloorPlanBuilder:Toolbar:Layers:Walls': 'Murs',
        'FloorPlanBuilder:Toolbar:Layers:Walls:Title:Start': 'Dessiner les murs',
        'FloorPlanBuilder:Toolbar:Layers:Walls:Title:Stop': 'Arrêter les murs',
        'FloorPlanBuilder:Toolbar:Layers:Walls:Pillars': 'Poteaux',
        'FloorPlanBuilder:Toolbar:Layers:Walls:Pillars:Title:Start': 'Dessiner des poteaux',
        'FloorPlanBuilder:Toolbar:Layers:Walls:Pillars:Title:Stop': 'Arrêter les poteaux',
        'FloorPlanBuilder:Toolbar:Layers:Walls:Remove': 'Supprimer la pièce',

        'FloorPlanBuilder:Toolbar:Layers:Circuits': 'Circuit',
        'FloorPlanBuilder:Toolbar:Layers:Circuits:Title': 'Ajouter un circuit électrique',

        'FloorPlanBuilder:Toolbar:Layers:Racks': 'Rack',
        'FloorPlanBuilder:Toolbar:Layers:Racks:Title': 'Ajouter un rack',

        'FloorPlanBuilder:Toolbar:Save': 'Sauvegarder',

        'FloorPlanBuilder:Layers:Walls:Title': 'Murs',
        'FloorPlanBuilder:Layers:Circuits:Title': 'Circuits électriques',
        'FloorPlanBuilder:Layers:Footprints:Title': 'Surfaces au sol',
        'FloorPlanBuilder:Layers:Racks:Title': 'Baies',

        'FloorPlanBuilder:Panels:Room:Title': 'Propriétés de la pièce',
        'FloorPlanBuilder:Panels:Room:WallsNumber': 'Nombre de murs',
        'FloorPlanBuilder:Panels:Room:UnitsNumber': 'Nombre d\'unités',
        'FloorPlanBuilder:Panels:Room:TotalArea': 'Superficie totale',
        'FloorPlanBuilder:Panels:Room:TotalArea:Sublabel': 'Basé sur une unité de 600mm',

        'FloorPlanBuilder:Panels:Pillars:Title': 'Positionnement du poteau',
        'FloorPlanBuilder:Panels:Pillars:XPosition': 'Position X',
        'FloorPlanBuilder:Panels:Pillars:YPosition': 'Position Y',
        'FloorPlanBuilder:Panels:Pillars:Remove': 'Supprimer les poteaux',
        'FloorPlanBuilder:Panels:Pillar:Remove': 'Supprimer le poteaux',

        'FloorPlanBuilder:Panels:Circuits:Title': 'Positionnement du circuit',
        'FloorPlanBuilder:Panels:Circuits:Multiple:Title': 'Positionnement du circuit',
        'FloorPlanBuilder:Panels:Circuits:Name': 'Nom',
        'FloorPlanBuilder:Panels:Circuits:Coordinates': 'Coordonnées',
        'FloorPlanBuilder:Panels:Circuits:Remove': 'Supprimer la sélection',

        'FloorPlanBuilder:Panels:Footprints:Title': 'Positionnement du Footprint',
        'FloorPlanBuilder:Panels:Footprints:Name': 'Nom',
        'FloorPlanBuilder:Panels:Footprints:Units': 'Unités',
        'FloorPlanBuilder:Panels:Footprints:Color': 'Couleur',
        'FloorPlanBuilder:Panels:Footprints:Rotation': 'Rotation',
        'FloorPlanBuilder:Panels:Footprints:Remove': 'Supprimer le Footprint',

        'FloorPlanBuilder:Panels:Racks:Title': 'Positionnement du Rack',
        'FloorPlanBuilder:Panels:Racks:Multiple:Title': 'Selection multiple',
        'FloorPlanBuilder:Panels:Racks:Multiple:SelectedElements': 'éléments sélectionnés',
        'FloorPlanBuilder:Panels:Racks:Name': 'Nom du Rack',
        'FloorPlanBuilder:Panels:Racks:Coordinates': 'Coordonnée',
        'FloorPlanBuilder:Panels:Racks:Rotation': 'Rotation',
        'FloorPlanBuilder:Panels:Racks:Remove': 'Supprimer le Rack',

        'FloorPlanBuilder:Panels:CircuitsToSetPosition:Title': 'Circuits à positionner',
        'FloorPlanBuilder:Panels:CircuitToSetPosition:MissingPosition': 'Position manquante',

        'FloorPlanBuilder:Panels:FootprintsToSetPosition:Title': 'Footprints à positionner',
        'FloorPlanBuilder:Panels:FootprintToSetPosition:MissingPosition': 'Position manquante',
        'FloorPlanBuilder:Panels:FootprintToSetPosition:Unnamed': 'Footprint sans nom',

        'FloorPlanBuilder:Panels:RacksToSetPosition:Title': 'Footprints à positionner',
        'FloorPlanBuilder:Panels:RackToSetPosition:MissingPositionAndRotation': 'Position/Rotation manquante',
      }
    }),
    footprintColors: '[]',
    withLayerPreview: false,
    showLocationName: false
  }
);

watch(() => props.language, lang => {
  console.log('lang changed', lang);
}, {immediate: true});

const emit = defineEmits<Emits>();

const propsLayers = computed<Layer[]>(() => JSON.parse(props.layers));
const langKeys = computed(() => {
  const langs = JSON.parse(props.langKeys);

  return langs[props.language!] ?? Object.entries(langs['FR FR']).map(([key, value]) => ({
    [key]: `${value} (FR FR)`
  })).reduce((r, c) => ({ ...r, ...c }), {});
});
const footprintColors = computed(() => JSON.parse(props.footprintColors));

provide('langs', langKeys);

watchEffect(() => {
  console.log('propsLayers', propsLayers.value)
})

const {
  getPodBoundaries, getWallBoundingBox,
  getConstrainedPoint, isPointInPolygon,
  isElementInWalls, findClosestPointInside
} = useRoomBuilderGeometry();

const {error: notifyError} = useNotify();

const {
  wallPreviewPoint, isWallSelected, isDrawingWalls, wallsRef, walls,
  cancelDrawingWalls, toggleIsDrawingWalls, createWall
} = useDrawRoomWalls();

const isRefreshMode = ref(false);

const {
  layers,
  currentLayerIndex,
  clearLayers,
  initialize: initializeLayers,
  currentLayer
} = useLayers(walls, isRefreshMode, propsLayers);

const shouldShowLayers = computed(() => {
  if (layers.value.length === 0) return false;
  if (isDrawingWalls.value) return false;
  const firstLayer = layers.value[0];
  if (!firstLayer) return false;
  return (firstLayer.walls && firstLayer.walls.length > 2) || (firstLayer.pillars && firstLayer.pillars.length > 0);
});

const incompleteRacks = computed(() => {
  const baiesLayer = layers.value.find(l => l.name === 'FloorPlanBuilder:Layers:Racks:Title');
  if (!baiesLayer) return [];
  return baiesLayer.racks.filter(r => r.x === undefined || r.x === null || r.y === undefined || r.y === null || r.rotation === undefined || r.rotation === null);
});

const incompleteCircuits = computed(() => {
  const circuitsLayer = layers.value.find(l => l.name === 'FloorPlanBuilder:Layers:Circuits:Title');
  if (!circuitsLayer) return [];
  return circuitsLayer.circuits.filter(c => c.x === undefined || c.x === null || c.y === undefined || c.y === null);
});

const incompleteFootprints = computed(() => {
  const surfacesLayer = layers.value.find(l => l.name === 'FloorPlanBuilder:Layers:Footprints:Title');
  if (!surfacesLayer) return [];
  return surfacesLayer.footprints.filter(f => (!f.units || f.units.length === 0) && f.width && f.height);
});

const onSelectUnplacedRack = (id: number | string) => {
  const rackIndex = racks.value.findIndex(r => String(r.id) === String(id));
  if (rackIndex !== -1) {
    selectedRackIndices.value = [rackIndex];
  }
};

const onSelectUnplacedCircuit = (id: string) => {
  const circuitIndex = circuitPaths.value.findIndex(c => String(c.id) === id);
  if (circuitIndex !== -1) {
    selectedCircuitIndices.value = [circuitIndex];
  }
};

const onSelectUnplacedFootprint = (id: string) => {
  selectedFootprintId.value = id;
  const surfacesLayer = layers.value.find(l => l.name === 'Surfaces au sol');
  const footprint = surfacesLayer?.footprints.find(f => f.id === id);
  if (footprint && !footprint.name) {
    footprint.name = `Footprint ${surfacesLayer?.footprints.indexOf(footprint)! + 1}`;
  }
};

const onDragOverRack = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
};

const onDropRack = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  const rackIdStr = event.dataTransfer?.getData('rackId');
  const circuitIdStr = event.dataTransfer?.getData('circuitId');
  const footprintId = event.dataTransfer?.getData('footprintId');

  if (rackIdStr) {
    const rackIndex = racks.value.findIndex(r => String(r.id) === rackIdStr);
    if (rackIndex === -1) return;

    const rack = racks.value[rackIndex];
    if (!rack) return;

    const svg = canvasComponent.value?.svgRef;
    if (!svg) {
      notifyError({
        title: 'Erreur',
        text: 'Impossible de calculer la position du drop (SVG non disponible).'
      });
      return;
    }

    const CTM = svg.getScreenCTM();
    if (!CTM) {
      notifyError({
        title: 'Erreur',
        text: 'Impossible de calculer la position du drop (CTM indisponible).'
      });
      return;
    }

    const x = (event.clientX - CTM.e) / CTM.a;
    const y = (event.clientY - CTM.f) / CTM.d;

    const worldX = x / zoomLevel.value - panOffset.value.x;
    const worldY = y / zoomLevel.value - panOffset.value.y;

    const { w, h } = getRackDimensions(rack);

    const rawX = worldX - w / 2;
    const rawY = worldY - h / 2;

    const snapX = Math.round(rawX / SNAP_SIZE) * SNAP_SIZE;
    const snapY = Math.round(rawY / SNAP_SIZE) * SNAP_SIZE;

    if (walls.value.length > 2 && !isElementInWalls(snapX, snapY, 0, walls.value, w, h)) {
      notifyError({
        title: 'Erreur',
        text: 'Le rack doit être positionné à l\'intérieur des murs.'
      });
      return;
    }

    takeSnapshot();
    rack.x = snapX;
    rack.y = snapY;
    rack.rotation = 0;
    selectedRackIndices.value = [rackIndex];
  } else if (circuitIdStr) {
    const circuitIndex = circuitPaths.value.findIndex(c => String(c.id) === circuitIdStr);
    if (circuitIndex === -1) return;

    const circuit = circuitPaths.value[circuitIndex];
    if (!circuit) return;

    const svg = canvasComponent.value?.svgRef;
    if (!svg) {
      notifyError({
        title: 'Erreur',
        text: 'Impossible de calculer la position du drop (SVG non disponible).'
      });
      return;
    }

    const CTM = svg.getScreenCTM();
    if (!CTM) {
      notifyError({
        title: 'Erreur',
        text: 'Impossible de calculer la position du drop (CTM indisponible).'
      });
      return;
    }

    const x = (event.clientX - CTM.e) / CTM.a;
    const y = (event.clientY - CTM.f) / CTM.d;

    const worldX = x / zoomLevel.value - panOffset.value.x;
    const worldY = y / zoomLevel.value - panOffset.value.y;

    const rawX = worldX - 20; // circuitWidth / 2
    const rawY = worldY - 20; // circuitHeight / 2

    const snapX = Math.round(rawX / SNAP_SIZE) * SNAP_SIZE;
    const snapY = Math.round(rawY / SNAP_SIZE) * SNAP_SIZE;

    if (walls.value.length > 2 && !isElementInWalls(snapX, snapY, 0, walls.value)) {
      notifyError({
        title: 'Erreur',
        text: 'Le circuit doit être positionné à l\'intérieur des murs.'
      });
      return;
    }

    takeSnapshot();
    circuit.x = snapX;
    circuit.y = snapY;
    circuit.rotation = 0;
    selectedCircuitIndices.value = [circuitIndex];
  } else if (footprintId) {
    const footprint = currentLayer.value.footprints?.find(f => f.id === footprintId);
    if (!footprint) return;

    const svg = canvasComponent.value?.svgRef;
    if (!svg) {
      notifyError({
        title: 'Erreur',
        text: 'Impossible de calculer la position du drop (SVG non disponible).'
      });
      return;
    }

    const CTM = svg.getScreenCTM();
    if (!CTM) {
      notifyError({
        title: 'Erreur',
        text: 'Impossible de calculer la position du drop (CTM indisponible).'
      });
      return;
    }

    const x = (event.clientX - CTM.e) / CTM.a;
    const y = (event.clientY - CTM.f) / CTM.d;

    const worldX = x / zoomLevel.value - panOffset.value.x;
    const worldY = y / zoomLevel.value - panOffset.value.y;

    const widthPx = (footprint.width || 1200) / 600 * 20;
    const heightPx = (footprint.height || 1200) / 600 * 20;

    // Détermine le nombre d'unités de grille nécessaires pour couvrir cette dimension (en tenant compte de la rotation)
    const normRotation = ((footprint.rotation || 0) % 360 + 360) % 360;
    const isRotated = normRotation === 90 || normRotation === 270;

    const widthUnits = Math.ceil((isRotated ? (footprint.height || 1200) : (footprint.width || 1200)) / 600);
    const heightUnits = Math.ceil((isRotated ? (footprint.width || 1200) : (footprint.height || 1200)) / 600);
    const coveredWidthPx = widthUnits * 20;
    const coveredHeightPx = heightUnits * 20;

    const effectiveWidthPx = isRotated ? heightPx : widthPx;
    const effectiveHeightPx = isRotated ? widthPx : heightPx;

    const rawX = worldX - effectiveWidthPx / 2;
    const rawY = worldY - effectiveHeightPx / 2;

    const snapX = Math.round(rawX / SNAP_SIZE) * SNAP_SIZE;
    const snapY = Math.round(rawY / SNAP_SIZE) * SNAP_SIZE;

    // Vérifier si le footprint est à l'intérieur des murs
    const { isElementInWalls } = useRoomBuilderGeometry();
    if (walls.value.length > 2 && !isElementInWalls(snapX, snapY, footprint.rotation ?? 0, walls.value, widthPx, heightPx)) {
      notifyError({
        title: 'Erreur',
        text: 'Le footprint doit être positionné à l\'intérieur des murs.'
      });
      return;
    }

    const newUnits: Point[] = [];
    for (let curX = 0; curX < coveredWidthPx; curX += 20) {
      for (let curY = 0; curY < coveredHeightPx; curY += 20) {
        newUnits.push({ x: snapX + curX, y: snapY + curY });
      }
    }

    takeSnapshot();
    footprint.units = newUnits;
    if (!footprint.name) {
      footprint.name = `Footprint ${currentLayer.value.footprints?.length || 1}`;
    }
    selectedFootprintId.value = footprint.id;
  }
};

watch(shouldShowLayers, (val) => {
  if (!val) {
    currentLayerIndex.value = 0;
  }
}, { immediate: true });

const {
  selectedUnits, isSelecting,
  hoveredUnit, selectedFootprintId,
  draggingFootprintId,
  startSelection, updateSelection,
  stopSelection, createFootprint,
  deleteFootprint, changeFootprintColor,
  getFootprintAt, updateHoveredUnit,
  selectFootprint, startDragFootprint,
  dragFootprint, resetFootprintState,
  updateFootprintX, updateFootprintY,
  updateFootprintName, updateFootprintRotation,
  // rotation à la souris
  rotatingFootprintId, startRotateFootprint, rotateFootprint
} = useFootprints(currentLayer, walls);

const canvasComponent = useTemplateRef<InstanceType<typeof BuilderCanvas>>('canvasComponent');

const {
  canvasWidth, canvasHeight,
  updateCanvasSize
} = useCanvas(canvasComponent);

const onStartDragFootprint = (event: MouseEvent, id: string) => {
  takeSnapshot();
  startDragFootprint(event, id);
};

const onStartRotateFootprint = (event: MouseEvent, id: string) => {
  takeSnapshot();
  startRotateFootprint(event, id, zoomLevel.value, panOffset.value);
};

const onStartDragUnplacedFootprint = () => {
  takeSnapshot();
};

const onUpdateFootprintX = (id: string, value: number) => {
  takeSnapshot();
  updateFootprintX(id, value);
};

const onUpdateFootprintY = (id: string, value: number) => {
  takeSnapshot();
  updateFootprintY(id, value);
};

const onUpdateFootprintName = (id: string, value: string) => {
  takeSnapshot();
  updateFootprintName(id, value);
};

const onUpdateFootprintRotation = (id: string, value: number) => {
  takeSnapshot();
  updateFootprintRotation(id, value);
};

const {zoomLevel, zoomIn, zoomOut, onWheel} = useZoom();

const resetPan = () => {
  const startX = panOffset.value.x;
  const startY = panOffset.value.y;
  const duration = 300; // ms
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function: easeOutCubic
    const ease = 1 - Math.pow(1 - progress, 3);

    panOffset.value = {
      x: startX * (1 - ease),
      y: startY * (1 - ease)
    };

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
};

const {isPanning, panStart, panStop, panRunning} = usePan(props.roomId);

const {
  undoStack, redoStack,
  takeSnapshot, undo, redo
} = useRoomBuilderHistory({
  layers,
  walls,
  currentLayerIndex
});

const {
  racks, selectedRackIndices,
  rotatingRack, panOffset,
  draggingRack,
  createRack: addRackRaw,
  rotateRack, removeRack,
  startDragRack, dragRack,
  startRotateRack,
  duplicateRack, copyRack,
  pastRack, updateRackName,
  updateRackRotation,
  updateRackX,
  updateRackY,
  resetRackState
} = useRacksCrud(props.roomId, takeSnapshot);

const {
  draggingWallSegment,
  startDraggingWall,
  stopDraggingWall,
  dragWall
} = useWallResizer(walls);

const {
  isDrawingPillar, pillarPreviewPoint,
  selectedPillarIndices, draggingPillarIndex,
  addPillar, removePillar,
  movePillar, toggleIsDrawingPillar
} = usePillars(walls);

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

const {
  pods,
  createPod, selectPod,
  leavePod, deletePod
} = usePodsCrud(props.roomId);

const {
  showModal, modalConfig,
  triggerConfirm, cancelModal
} = useModal();

const tooltip = useTooltip();
const {
  tooltip: rackTooltip,
  container: rackTooltipContainer,
  adjustTooltipPosition: adjustRackTooltipPosition,
  showTooltip: showRackTooltip,
  hideTooltip: hideRackTooltip,
  hideTooltipImmediately: hideRackTooltipImmediately,
  loadTooltip: loadRackTooltip,
} = useSpecificTooltip<number>('rack', async (rackId) => {
  const url = `${props.itopTooltipUrl}&obj_class=Rack&obj_key=${rackId}`;
  const r = await fetch(url);
  if (r.ok) {
    rackTooltip.value.content = await r.text();
    // Attendre que le DOM soit mis à jour pour injecter les scripts et ajuster la position
    setTimeout(() => {
      adjustRackTooltipPosition();
      if (rackTooltipContainer.value) {
        const scripts = rackTooltipContainer.value.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      }
    }, 100);
  }
  else {
    rackTooltip.value.content = 'Erreur lors du chargement du tooltip';
    setTimeout(adjustRackTooltipPosition, 0);
  }
})
const {
  tooltip: footprintTooltip,
  container: footprintTooltipContainer,
  adjustTooltipPosition: adjustFootprintTooltipPosition,
  showTooltip: showFootprintTooltip,
  hideTooltip: hideFootprintTooltip,
  hideTooltipImmediately: hideFootprintTooltipImmediately,
  loadTooltip: loadFootprintTooltip,
} = useSpecificTooltip('footprint', async (footprintId) => {
  const url = `${props.itopTooltipUrl}&obj_class=FootPrint&obj_key=${footprintId}`;
  const r = await fetch(url);
  if (r.ok) {
    footprintTooltip.value.content = await r.text();
    // Attendre que le DOM soit mis à jour pour injecter les scripts et ajuster la position
    setTimeout(() => {
      adjustFootprintTooltipPosition();
      if (footprintTooltipContainer.value) {
        const scripts = footprintTooltipContainer.value.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      }
    }, 100);
  }
  else {
    footprintTooltip.value.content = 'Erreur lors du chargement du tooltip';
    setTimeout(adjustFootprintTooltipPosition, 0);
  }
})
const {
  tooltip: circuitTooltip,
  container: circuitTooltipContainer,
  adjustTooltipPosition: adjustCircuitTooltipPosition,
  showTooltip: showCircuitTooltip,
  hideTooltip: hideCircuitTooltip,
  hideTooltipImmediately: hideCircuitTooltipImmediately,
  loadTooltip: loadCircuitTooltip,
} = useSpecificTooltip('circuit', async (circuitId) => {
  const url = `${props.itopTooltipUrl}&obj_class=CircuitElec&obj_key=${circuitId}`;
  const r = await fetch(url);
  if (r.ok) {
    circuitTooltip.value.content = await r.text();
    // Attendre que le DOM soit mis à jour pour injecter les scripts et ajuster la position
    setTimeout(() => {
      adjustCircuitTooltipPosition();
      if (circuitTooltipContainer.value) {
        const scripts = circuitTooltipContainer.value.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      }
    }, 100);
  }
  else {
    circuitTooltip.value.content = 'Erreur lors du chargement du tooltip';
    setTimeout(adjustCircuitTooltipPosition, 0);
  }
})

const roomName = ref(props.roomName);
const isDrawingCircuit = ref(false);
const selectedCircuitIndices = ref<number[]>([]);
const draggingCircuitIndex = ref<number | null>(null);
const draggingCircuitStart = ref<Point>({x: 0, y: 0});
const rotatingCircuitIndex = ref<number | null>(null);
const startRotationAngle = ref(0);
const initialCircuitRotation = ref(0);

const onHoverRack = async (event: MouseEvent, rack: Rack) => {
  if (!props.useItopForm) return;

  clearTooltipTimer();

  await loadRackTooltip(rack.id);

  showRackTooltip(
      event.clientX + 10,
      event.clientY + 10
  );
};

const onHoverFootprint = async (event: MouseEvent, footprint: Footprint) => {
  if (!props.useItopForm) return;

  clearTooltipTimer();

  await loadFootprintTooltip(footprint.id);

  showFootprintTooltip(
      event.clientX + 10,
      event.clientY + 10
  );
};

const onHoverCircuit = async (event: MouseEvent, circuit: Circuit) => {
  if (!props.useItopForm) return;

  clearTooltipTimer();

  await loadCircuitTooltip(circuit.id);

  showCircuitTooltip(
      event.clientX + 10,
      event.clientY + 10
  );
};

const radius = computed(() => `${props.radius}px`);

const roomUnitCount = computed(() => {
  const currentWalls = layers.value[0]?.walls || walls.value;
  if (currentWalls.length < 3) return 0;

  const bbox = getWallBoundingBox(currentWalls);
  if (!bbox) return 0;

  let count = 0;
  const step = 20; // Taille de la grille

  for (let x = Math.floor(bbox.minX / step) * step; x <= bbox.maxX; x += step) {
    for (let y = Math.floor(bbox.minY / step) * step; y <= bbox.maxY; y += step) {
      if (isPointInPolygon(x + step / 2, y + step / 2, currentWalls)) {
        count++;
      }
    }
  }
  return count;
});

const selectedFootprint = computed(() => {
  if (!selectedFootprintId.value) return null;
  return currentLayer.value.footprints?.find(f => f.id === selectedFootprintId.value) || null;
});

const circuitPaths = computed({
  get: () => layers.value[currentLayerIndex.value]?.circuits ?? [],
  set: (val) => {
    if (layers.value[currentLayerIndex.value]) {
      layers.value[currentLayerIndex.value]!.circuits = val;
    }
  }
});

const podBoundaries = computed(() => getPodBoundaries(racks.value as Rack[], pods.value));

const wallBoundingBox = computed(() => {
  if (isDrawingWalls.value && wallPreviewPoint.value) {
    return getWallBoundingBox([...walls.value, wallPreviewPoint.value]);
  }
  return getWallBoundingBox(walls.value);
});

const horizontalCoords = computed(() => {
  if (!wallBoundingBox.value) return [];
  const coords = [] as Array<Point & { label: string }>;
  const steps = Math.floor(wallBoundingBox.value.width / GRID_SIZE);
  for (let i = 0; i < steps; i++) {
    const label = (i + 1).toString();
    coords.push({
      label,
      x: wallBoundingBox.value.minX + (i * GRID_SIZE) + 10,
      y: wallBoundingBox.value.maxY + GRID_SIZE
    });
  }
  return coords;
});

const verticalCoords = computed(() => {
  if (!wallBoundingBox.value) return [];
  const coords = [] as Array<Point& { label: string }>;
  const steps = Math.floor(wallBoundingBox.value.height / GRID_SIZE);
  for (let i = 0; i < steps; i++) {
    const label = String.fromCharCode(65 + (i % 26));
    let finalLabel = label;
    if (i >= 26) {
      const prefix = String.fromCharCode(65 + Math.floor(i / 26) - 1);
      finalLabel = prefix + label;
    }
    coords.push({
      label: finalLabel,
      x: wallBoundingBox.value.minX - GRID_SIZE,
      y: wallBoundingBox.value.maxY - (i * GRID_SIZE) - 10
    });
  }
  return coords;
});

const getGridLabel = (x: number, y: number, wallBoundingBox: (Size & MinPoint & MaxPoint) | null, mode: 'full' | 'letter' | 'number' = 'full') => {
  const originX = wallBoundingBox ? wallBoundingBox.minX : 0;
  const originY = wallBoundingBox ? wallBoundingBox.maxY : 0;
  
  const iH = Math.floor((x - originX) / GRID_SIZE);
  const hLabel = (iH + 1) <= 0 ? '0' : (iH + 1).toString();
  
  const iV = Math.floor((originY - y) / GRID_SIZE);
  const safeIV = Math.max(0, iV - 1);
  
  const label = String.fromCharCode(65 + (safeIV % 26));
  let vLabel = label;
  if (safeIV >= 26) {
    const prefix = String.fromCharCode(65 + Math.floor(safeIV / 26) - 1);
    vLabel = prefix + label;
  }
  
  if (mode === 'letter') return vLabel;
  if (mode === 'number') return hLabel;
  return `${vLabel}${hLabel}`;
};

const gridLabel = computed(() => {
  if (!hoveredUnit.value) return '';
  return getGridLabel(hoveredUnit.value.x, hoveredUnit.value.y, wallBoundingBox.value);
});

const viewportRect = computed(() => ({
  x: -panOffset.value.x,
  y: -panOffset.value.y,
  width: canvasWidth.value / zoomLevel.value,
  height: canvasHeight.value / zoomLevel.value
}));

const isInteracting = computed(() =>
    draggingRack.value !== null ||
    rotatingRack.value !== null ||
    draggingPillarIndex.value !== null ||
    draggingCircuitIndex.value !== null ||
    draggingWallSegment.value !== null ||
    draggingFootprintId.value !== null ||
    isPanning.value ||
    isDrawingWalls.value ||
    isSelecting.value ||
    contextMenu.value.show
);

watch(isPanning, (v) => {
  if (v) {
    hideRackTooltipImmediately();
    hideFootprintTooltipImmediately();
    hideCircuitTooltipImmediately();
  }
});

const onRemoveRack = (index: number) => {
  triggerConfirm({
    title: 'Supprimer le rack',
    message: 'Voulez-vous vraiment supprimer ce rack ?',
    onConfirm: () => {
      removeRack(index, props.useItopForm);
    }
  });
};

const onUpdateCircuitName = (index: number, value: string) => {
  takeSnapshot();
  const nextCircuits = [...circuitPaths.value];
  if (nextCircuits[index]) {
    nextCircuits[index] = { ...nextCircuits[index]!, name: value };
    circuitPaths.value = nextCircuits;
  }
};

const onUpdateCircuitRotation = (index: number, value: number) => {
  takeSnapshot();
  const nextCircuits = [...circuitPaths.value];
  if (nextCircuits[index]) {
    nextCircuits[index] = { ...nextCircuits[index]!, rotation: value };
    circuitPaths.value = nextCircuits;
  }
};

const onUpdateCircuitX = (index: number, value: number) => {
  const nextCircuits = [...circuitPaths.value];
  if (nextCircuits[index]) {
    const circuit = nextCircuits[index]!;
    if (walls.value.length > 2 && !isElementInWalls(value, circuit.y ?? 0, circuit.rotation || 0, walls.value)) {
      return;
    }
    takeSnapshot();
    nextCircuits[index] = { ...circuit, x: value };
    circuitPaths.value = nextCircuits;
  }
};

const onUpdateCircuitY = (index: number, value: number) => {
  const nextCircuits = [...circuitPaths.value];
  if (nextCircuits[index]) {
    const circuit = nextCircuits[index]!;
    if (walls.value.length > 2 && !isElementInWalls(circuit.x ?? 0, value, circuit.rotation || 0, walls.value)) {
      return;
    }
    takeSnapshot();
    nextCircuits[index] = { ...circuit, y: value };
    circuitPaths.value = nextCircuits;
  }
};

const onConfirmDeletePillar = (index: number | number[]) => {
  const count = Array.isArray(index) ? index.length : 1;
  triggerConfirm({
    title: 'Supprimer les poteaux',
    message: `Voulez-vous vraiment supprimer ${count > 1 ? 'ces ' + count + ' poteaux' : 'ce poteau'} ?`,
    onConfirm: () => {
      onDeletePillar(index);
    }
  });
};

const onConfirmDeleteFootprint = (id: string) => {
  triggerConfirm({
    title: 'Supprimer la surface au sol',
    message: 'Voulez-vous vraiment supprimer cette surface au sol ?',
    onConfirm: () => {
      takeSnapshot();
      deleteFootprint(id, props.useItopForm);
      if (selectedFootprintId.value === id) {
        selectFootprint(null);
      }
    }
  });
};

const onConfirmDeleteCircuitSelection = () => {
  triggerConfirm({
    title: 'Supprimer la sélection de circuit',
    message: 'Voulez-vous vraiment supprimer les circuits sélectionnés ?',
    onConfirm: () => {
      deleteSelectedCircuits();
    }
  });
};

const onConfirmDeletePod = (podId: string) => {
  triggerConfirm({
    title: 'Supprimer le pod',
    message: 'Voulez-vous vraiment supprimer ce pod ?',
    onConfirm: () => {
      takeSnapshot();
      deletePod(podId);
    }
  });
};

const onDeletePillar = (index: number | number[]) => {
  takeSnapshot();
  const indicesToDelete = Array.isArray(index) ? [...index].sort((a, b) => b - a) : [index];
  indicesToDelete.forEach(idx => {
    removePillar(idx);
  });
};

const onStartDragPillar = (event: MouseEvent, index: number) => {
  if (event.button !== 0) return;
  takeSnapshot();
  draggingPillarIndex.value = index;
};

const onStartDragCircuit = (event: MouseEvent, index: number) => {
  if (event.button !== 0) return;
  takeSnapshot();
  draggingCircuitIndex.value = index;
  selectedCircuitIndices.value = [index];

  const svg = canvasComponent.value?.svgRef;
  if (!svg) return;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

  const worldX = (svgP.x / zoomLevel.value) - panOffset.value.x;
  const worldY = (svgP.y / zoomLevel.value) - panOffset.value.y;

  const circuit = circuitPaths.value[index];
  if (circuit && circuit.x !== null && circuit.x !== undefined && circuit.y !== null && circuit.y !== undefined) {
    draggingCircuitStart.value = {
      x: worldX - circuit.x,
      y: worldY - circuit.y
    };
  }
};

const rotateCircuit = (event: MouseEvent) => {
  if (rotatingCircuitIndex.value === null) return;
  const circuit = circuitPaths.value[rotatingCircuitIndex.value];
  if (!circuit) return;
  
  const centerX = (circuit?.x ?? 0) + 40 / 2 + panOffset.value.x;
  const centerY = (circuit?.y ?? 0) + 40 / 2 + panOffset.value.y;

  const currentAngle = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
  const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);

  const rawRotation = (initialCircuitRotation.value + deltaAngle) % 360;
  circuit.rotation = Math.round(rawRotation / 45) * 45;
};

const onStartDragWall = (_event: MouseEvent, index: number, isHorizontal: boolean) => {
  takeSnapshot();
  startDraggingWall(index, isHorizontal);
};

const onSelectFootprint = (id: string) => {
  selectFootprint(id);
  selectedRackIndices.value = [];
  isWallSelected.value = false;
  selectedPillarIndices.value = [];
};

const onSelectPillar = (event: MouseEvent, index: number) => {
  event.stopPropagation();

  const visited = new Set<number>();
  const toVisit = [index];
  const allPillars = layers.value[currentLayerIndex.value]?.pillars ?? [];

  while (toVisit.length > 0) {
    const currentIdx = toVisit.pop()!;
    if (visited.has(currentIdx)) continue;

    visited.add(currentIdx);
    const currentPillar = allPillars[currentIdx];
    if (!currentPillar) continue;

    // Trouver les adjacents
    allPillars.forEach((p, pIdx) => {
      if (!visited.has(pIdx)) {
        const dx = Math.abs(p.x - currentPillar.x);
        const dy = Math.abs(p.y - currentPillar.y);

        // Adjacents si distance est de 20px (taille d'une unité de grille) sur un axe et 0 sur l'autre
        if ((dx === 20 && dy === 0) || (dx === 0 && dy === 20)) {
          toVisit.push(pIdx);
        }
      }
    });
  }

  selectedPillarIndices.value = Array.from(visited);
  selectedRackIndices.value = [];
  isWallSelected.value = false;
  selectFootprint(null);
};

const triggerClearWalls = () => {
  triggerConfirm({
    title: 'Supprimer la pièce',
    message: 'Voulez-vous vraiment supprimer la pièce ?',
    confirmText: 'Supprimer',
    onConfirm: () => {
      takeSnapshot();
      clearLayers();
      wallsRef.value = [];
      selectedPillarIndices.value = [];
      isWallSelected.value = false;
      cancelDrawingWalls();
    }
  });
};

const showItopModal = ref(false);
const itopFormContent = ref('');
const itopFormLoading = ref(false);
// const itopModalContainer = useTemplateRef<HTMLElement>('itopModalContainer');

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // évite de recharger 10x les libs iTop si tu rappelles la route
    const key = `data-itop-loaded-src`;
    if (document.querySelector(`script[${key}="${CSS.escape(src)}"]`)) {
      resolve();
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.async = false;          // IMPORTANT : garder l'ordre
    s.defer = false;
    s.setAttribute(key, src);

    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Injecte du HTML iTop dans `target` et exécute les scripts inclus.
 * - respecte l’ordre des scripts dans le HTML
 * - exécute les inline <script> dans le scope global (window)
 */
async function injectHtmlAndRunScripts(html: string) {
  // 1) parser HTML
  const tpl = document.createElement("template");
  tpl.innerHTML = html;

  // 2) collecter scripts en conservant l'ordre d’apparition
  const scripts = Array.from(tpl.content.querySelectorAll("script"));

  // 3) enlever les scripts du fragment avant injection (sinon ils restent dans le DOM)
  for (const s of scripts) s.remove();

  // 5) exécuter les scripts dans le bon ordre
  let code = '';
  for (const s of scripts) {
    const src = s.getAttribute("src");
    if (src) {
      await loadScriptOnce(src);
    } else {
      const _code = s.textContent ?? "";
      code += _code + "\n";
    }
  }
  if (code.length > 0) {
    window.eval(code);
  }
}

watchEffect(() => {
  if (showItopModal.value) {
    injectHtmlAndRunScripts(itopFormContent.value);
  }
})

const openItopRackForm = async () => {
  showItopModal.value = true;
  itopFormLoading.value = true;
  try {
    const response = await fetch(props.itopCreateRackUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-Combodo-Ajax': 'true',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({
        att_code: 'physicaldevice_list',
        host_class: 'Location',
        host_id: String(props.roomId),
        class: 'Rack'
      })
    });
    itopFormContent.value = await response.text();
    itopFormLoading.value = false;
  } catch (err) {
    console.error('Erreur lors de la récupération du formulaire iTop:', err);
    notifyError({
      text: 'Erreur lors de la récupération du formulaire iTop'
    });
  }
};

const closeItopModal = () => {
  showItopModal.value = false;
  itopFormContent.value = '';
};

// Fonction pour recharger les données (émet un événement pour que le parent sache qu'il doit refresh)
const reloadData = () => {
  isRefreshMode.value = true;
  setTimeout(() => {
    emit('refresh');
  }, 1000);
}

// On expose une méthode pour fermer la modale et refresh depuis l'extérieur si nécessaire
defineExpose({
  closeItopModal,
  reloadData
});

const addRack = () => {
  if (currentLayerIndex.value === 0) return;
  if (props.useItopForm) {
    openItopRackForm();
  } else {
    addRackRaw();
  }
};

const addCircuit = () => {
  if (currentLayerIndex.value !== 1) return;
  takeSnapshot();
  const newCircuit = {
    id: `circuit-${Date.now()}`,
    x: null,
    y: null,
    rotation: null,
    name: `Circuit ${circuitPaths.value.length + 1}`
  };
  circuitPaths.value = [...circuitPaths.value, newCircuit];
};

const selectWall = (event: MouseEvent) => {
  if (currentLayerIndex.value === 0) {
    event.stopPropagation();
    isWallSelected.value = true;
    selectedRackIndices.value = [];
    selectedPillarIndices.value = [];
    selectedFootprintId.value = null;
    selectedCircuitIndices.value = [];
  }
};

const stopCircuitDrawing = () => {
  isDrawingCircuit.value = false;
};

const selectCircuit = (event: MouseEvent, index: number) => {
  if (event.detail > 1) return;
  event.stopPropagation();
  stopCircuitDrawing();
  
  const isMultiSelect = event.ctrlKey || event.metaKey;
  if (isMultiSelect) {
    if (selectedCircuitIndices.value.includes(index)) {
      selectedCircuitIndices.value = selectedCircuitIndices.value.filter(i => i !== index);
    } else {
      selectedCircuitIndices.value.push(index);
    }
  } else {
    selectedCircuitIndices.value = [index];
  }
};

const onMouseMoveSVG = (event: MouseEvent) => {
  const svg = canvasComponent.value?.svgRef;
  if (!svg) return;
  
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

  const x = (svgP.x / (zoomLevel.value || 1)) - (panOffset.value.x || 0);
  const y = (svgP.y / (zoomLevel.value || 1)) - (panOffset.value.y || 0);

  if (currentLayerIndex.value === 0) {
    if (draggingWallSegment.value) {
      dragWall(x, y);
      return;
    }
  }

  if (draggingPillarIndex.value !== null) {
    const constrained = getConstrainedPoint(x, y, null, SNAP_SIZE);
    if (walls.value.length > 2 && !isPointInPolygon(constrained.x, constrained.y, walls.value)) {
      return;
    }
    movePillar(draggingPillarIndex.value, constrained);
    return;
  }

  if (draggingCircuitIndex.value !== null) {
    const circuit = circuitPaths.value[draggingCircuitIndex.value];
    if (circuit) {
      const rawX = x - draggingCircuitStart.value.x;
      const rawY = y - draggingCircuitStart.value.y;
      const snapX = Math.round(rawX / SNAP_SIZE) * SNAP_SIZE;
      const snapY = Math.round(rawY / SNAP_SIZE) * SNAP_SIZE;

      if (walls.value.length > 2 && !isElementInWalls(snapX, snapY, circuit.rotation || 0, walls.value)) {
        return;
      }

      circuit.x = snapX;
      circuit.y = snapY;
    }
    return;
  }

  if (isDrawingPillar.value) {
    const constrained = getConstrainedPoint(x, y, null, SNAP_SIZE);
    if (walls.value.length > 2 && isPointInPolygon(constrained.x, constrained.y, walls.value)) {
      pillarPreviewPoint.value = constrained;
    } else {
      pillarPreviewPoint.value = null;
    }
    return;
  }

  if (isDrawingWalls.value) {
    const lastPoint = walls.value.length > 0
        ? walls.value[walls.value.length - 1]
        : null;
    wallPreviewPoint.value = getConstrainedPoint(x, y, lastPoint!);
    return;
  }

  if (currentLayerIndex.value === 1) {
    if (draggingWallSegment.value) {
      dragWall(x, y);
      return;
    }
  }

  if (currentLayerIndex.value === 2) {
    if (draggingFootprintId.value) {
      // dragFootprint(event, zoomLevel.value, panOffset.value);
      return;
    }
    if (isSelecting.value) {
      updateSelection(x, y);
      hoveredUnit.value = null;
    } else {
      updateHoveredUnit(x, y);
    }
  } else {
    // Pour les autres layers, on met à jour hoveredUnit si on est dans les murs
    // pour afficher le tooltip de coordonnées.
    const snapX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
    const snapY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

    // On vérifie d'abord si on survole un élément qui doit quand même afficher le tooltip
    const isOverBlockingElement = (event.target as HTMLElement)?.closest('.rack-rect, .pillars-layer rect, .footprint-group');

    if (isOverBlockingElement || (walls.value.length > 2 && isPointInPolygon(snapX + GRID_SIZE / 2, snapY + GRID_SIZE / 2, walls.value))) {
      hoveredUnit.value = { x: snapX, y: snapY };
    } else {
      hoveredUnit.value = null;
    }
  }
};

const onMouseMove = (event: MouseEvent) => {
  if (isDrawingWalls.value && !draggingWallSegment.value) {
    onMouseMoveSVG(event);
    return;
  }
  if (isPanning.value) return panRunning(event);
  if (draggingRack.value !== null) dragRack(event);
  else if (rotatingRack.value !== null) rotateRack(event);
  else if (rotatingCircuitIndex.value !== null) rotateCircuit(event);
  else if (rotatingFootprintId.value !== null) rotateFootprint(event, zoomLevel.value, panOffset.value);
  else if (draggingFootprintId.value !== null) {
    dragFootprint(event, zoomLevel.value, panOffset.value);
  } else if (draggingCircuitIndex.value !== null || draggingPillarIndex.value !== null) {
    onMouseMoveSVG(event);
  }
};

const stopDrag = () => {
  if (draggingWallSegment.value !== null) {
    ensureElementsInsideWalls();
  }
  panStop();
  resetRackState();
  resetFootprintState();
  stopDraggingWall();
  draggingPillarIndex.value = null;
  draggingCircuitIndex.value = null;
  rotatingCircuitIndex.value = null;
  if (currentLayerIndex.value === 2) {
    stopSelection();
  }
};

const ensureElementsInsideWalls = () => {
  if (walls.value.length < 3) return;

  layers.value.forEach(layer => {
    // Repositionner les racks
    layer.racks.forEach(rack => {
      if (rack.x !== null && rack.y !== null) {
        if (!isElementInWalls(rack.x ?? 0, rack.y ?? 0, rack.rotation || 0, walls.value)) {
          const closest = findClosestPointInside(rack.x ?? 0, rack.y ?? 0, walls.value);
          rack.x = closest.x;
          rack.y = closest.y;
        }
      }
    });

    // Repositionner les footprints
    layer.footprints.forEach(footprint => {
      (footprint.units ?? []).forEach(unit => {
        if (!isPointInPolygon(unit.x, unit.y, walls.value)) {
          const closest = findClosestPointInside(unit.x, unit.y, walls.value);
          unit.x = closest.x;
          unit.y = closest.y;
        }
      });
    });

    // Repositionner les circuits
    layer.circuits.forEach(circuit => {
      if (circuit.x !== null && circuit.y !== null) {
        if (!isElementInWalls(circuit.x ?? 0, circuit.y ?? 0, circuit.rotation || 0, walls.value)) {
          const closest = findClosestPointInside(circuit.x ?? 0, circuit.y ?? 0, walls.value);
          circuit.x = closest.x;
          circuit.y = closest.y;
        }
      }
    });

    // Repositionner les pillars
    if (layer.pillars) {
      layer.pillars.forEach((pillar, index) => {
        if (!isPointInPolygon(pillar.x, pillar.y, walls.value)) {
          layer.pillars![index] = findClosestPointInside(pillar.x, pillar.y, walls.value);
        }
      });
    }
  });
};

const deselect = (event: MouseEvent) => {
  hideRackTooltipImmediately();
  hideFootprintTooltipImmediately();
  hideCircuitTooltipImmediately();
  if (isDrawingPillar.value) {
    if (event.button !== 0) return;
    const svg = canvasComponent.value?.svgRef;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const x = (svgP.x / zoomLevel.value) - panOffset.value.x;
    const y = (svgP.y / zoomLevel.value) - panOffset.value.y;

    const constrained = getConstrainedPoint(x, y, null, SNAP_SIZE);
    if (walls.value.length > 2 && !isPointInPolygon(constrained.x, constrained.y, walls.value)) {
      return;
    }
    takeSnapshot();
    addPillar(constrained);
    return;
  }

  if (isDrawingWalls.value) {
    if (event.button !== 0) return;

    const svg = canvasComponent.value?.svgRef;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const x = (svgP.x / (zoomLevel.value || 1)) - (panOffset.value.x || 0);
    const y = (svgP.y / (zoomLevel.value || 1)) - (panOffset.value.y || 0);

    const lastPoint = walls.value.length > 0 ? walls.value[walls.value.length - 1] : null;
    const constrained = getConstrainedPoint(x, y, lastPoint!);
    const snapX = constrained.x;
    const snapY = constrained.y;

    if (walls.value.length > 2) {
      const firstPoint = walls.value[0];
      const dist = Math.sqrt(Math.pow(snapX - (firstPoint?.x ?? 0), 2) + Math.pow(snapY - (firstPoint?.y ?? 0), 2));
      if (dist < 25) {
        cancelDrawingWalls();
        initializeLayers();
        ensureElementsInsideWalls();
        return;
      }
    }

    takeSnapshot();
    createWall({ x: snapX, y: snapY });
    return;
  }
  
  const target = event.target as SVGElement;
  const isFootprintClick = target.closest('.footprint-group');
  if (selectedFootprintId.value !== null && !isFootprintClick) {
    // Désélectionner le footprint quand on clique n'importe où en dehors de lui
    selectedUnits.value = [];
    selectFootprint(null);
  }
  const isBackgroundClick = target.classList.contains('canvas-background') || 
                           target.closest('.footprints-layer') || 
                           target.classList.contains('room-surface');

  if (isBackgroundClick) {
    const isFootprintGroupClick = target.closest('.footprint-group');
    if (!isFootprintGroupClick) {
      selectedRackIndices.value = [];
      isWallSelected.value = false;
      selectedPillarIndices.value = [];
      selectFootprint(null);
      selectedCircuitIndices.value = [];

      if (target.classList.contains('room-surface') && currentLayerIndex.value === 0) {
        isWallSelected.value = true;
      }
    }

    const svg = canvasComponent.value?.svgRef;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const x = (svgP.x / zoomLevel.value) - panOffset.value.x;
    const y = (svgP.y / zoomLevel.value) - panOffset.value.y;

  if (currentLayerIndex.value === 1) {
    if (event.button === 0) {
      panStart();
    }
  } else if (currentLayerIndex.value === 2) {
    const footprint = getFootprintAt(x, y);
    if (footprint) {
      onSelectFootprint(footprint.id);
      return;
    }
    if (event.button === 0) { // Left-click
      startSelection(x, y);
      // Si on a cliqué à l'intérieur de la pièce pour sélectionner, on ne pan pas au clic gauche
      if (!isPointInPolygon(x, y, walls.value)) {
         panStart();
      }
    } else if (event.button === 2) { // Right-click
      const footprint = getFootprintAt(x, y);
      const clickedUnitX = Math.floor(x / SNAP_SIZE) * SNAP_SIZE;
      const clickedUnitY = Math.floor(y / SNAP_SIZE) * SNAP_SIZE;
      const isUnitSelected = selectedUnits.value.some(u => u.x === clickedUnitX && u.y === clickedUnitY);

      if (footprint) {
        openContextMenu(event, null, footprint.id);
      } else if (isUnitSelected) {
        openContextMenu(event);
      }
    }
  } else if (currentLayerIndex.value === 0) {
    if (event.button === 0) {
       // Dans le layer virtuel des murs (index 0), on peut sélectionner la salle
       if (walls.value.length > 2 && isPointInPolygon(x, y, walls.value)) {
           isWallSelected.value = true;
       } else {
           isWallSelected.value = false;
           panStart();
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

const deleteSelectedCircuits = () => {
  if (selectedCircuitIndices.value.length === 0) return;

  takeSnapshot();
  if (props.useItopForm) {
    circuitPaths.value = circuitPaths.value.map(c => ({
      ...c,
      ...(c.id === circuitPaths.value[selectedCircuitIndices.value[0]!]!.id ? {
        x: null,
        y: null
      } : {})
    }));

    console.log(selectedCircuitIndices.value[0], circuitPaths.value.map(c => ({
      ...c,
      ...(c.id === circuitPaths.value[selectedCircuitIndices.value[0]!]!.id ? {
        x: null,
        y: null
      } : {})
    })));
  }
  else {
    circuitPaths.value = circuitPaths.value.filter((_, idx) => !selectedCircuitIndices.value.includes(idx));
  }
  selectedCircuitIndices.value = [];
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (isDrawingWalls.value && event.key === 'Escape') {
    cancelDrawingWalls();
    return;
  }
  if (currentLayerIndex.value === 2 && event.key === 'Escape') {
    selectedUnits.value = [];
    selectFootprint(null);
    return;
  }
  if (!isDrawingWalls.value && currentLayerIndex.value === 1 && (event.key === 'Escape' || event.key === 'Enter')) {
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
      triggerConfirm({
        title: 'Supprimer les racks',
        message: `Voulez-vous vraiment supprimer les ${selectedRackIndices.value.length} racks sélectionnés ?`,
        onConfirm: () => {
          takeSnapshot();
          const sortedIndices = [...selectedRackIndices.value].sort((a, b) => b - a);
          sortedIndices.forEach(index => {
            if (props.useItopForm) {
              racks.value = racks.value.map(r => ({
                ...r,
                ...(r.id === index ? { x: null, y: null } : {})
              }))
            }
            else {
              racks.value.splice(index, 1);
            }
          });
          selectedRackIndices.value = [];
        }
      });
      return;
    }

    if (isWallSelected.value) {
      event.preventDefault();
      triggerClearWalls();
      return;
    }

    if (selectedCircuitIndices.value.length > 0) {
      event.preventDefault();
      triggerConfirm({
        title: 'Supprimer les circuits',
        message: 'Voulez-vous vraiment supprimer les circuits sélectionnés ?',
        onConfirm: () => {
          deleteSelectedCircuits();
        }
      });
      return;
    }

    if (selectedPillarIndices.value.length > 0) {
      event.preventDefault();
      triggerConfirm({
        title: 'Supprimer les poteaux',
        message: `Voulez-vous vraiment supprimer les ${selectedPillarIndices.value.length} poteaux sélectionnés ?`,
        onConfirm: () => {
          onDeletePillar(selectedPillarIndices.value);
        }
      });
      return;
    }

    if (selectedFootprintId.value !== null) {
      event.preventDefault();
      triggerConfirm({
        title: 'Supprimer la surface au sol',
        message: 'Voulez-vous vraiment supprimer la surface au sol sélectionnée ?',
        onConfirm: () => {
          takeSnapshot();
          deleteFootprint(selectedFootprintId.value!, props.useItopForm);
          selectFootprint(null);
        }
      });
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
    emit('saved', {
      roomName: roomName.value,
      layers: layers.value
    });
    undoStack.value = [];
    redoStack.value = [];
};

const cancelItopFormModal = () => {
  showItopModal.value = false;
  itopFormContent.value = '';
}

const confirmItopFormModal = () => {
  reloadData();
  cancelItopFormModal();
}

watch(currentLayerIndex, () => {
  selectedRackIndices.value = [];
  isWallSelected.value = false;
  isDrawingCircuit.value = false;
  selectedCircuitIndices.value = [];
  hoveredUnit.value = null;
  selectedPillarIndices.value = [];
  selectedFootprintId.value = null;
  selectedUnits.value = [];
});

watch(() => props.roomId, async (newId) => {
  if (newId) {
    roomName.value = props.roomName;
  }
});

onMounted(() => {
  if (footprintColors.value.length > 0) {
    colors.value = footprintColors.value;
  }
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mouseup', stopDrag);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('mouseup', stopDrag);
});

provide<ExposedFunctions>(exposedFunctions, {
  getWallBoundingBox,
  getPodBoundaries,
  getGridLabel
})

const tooltips = computed(() => [
  {
    props: {
      name: 'rack',
      ...tooltip.value,
      ...rackTooltip.value
    },
    events: {
      hideTooltip: hideRackTooltip
    }
  },
  {
    props: {
      name: 'footprint',
      ...tooltip.value,
      ...footprintTooltip.value
    },
    events: {
      hideTooltip: hideFootprintTooltip
    }
  },
  {
    props: {
      name: 'circuit',
      ...tooltip.value,
      ...circuitTooltip.value
    },
    events: {
      hideTooltip: hideCircuitTooltip
    }
  },
]);
const marginBottom = computed(() => '10px');
</script>

<template>
  <div class="builder-container"
       @mousemove="onMouseMove"
       @mouseup="stopDrag"
       @wheel="onWheel"
       @contextmenu.prevent>
    <div v-if="isDataLoading" />

    <BuilderToolbar
        v-if="!isDataLoading"
        v-model:room-name="roomName"
        :undo-disabled="undoStack.length === 0"
        :redo-disabled="redoStack.length === 0"
        :can-add-rack="walls.length > 2"
        :show-add-rack="currentLayerIndex === 3"
        :can-add-circuit="walls.length > 2"
        :show-add-circuit="currentLayerIndex === 1"
        :can-clear-walls="walls.length > 0"
        :is-drawing-walls="isDrawingWalls"
        :is-drawing-pillar="isDrawingPillar"
        :zoom-level="zoomLevel"
        :can-zoom-out="zoomLevel > 0.2"
        :can-zoom-in="zoomLevel < 3"
        :selected-layer-index="currentLayerIndex"
        :radius="props.radius"
        :disable-add-racks="disableAddRacks"
        :show-location-name="showLocationName"

        @undo="undo"
        @redo="redo"
        @add-rack="addRack"
        @add-circuit="addCircuit"
        @toggle-walls="toggleIsDrawingWalls"
        @toggle-pillar="toggleIsDrawingPillar"
        @clear-walls="triggerClearWalls"
        @zoom-out="zoomOut"
        @zoom-in="zoomIn"
        @reset-pan="resetPan"
        @save="save"
    />

    <polygon
        v-if="!isDrawingWalls && !isDrawingPillar && (walls.length > 2 || isWallSelected)"
        :points="walls.map(p => `${p.x},${p.y}`).join(' ')"
        class="room-surface selected"
        style="pointer-events: none;"
    />

    <div class="canvas-area">
      <BuilderCanvas
          ref="canvasComponent"

          :layers="shouldShowLayers ? layers : (layers.length > 0 ? [layers[0]!] : [])"
          :current-layer-index="currentLayerIndex"
          :walls="walls"
          :racks="racks as Rack[]"
          :is-drawing-walls="isDrawingWalls"
          :is-drawing-pillar="isDrawingPillar"
          :is-drawing-circuit="isDrawingCircuit"
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
          :selected-units="selectedUnits"
          :hovered-unit="hoveredUnit"
          :grid-label="gridLabel"
          :selected-pillar-indices="selectedPillarIndices"
          :selected-footprint-id="selectedFootprintId"
          :selected-circuit-indices="selectedCircuitIndices"
          :pillar-preview-point="pillarPreviewPoint"
          :is-data-loading="isDataLoading"
          :use-itop-form="useItopForm"

          @deselect="deselect"
          @mousemove-svg="onMouseMoveSVG"
          @start-drag="startDragRack"
          @open-context-menu="openContextMenu"
          @start-rotate="startRotateRack"
          @select-pod="selectPod"
          @select-wall="selectWall($event)"
          @start-drag-wall="onStartDragWall"
          @delete-pillar="onConfirmDeletePillar"
          @select-pillar="onSelectPillar"
          @start-drag-pillar="onStartDragPillar"
          @select-circuit="selectCircuit"
          @start-drag-circuit="onStartDragCircuit"
          @select-footprint="onSelectFootprint"
          @start-drag-footprint="onStartDragFootprint"
          @start-rotate-footprint="onStartRotateFootprint"
          @dragover-rack="onDragOverRack"
          @drop-rack="onDropRack"
          @hover-rack="onHoverRack"
          @leave-rack="hideRackTooltip"
          @hover-footprint="onHoverFootprint"
          @leave-footprint="hideFootprintTooltip"
          @hover-circuit="onHoverCircuit"
          @leave-circuit="hideCircuitTooltip"
      >
        <template #loader>
          <slot name="loader" />
        </template>
      </BuilderCanvas>

      <BuilderContextMenu
          :show="contextMenu.show"
          :x="contextMenu.x"
          :y="contextMenu.y"
          :options="contextMenuOptions"

          @create-pod="createPod"
          @leave-pod="leavePod"
          @delete-pod="onConfirmDeletePod"
          @create-footprint="createFootprint"
          @delete-footprint="onConfirmDeleteFootprint"
          @change-footprint-color="changeFootprintColor"
      />

      <Modal
          :show="showModal"
          :title="modalConfig.title"
          :message="modalConfig.message"
          :confirm-text="modalConfig.confirmText"
          has-footer center

          @confirm="modalConfig.onConfirm"
          @cancel="cancelModal"
      />

      <teleport to="body">
        <Modal
            title="Créer un Rack"
            :show="showItopModal"
            :message="itopFormContent"
            :is-loading="itopFormLoading"
            is-html

            @cancel="cancelItopFormModal"
            @confirm="confirmItopFormModal"
            @close="closeItopModal"
            @reload="reloadData"
        />

        <template v-for="t in tooltips" :key="t.props.name">
          <Tooltip
              v-if="t.props.show"
              v-bind="t.props"

              @enter-tooltip="clearTooltipTimer"
              @leave-tooltip="t.events.hideTooltip"
          />
        </template>
      </teleport>

      <BuilderLayerPreviews
          v-if="shouldShowLayers && !isDataLoading && withLayerPreview"
          v-model:current-layer-index="currentLayerIndex"
          :layers="layers"
          :viewport-rect="viewportRect"
          :rack-width="rackWidth"
          :rack-height="rackHeight"
          :is-drawing-walls="isDrawingWalls"
          :wall-preview-point="wallPreviewPoint"
          :is-drawing-circuit="isDrawingCircuit"
      />
    </div>

    <aside class="sidebar-right" v-if="!isDataLoading">
      <header>
        <span>
          <span /> = 600 mm
        </span>

        <button @click="save" class="toolbar-btn btn-primary">
          <span class="icon">💾</span>
          <span class="label">{{ langKeys['FloorPlanBuilder:Toolbar:Save'] }}</span>
        </button>
      </header>

      <main>
        <BuilderLayerDropdown
            v-if="shouldShowLayers && !isDataLoading && !withLayerPreview"
            :layers="layers"
            :lang-keys="langKeys"
            :radius="radius"
            v-model:current-layer-index="currentLayerIndex"

            class="items"
        />

        <UnplacedRacksSidebar
            v-if="incompleteRacks.length > 0 && shouldShowLayers && currentLayerIndex === 3"
            :racks="incompleteRacks"
            :selected-rack-id="selectedRackIndices.length === 1 && selectedRackIndices[0] !== undefined ? (racks[selectedRackIndices[0]]?.id ?? null) : null"
            :radius="radius"

            class="items"

            @select-rack="onSelectUnplacedRack"
            @drag-start="takeSnapshot"
        />

        <UnplacedCircuitsSidebar
            v-if="incompleteCircuits.length > 0 && shouldShowLayers && currentLayerIndex === 1"
            :circuits="incompleteCircuits"
            :selected-circuit-id="selectedCircuitIndices.length === 1 && selectedCircuitIndices[0] !== undefined ? String(circuitPaths[selectedCircuitIndices[0]]?.id!) : null"
            :radius="radius"

            class="items"

            @select-circuit="onSelectUnplacedCircuit"
            @drag-start="takeSnapshot"
        />

        <UnplacedFootprintsSidebar
            v-if="incompleteFootprints.length > 0 && shouldShowLayers && currentLayerIndex === 2"
            :footprints="incompleteFootprints"
            :selected-footprint-id="selectedFootprintId"
            :radius="radius"

            class="items"

            @select-footprint="onSelectUnplacedFootprint"
            @drag-start="onStartDragUnplacedFootprint"
        />

        <BuilderPropertiesPanel
            v-if="selectedRackIndices.length > 0 || isWallSelected || selectedPillarIndices.length > 0 || selectedFootprint !== null || selectedCircuitIndices.length > 0"
            :selected-rack-indices="selectedRackIndices"
            :racks="racks as Rack[]"
            :is-wall-selected="isWallSelected"
            :walls="walls"
            :unit-count="roomUnitCount"
            :selected-pillar-indices="selectedPillarIndices"
            :pillars="layers[currentLayerIndex]?.pillars ?? []"
            :selected-footprint="selectedFootprint"
            :selected-circuit-indices="selectedCircuitIndices"
            :circuits="layers[currentLayerIndex]?.circuits ?? []"
            :context-menu-options="contextMenuOptions"
            :use-itop-form="useItopForm"
            :radius="radius"

            :margin-bottom="marginBottom"

            @remove-rack="onRemoveRack"
            @create-pod="createPod"
            @leave-pod="leavePod"
            @delete-pod="onConfirmDeletePod"
            @clear-selection="selectedRackIndices = []"
            @update-rack-name="updateRackName"
            @update-rack-rotation="updateRackRotation"
            @update-rack-x="updateRackX"
            @update-rack-y="updateRackY"
            @update-circuit-name="onUpdateCircuitName"
            @update-circuit-rotation="onUpdateCircuitRotation"
            @update-circuit-x="onUpdateCircuitX"
            @update-circuit-y="onUpdateCircuitY"
            @delete-pillar="onConfirmDeletePillar"
            @delete-footprint="onConfirmDeleteFootprint"
            @change-footprint-color="changeFootprintColor"
            @update-footprint-x="onUpdateFootprintX"
            @update-footprint-y="onUpdateFootprintY"
            @update-footprint-name="onUpdateFootprintName"
            @update-footprint-rotation="onUpdateFootprintRotation"
            @delete-circuit-selection="onConfirmDeleteCircuitSelection"
            @clear-walls="triggerClearWalls"
        />
      </main>
    </aside>
  </div>
</template>

<style scoped>
.builder-container {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #2c3e50;

  > .canvas-area {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #004a99; /* Bleu iTop Designer */
    border-bottom-right-radius: v-bind(radius);
    border-bottom-left-radius: v-bind(radius);
  }
}

.sidebar-right {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 9;
  display: flex;
  flex-direction: column;
  width: 300px;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: white;
  background: #2c3e50;
  border-top-right-radius: v-bind(radius);
  border-bottom-right-radius: v-bind(radius);
  border-left: 1px solid #333;

  > header {
    height: 40px;
    border-bottom: 1px solid #333;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0 10px;

    > span {
      display: inline-flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 10px;

      > span {
        display: inline-block;
        height: 20px;
        width: 20px;
        border: 1px solid #1a252f;
        background-color: #004a99;
      }
    }

    .icon {
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .label {
      display: inline-block;
    }

    @media (max-width: 800px) {
      .label {
        display: none;
      }
    }

    .toolbar-btn {
      height: 28px;
      padding: 0 8px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: #ecf0f1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .toolbar-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .toolbar-btn:active:not(:disabled) {
      background: rgba(255, 255, 255, 0.2);
    }

    .toolbar-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .toolbar-btn.active {
      background: #3498db;
      color: white;
    }

    .toolbar-btn.btn-primary {
      background: #27ae60;
      color: white;
      font-weight: 600;
    }

    .toolbar-btn.btn-primary:hover:not(:disabled) {
      background: #219150;
    }

    .toolbar-btn.btn-primary:active:not(:disabled) {
      background: #1e7e46;
    }

    .toolbar-btn.btn-danger {
      color: #e74c3c;
    }

    .toolbar-btn.btn-danger:hover:not(:disabled) {
      background: #e74c3c;
      color: white;
    }

    .toolbar-btn.btn-danger:active:not(:disabled) {
      background: #c0392b;
    }
  }

  > main {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    > .items {
      margin-bottom: v-bind(marginBottom);
    }
  }
}
</style>
