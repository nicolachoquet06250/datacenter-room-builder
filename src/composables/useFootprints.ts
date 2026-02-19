import {ref, type Ref} from 'vue';
import {nanoid} from 'nanoid';
import {useRoomBuilderGeometry} from './useRoomBuilderGeometry';
import {GRID_SIZE, SNAP_SIZE} from "../constants";

export const colors = ref([
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F06292', '#AED581', '#FFD54F', '#4DB6AC', '#BA68C8'
]);

export const useFootprints = (currentLayer: Ref<Layer>, walls: Ref<Point[]>) => {
  const selectedUnits = ref<any[]>([]);
  const isSelecting = ref(false);
  const selectionStart = ref<any | null>(null);
  const selectionMode = ref<'add' | 'remove' | null>(null);
  const initialSelection = ref<any[] | null>(null);
  const currentBatch = ref<any[]>([]);
  const hoveredUnit = ref<Point | null>(null);
  const selectedFootprintId = ref<string | null>(null);
  const draggingFootprintId = ref<string | null>(null);
  const rotatingFootprintId = ref<string | null>(null);
  const footprintUnitsBeforeDrag = ref<Point[]>([]);
  const startMouseSVGPos = { x: 0, y: 0 };
  const startRotationAngle = ref(0);
  const initialFootprintRotation = ref(0);
  const { isPointInPolygon, isElementInWalls } = useRoomBuilderGeometry();

  const getRandomColor = () => colors.value[Math.floor(Math.random() * colors.value.length)]!;

  const startSelection = (x: number, y: number) => {
    isSelecting.value = true;
    const snapX = Math.floor(x / SNAP_SIZE) * SNAP_SIZE;
    const snapY = Math.floor(y / SNAP_SIZE) * SNAP_SIZE;
    
    // Ne pas pouvoir sélectionner une unité qui est déjà dans un footprint
    const isAlreadyInFootprint = currentLayer.value.footprints?.some(f => 
      (f.units ?? []).some((u: any) => u.x === snapX && u.y === snapY)
    );

    if (isAlreadyInFootprint) {
      selectionStart.value = null;
      selectionMode.value = null;
      initialSelection.value = [...selectedUnits.value];
      return;
    }

    if (walls.value.length > 2 && !isPointInPolygon(snapX + SNAP_SIZE / 2, snapY + SNAP_SIZE / 2, walls.value)) {
      selectionStart.value = null;
      selectionMode.value = null;
      initialSelection.value = [...selectedUnits.value];
      return;
    }

    selectionStart.value = { x: snapX, y: snapY };
    const index = selectedUnits.value.findIndex(u => u.x === snapX && u.y === snapY);
    
    if (index === -1) {
      // Vérifier si le nouveau point est adjacent à la sélection existante
      const isAdjacent = selectedUnits.value.length === 0 || selectedUnits.value.some(u => 
        (Math.abs(u.x - snapX) === SNAP_SIZE && u.y === snapY) || 
        (u.x === snapX && Math.abs(u.y - snapY) === SNAP_SIZE)
      );

      if (!isAdjacent) {
        selectedUnits.value = [];
      }

      selectionMode.value = 'add';
      selectedUnits.value.push({ x: snapX, y: snapY });
      currentBatch.value = [{ x: snapX, y: snapY }];
    } else {
      selectionMode.value = 'remove';
      selectedUnits.value.splice(index, 1);
      currentBatch.value = [];
    }
    
    // On enregistre l'état APRES avoir éventuellement vidé la sélection si non adjacente
    initialSelection.value = [...selectedUnits.value];
  };

  const updateSelection = (currentX: number, currentY: number) => {
    if (!isSelecting.value || !selectionStart.value || !selectionMode.value) return;

    const snapX = Math.floor(currentX / SNAP_SIZE) * SNAP_SIZE;
    const snapY = Math.floor(currentY / SNAP_SIZE) * SNAP_SIZE;

    const minX = Math.min(selectionStart.value.x, snapX);
    const maxX = Math.max(selectionStart.value.x, snapX);
    const minY = Math.min(selectionStart.value.y, snapY);
    const maxY = Math.max(selectionStart.value.y, snapY);

    // Collecter les unités du rectangle actuel
    const rectUnits: any[] = [];
    let allInside = true;
    for (let x = minX; x <= maxX; x += SNAP_SIZE) {
      for (let y = minY; y <= maxY; y += SNAP_SIZE) {
        if (walls.value.length > 2 && !isPointInPolygon(x + SNAP_SIZE / 2, y + SNAP_SIZE / 2, walls.value)) {
          allInside = false;
          break;
        }
        
        // Ne pas ajouter les unités qui sont déjà dans un footprint
        const isAlreadyInFootprint = currentLayer.value.footprints?.some(f => 
          (f.units ?? []).some((u: any) => u.x === x && u.y === y)
        );

        if (!isAlreadyInFootprint) {
          rectUnits.push({ x, y });
        }
      }
      if (!allInside) break;
    }

    if (selectionMode.value === 'add') {
      if (allInside) {
        // Pour "obligatoirement former un rectangle complet",
        // on remplace la sélection par le rectangle courant si on drag.
        // Mais on veut peut-être garder ce qui était sélectionné avant le début du drag ?
        // L'instruction dit "les unites selectionnées doivent former un rectangle complet".
        // On va faire en sorte que pendant le drag, on ajoute le rectangle complet.
        
        // On garde une copie de la sélection initiale au mousedown pour y ajouter le rectangle
        const newSelection = initialSelection.value ? [...initialSelection.value] : [];
        rectUnits.forEach(ru => {
            if (!newSelection.some(u => u.x === ru.x && u.y === ru.y)) {
                newSelection.push(ru);
            }
        });
        selectedUnits.value = newSelection;
        currentBatch.value = rectUnits;
      }
    } else if (selectionMode.value === 'remove') {
      // Pour le remove, on enlève simplement les unités du rectangle (si elles y sont.)
      selectedUnits.value = (initialSelection.value ? [...initialSelection.value] : [...selectedUnits.value]).filter(u =>
          !(u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY)
      );
    }
  };

  const stopSelection = () => {
    if (selectionMode.value === 'add' && currentBatch.value.length > 0) {
      // S'assurer que toute la sélection est connectée (nettoyage final au cas où le drag aurait créé des déconnexions.)
      const connected = new Set<string>();
      const stack = [...currentBatch.value];
      const selectedSet = new Set(selectedUnits.value.map(u => `${u.x},${u.y}`));
      
      while (stack.length > 0) {
        const { x, y } = stack.pop()!;
        const key = `${x},${y}`;
        if (connected.has(key)) continue;
        connected.add(key);
        
        const neighbors = [
          { x: x + SNAP_SIZE, y }, { x: x - SNAP_SIZE, y },
          { x, y: y + SNAP_SIZE }, { x, y: y - SNAP_SIZE }
        ];
        
        for (const n of neighbors) {
          if (selectedSet.has(`${n.x},${n.y}`) && !connected.has(`${n.x},${n.y}`)) {
            stack.push(n);
          }
        }
      }
      
      // Ne garder que les unités connectées au lot actuel
      selectedUnits.value = selectedUnits.value.filter(u => connected.has(`${u.x},${u.y}`));
    } else if (selectionMode.value === 'remove' && selectedUnits.value.length > 0) {
        // Si on a supprimé des unités, la sélection restante peut être fragmentée
        // On ne garde que le plus grand bloc ou on laisse tel quel ? 
        // L'exigence précédente disait "on ne doit garder que les unites adjacentes selectionnées"
        // Si on supprime une unité au milieu, on devrait probablement ne garder qu'un seul morceau.
        // Mais pour l'instant, on va rester sur le comportement de "nettoyage" par rapport au dernier point d'interaction
        // ou simplement laisser tel quel pour la suppression.
    }

    isSelecting.value = false;
    selectionMode.value = null;
    selectionStart.value = null;
    initialSelection.value = null;
    currentBatch.value = [];
  };

  const createFootprint = () => {
    if (selectedUnits.value.length === 0) return;

    const minX = Math.min(...selectedUnits.value.map(u => u.x));
    const maxX = Math.max(...selectedUnits.value.map(u => u.x));
    const minY = Math.min(...selectedUnits.value.map(u => u.y));
    const maxY = Math.max(...selectedUnits.value.map(u => u.y));

    const selectedSet = new Set(selectedUnits.value.map(u => `${u.x},${u.y}`));
    const unitsToInclude = [...selectedUnits.value];

    // Flood fill pour identifier les unités "extérieures" dans le rectangle englobant
    const reachableFromOutside = new Set<string>();
    const stack: Point[] = [];

    // On commence le remplissage depuis tout le périmètre (avec une marge d'une unité.)
    for (let x = minX - SNAP_SIZE; x <= maxX + SNAP_SIZE; x += SNAP_SIZE) {
      stack.push({ x, y: minY - SNAP_SIZE });
      stack.push({ x, y: maxY + SNAP_SIZE });
    }
    for (let y = minY; y <= maxY; y += SNAP_SIZE) {
      stack.push({ x: minX - SNAP_SIZE, y });
      stack.push({ x: maxX + SNAP_SIZE, y });
    }

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const key = `${x},${y}`;
      if (reachableFromOutside.has(key) || selectedSet.has(key)) continue;
      if (x < minX - SNAP_SIZE || x > maxX + SNAP_SIZE || y < minY - SNAP_SIZE || y > maxY + SNAP_SIZE) continue;

      reachableFromOutside.add(key);
      stack.push({ x: x + SNAP_SIZE, y });
      stack.push({ x: x - SNAP_SIZE, y });
      stack.push({ x, y: y + SNAP_SIZE });
      stack.push({ x, y: y - SNAP_SIZE });
    }

    // Toutes les unités du rectangle englobant qui ne sont ni sélectionnées ni "extérieures" sont des trous à remplir
    for (let x = minX; x <= maxX; x += SNAP_SIZE) {
      for (let y = minY; y <= maxY; y += SNAP_SIZE) {
        const key = `${x},${y}`;
        if (!selectedSet.has(key) && !reachableFromOutside.has(key)) {
          // C'est un trou interne, on l'ajoute s'il est dans la pièce
          if (walls.value.length > 2) {
            if (isPointInPolygon(x + SNAP_SIZE / 2, y + SNAP_SIZE / 2, walls.value)) {
              unitsToInclude.push({ x, y });
            }
          } else {
            unitsToInclude.push({ x, y });
          }
        }
      }
    }

    const uniqueUnits = unitsToInclude.filter((unit, index, self) =>
      index === self.findIndex((u) => u.x === unit.x && u.y === unit.y)
    );

    const newFootprint: Footprint = {
      id: nanoid(),
      name: `Footprint ${currentLayer.value.footprints?.length ? currentLayer.value.footprints.length + 1 : 1}`,
      units: [...uniqueUnits],
      color: getRandomColor()
    };

    if (!currentLayer.value.footprints) {
      currentLayer.value.footprints = [];
    }
    currentLayer.value.footprints.push(newFootprint);
    selectedUnits.value = [];
  };

  const deleteFootprint = (footprintId: string, justUnplace = false) => {
    if (!currentLayer.value.footprints) return;

    if (justUnplace) {
      currentLayer.value.footprints = currentLayer.value.footprints.map(f => ({
        ...f,
        ...(f.id === footprintId ? {
          color: '',
          x: null,
          y: null,
          units: []
        } : {})
      }));
    }
    else {
      currentLayer.value.footprints = currentLayer.value.footprints.filter(f => f.id !== footprintId);
    }
  };

  const changeFootprintColor = (footprintId: string) => {
    if (!currentLayer.value.footprints) return;
    const footprint = currentLayer.value.footprints.find(f => f.id === footprintId);
    if (footprint) {
      footprint.color = getRandomColor();
    }
  };

  const getFootprintAt = (x: number, y: number) => {
    if (!currentLayer.value.footprints) return null;
    const snapX = Math.floor(x / SNAP_SIZE) * SNAP_SIZE;
    const snapY = Math.floor(y / SNAP_SIZE) * SNAP_SIZE;

    return currentLayer.value.footprints.find(f => 
      (f.units ?? []).some(u => u.x === snapX && u.y === snapY)
    );
  };

  const updateHoveredUnit = (x: number, y: number) => {
    // Pour l'affichage de la vignette de coordonnées, on utilise la grille principale (GRID_SIZE)
    const snapX = Math.floor(x / GRID_SIZE) * GRID_SIZE;
    const snapY = Math.floor(y / GRID_SIZE) * GRID_SIZE;

    if (walls.value.length > 2 && !isPointInPolygon(snapX + GRID_SIZE / 2, snapY + GRID_SIZE / 2, walls.value)) {
      hoveredUnit.value = null;
      return;
    }

    hoveredUnit.value = { x: snapX, y: snapY };
  };

  const selectFootprint = (id: string | null) => {
    selectedFootprintId.value = id;
    if (id) {
        selectedUnits.value = [];
    }
  };

  const startDragFootprint = (event: MouseEvent, id: string) => {
    if (event.button !== 0) return;
    draggingFootprintId.value = id;
    selectedFootprintId.value = id;
    selectedUnits.value = [];

    const footprint = currentLayer.value.footprints?.find(f => f.id === id);
    if (footprint) {
      footprintUnitsBeforeDrag.value = footprint.units.map(u => ({ ...u }));
    }

    const svg = (event.target as any).ownerSVGElement || (event.currentTarget as any).ownerSVGElement || (event.currentTarget as any);
    if (svg && svg.createSVGPoint) {
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      startMouseSVGPos.x = svgP.x;
      startMouseSVGPos.y = svgP.y;
    }
  };

  const dragFootprint = (event: MouseEvent, zoomLevel: number, panOffset: { x: number, y: number }) => {
    if (!draggingFootprintId.value) return;

    const svg = (event.target as any).ownerSVGElement || (event.currentTarget as any).ownerSVGElement || (event.currentTarget as any);
    if (!svg || !svg.createSVGPoint) return;

    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const currentX = (svgP.x / zoomLevel) - panOffset.x;
    const currentY = (svgP.y / zoomLevel) - panOffset.y;

    const footprint = currentLayer.value.footprints?.find(f => f.id === draggingFootprintId.value);
    if (!footprint || footprintUnitsBeforeDrag.value.length === 0) return;

    // Calculer le delta par rapport au point de départ du drag
    const startX = (startMouseSVGPos.x / zoomLevel) - panOffset.x;
    const startY = (startMouseSVGPos.y / zoomLevel) - panOffset.y;

    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    const snapDeltaX = Math.round(deltaX / SNAP_SIZE) * SNAP_SIZE;
    const snapDeltaY = Math.round(deltaY / SNAP_SIZE) * SNAP_SIZE;

    if (snapDeltaX === 0 && snapDeltaY === 0) {
      // Si on est revenu à la position de départ (ou proche), on remet les unités d'origine
      footprint.units = footprintUnitsBeforeDrag.value.map(u => ({ ...u }));
      return;
    }

    const minXBefore = Math.min(...footprintUnitsBeforeDrag.value.map(u => u.x));
    const minYBefore = Math.min(...footprintUnitsBeforeDrag.value.map(u => u.y));
    const newX = minXBefore + snapDeltaX;
    const newY = minYBefore + snapDeltaY;

    // Vérifier si le footprint (avec sa taille réelle) est dans les murs
    const widthPx = (footprint.width || 1200) / 600 * 20;
    const heightPx = (footprint.height || 1200) / 600 * 20;

    if (walls.value.length > 2) {
      if (!isElementInWalls(newX, newY, footprint.rotation ?? 0, walls.value, widthPx, heightPx)) {
        return;
      }
    }

    footprint.units = footprintUnitsBeforeDrag.value.map(u => ({
      x: u.x + snapDeltaX,
      y: u.y + snapDeltaY
    }));
  };

  const resetFootprintState = () => {
    draggingFootprintId.value = null;
    rotatingFootprintId.value = null;
    footprintUnitsBeforeDrag.value = [];
  };

  const startRotateFootprint = (event: MouseEvent, footprintId: string, zoomLevel: number, panOffset: { x: number, y: number }) => {
    if (!currentLayer.value.footprints) return;
    const footprint = currentLayer.value.footprints.find(f => f.id === footprintId);
    if (!footprint || !footprint.units || footprint.units.length === 0) return;

    event.stopPropagation();
    selectedFootprintId.value = footprintId;
    rotatingFootprintId.value = footprintId;
    footprintUnitsBeforeDrag.value = footprint.units.map(u => ({ ...u }));

    const minX = Math.min(...footprint.units.map(u => u.x));
    const maxX = Math.max(...footprint.units.map(u => u.x));
    const minY = Math.min(...footprint.units.map(u => u.y));
    const maxY = Math.max(...footprint.units.map(u => u.y));

    // Centre de la BBox du footprint (en world coordinates)
    const worldCenterX = (minX + maxX + 20) / 2;
    const worldCenterY = (minY + maxY + 20) / 2;

    // Conversion en coordonnées relatives au SVG (coordonnées "panoramées" mais pas encore zoomées)
    const centerX = worldCenterX + panOffset.x;
    const centerY = worldCenterY + panOffset.y;

    // Récupération de la position de la souris par rapport au SVG
    const svg = (event.target as any).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / zoomLevel;
    const mouseY = (event.clientY - rect.top) / zoomLevel;

    startRotationAngle.value = Math.atan2(mouseY - centerY, mouseX - centerX);
    initialFootprintRotation.value = footprint.rotation ?? 0;
  };

  const rotateFootprint = (event: MouseEvent, zoomLevel: number, panOffset: { x: number, y: number }) => {
    if (!rotatingFootprintId.value) return;
    const footprint = currentLayer.value.footprints?.find(f => f.id === rotatingFootprintId.value);
    if (!footprint || footprintUnitsBeforeDrag.value.length === 0) return;

    const minX = Math.min(...footprintUnitsBeforeDrag.value.map(u => u.x));
    const maxX = Math.max(...footprintUnitsBeforeDrag.value.map(u => u.x));
    const minY = Math.min(...footprintUnitsBeforeDrag.value.map(u => u.y));
    const maxY = Math.max(...footprintUnitsBeforeDrag.value.map(u => u.y));

    const worldCenterX = (minX + maxX + 20) / 2;
    const worldCenterY = (minY + maxY + 20) / 2;

    const centerX = worldCenterX + panOffset.x;
    const centerY = worldCenterY + panOffset.y;

    const svg = (event.target as any).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / zoomLevel;
    const mouseY = (event.clientY - rect.top) / zoomLevel;

    const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
    const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);

    const rawRotation = (initialFootprintRotation.value + deltaAngle) % 360;
    const snapped = Math.round(rawRotation / 90) * 90;

    updateFootprintRotation(rotatingFootprintId.value, snapped, true);
  };

  const updateFootprintX = (footprintId: string, newX: number) => {
    if (!currentLayer.value.footprints) return;
    const footprint = currentLayer.value.footprints.find(f => f.id === footprintId);
    if (!footprint || footprint.units.length === 0) return;

    const minX = Math.min(...footprint.units.map(u => u.x));
    const deltaX = newX - minX;

    if (deltaX === 0) return;

    const minY = Math.min(...footprint.units.map(u => u.y));
    const widthPx = (footprint.width || 1200) / 600 * 20;
    const heightPx = (footprint.height || 1200) / 600 * 20;

    if (walls.value.length > 2) {
      if (!isElementInWalls(newX, minY, footprint.rotation ?? 0, walls.value, widthPx, heightPx)) {
        return;
      }
    }

    const newUnits = footprint.units.map(u => ({
      ...u,
      x: u.x + deltaX
    }));

    if (walls.value.length > 2) {
      const allInside = newUnits.every(u => isPointInPolygon(u.x + SNAP_SIZE / 2, u.y + SNAP_SIZE / 2, walls.value));
      if (!allInside) return;
    }

    footprint.units = newUnits;
  };

  const updateFootprintY = (footprintId: string, newY: number) => {
    if (!currentLayer.value.footprints) return;
    const footprint = currentLayer.value.footprints.find(f => f.id === footprintId);
    if (!footprint || footprint.units.length === 0) return;

    const minY = Math.min(...footprint.units.map(u => u.y));
    const deltaY = newY - minY;

    if (deltaY === 0) return;

    const minX = Math.min(...footprint.units.map(u => u.x));
    const widthPx = (footprint.width || 1200) / 600 * 20;
    const heightPx = (footprint.height || 1200) / 600 * 20;

    if (walls.value.length > 2) {
      if (!isElementInWalls(minX, newY, footprint.rotation ?? 0, walls.value, widthPx, heightPx)) {
        return;
      }
    }

    const newUnits = footprint.units.map(u => ({
      ...u,
      y: u.y + deltaY
    }));

    if (walls.value.length > 2) {
      const allInside = newUnits.every(u => isPointInPolygon(u.x + SNAP_SIZE / 2, u.y + SNAP_SIZE / 2, walls.value));
      if (!allInside) return;
    }

    footprint.units = newUnits;
  };

  const updateFootprintName = (footprintId: string, newName: string) => {
    if (!currentLayer.value.footprints) return;
    const footprint = currentLayer.value.footprints.find(f => f.id === footprintId);
    if (footprint) {
      footprint.name = newName;
    }
  };

  const updateFootprintRotation = (footprintId: string, newRotation: number, fromInteraction = false) => {
    if (!currentLayer.value.footprints) return;
    const footprint = currentLayer.value.footprints.find(f => f.id === footprintId);
    if (footprint) {
      const prev = footprint.rotation ?? 0;
      const delta = (newRotation - prev) % 360;

      if (delta === 0) return;

      // Si le footprint a des unités (placé sur la grille), on fait pivoter les unités
      if (footprint.units && footprint.units.length > 0) {
        // En mode interaction, on part des unités initiales pour éviter les dérives cumulatives
        const sourceUnits = (fromInteraction && footprintUnitsBeforeDrag.value.length > 0)
          ? footprintUnitsBeforeDrag.value
          : footprint.units;

        const minX = Math.min(...sourceUnits.map(u => u.x));
        const maxX = Math.max(...sourceUnits.map(u => u.x));
        const minY = Math.min(...sourceUnits.map(u => u.y));
        const maxY = Math.max(...sourceUnits.map(u => u.y));

        // Centre de rotation (centre du rectangle englobant)
        const centerX = (minX + maxX + SNAP_SIZE) / 2;
        const centerY = (minY + maxY + SNAP_SIZE) / 2;

        const rad = (delta * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const newUnits = sourceUnits.map(u => {
          // Centrer sur (0,0) par rapport au centre du rectangle englobant, mais en considérant le centre de l'unité
          const ux = u.x + SNAP_SIZE / 2;
          const uy = u.y + SNAP_SIZE / 2;

          const dx = ux - centerX;
          const dy = uy - centerY;

          const rx = dx * cos - dy * sin;
          const ry = dx * sin + dy * cos;

          // Revenir aux coordonnées globales et snap sur la grille de 20px (coin haut-gauche)
          return {
            x: Math.round((centerX + rx - SNAP_SIZE / 2) / SNAP_SIZE) * SNAP_SIZE,
            y: Math.round((centerY + ry - SNAP_SIZE / 2) / SNAP_SIZE) * SNAP_SIZE
          };
        });

        // Vérification des murs
        const minXAfter = Math.min(...newUnits.map(u => u.x));
        const minYAfter = Math.min(...newUnits.map(u => u.y));
        const widthPx = (footprint.width || 1200) / 600 * 20;
        const heightPx = (footprint.height || 1200) / 600 * 20;

        if (walls.value.length > 2) {
          if (!isElementInWalls(minXAfter, minYAfter, newRotation, walls.value, widthPx, heightPx)) {
            return;
          }
        }

        footprint.units = newUnits;
      }
      
      footprint.rotation = newRotation;
    }
  };

  return {
    selectedUnits,
    isSelecting,
    hoveredUnit,
    selectedFootprintId,
    draggingFootprintId,
    startSelection,
    updateSelection,
    stopSelection,
    createFootprint,
    deleteFootprint,
    changeFootprintColor,
    getFootprintAt,
    updateHoveredUnit,
    selectFootprint,
    startDragFootprint,
    dragFootprint,
    resetFootprintState,
    updateFootprintX,
    updateFootprintY,
    updateFootprintName,
    updateFootprintRotation,
    // rotation à la souris
    rotatingFootprintId,
    startRotateFootprint,
    rotateFootprint,
  };
};
