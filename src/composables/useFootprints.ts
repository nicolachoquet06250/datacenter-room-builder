import {ref, type Ref} from 'vue';
import {nanoid} from 'nanoid';
import {useRoomBuilderGeometry} from './useRoomBuilderGeometry';

export const useFootprints = (currentLayer: Ref<Layer>, walls: Ref<Point[]>) => {
  const selectedUnits = ref<any[]>([]);
  const isSelecting = ref(false);
  const selectionStart = ref<any | null>(null);
  const selectionMode = ref<'add' | 'remove' | null>(null);
  const initialSelection = ref<any[] | null>(null);
  const currentBatch = ref<any[]>([]);
  const hoveredUnit = ref<Point | null>(null);
  const selectedFootprintId = ref<string | null>(null);
  const { isPointInPolygon } = useRoomBuilderGeometry();

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F06292', '#AED581', '#FFD54F', '#4DB6AC', '#BA68C8'
  ];

  const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)]!;

  const startSelection = (x: number, y: number) => {
    isSelecting.value = true;
    const snapX = Math.floor(x / 20) * 20;
    const snapY = Math.floor(y / 20) * 20;
    
    // Ne pas pouvoir sélectionner une unité qui est déjà dans un footprint
    const isAlreadyInFootprint = currentLayer.value.footprints?.some(f => 
      f.units.some((u: any) => u.x === snapX && u.y === snapY)
    );

    if (isAlreadyInFootprint) {
      selectionStart.value = null;
      selectionMode.value = null;
      initialSelection.value = [...selectedUnits.value];
      return;
    }

    if (walls.value.length > 2 && !isPointInPolygon(snapX + 10, snapY + 10, walls.value)) {
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
        (Math.abs(u.x - snapX) === 20 && u.y === snapY) || 
        (u.x === snapX && Math.abs(u.y - snapY) === 20)
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
    
    // On enregistre l'état APRES avoir éventuellement vidé la sélection si non adjacent
    initialSelection.value = [...selectedUnits.value];
  };

  const updateSelection = (currentX: number, currentY: number) => {
    if (!isSelecting.value || !selectionStart.value || !selectionMode.value) return;

    const snapX = Math.floor(currentX / 20) * 20;
    const snapY = Math.floor(currentY / 20) * 20;

    const minX = Math.min(selectionStart.value.x, snapX);
    const maxX = Math.max(selectionStart.value.x, snapX);
    const minY = Math.min(selectionStart.value.y, snapY);
    const maxY = Math.max(selectionStart.value.y, snapY);

    // Collecter les unités du rectangle actuel
    const rectUnits: any[] = [];
    let allInside = true;
    for (let x = minX; x <= maxX; x += 20) {
      for (let y = minY; y <= maxY; y += 20) {
        if (walls.value.length > 2 && !isPointInPolygon(x + 10, y + 10, walls.value)) {
          allInside = false;
          break;
        }
        
        // Ne pas ajouter les unités qui sont déjà dans un footprint
        const isAlreadyInFootprint = currentLayer.value.footprints?.some(f => 
          f.units.some((u: any) => u.x === x && u.y === y)
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
        // L'instruction dit "les unitées selectionnées doivent former un rectangle complet".
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
      // Pour le remove, on enlève simplement les unités du rectangle (si elles y sont)
      selectedUnits.value = (initialSelection.value ? [...initialSelection.value] : [...selectedUnits.value]).filter(u =>
          !(u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY)
      );
    }
  };

  const stopSelection = () => {
    if (selectionMode.value === 'add' && currentBatch.value.length > 0) {
      // S'assurer que toute la sélection est connectée (nettoyage final au cas où le drag aurait créé des déconnexions)
      const connected = new Set<string>();
      const stack = [...currentBatch.value];
      const selectedSet = new Set(selectedUnits.value.map(u => `${u.x},${u.y}`));
      
      while (stack.length > 0) {
        const { x, y } = stack.pop()!;
        const key = `${x},${y}`;
        if (connected.has(key)) continue;
        connected.add(key);
        
        const neighbors = [
          { x: x + 20, y }, { x: x - 20, y },
          { x, y: y + 20 }, { x, y: y - 20 }
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
        // L'exigence précédente disait "on ne doit garder que les unitées adjacentes selectionnées"
        // Si on supprime une unité au milieu, on devrait probablement ne garder qu'un seul morceau.
        // Mais pour l'instant on va rester sur le comportement de "nettoyage" par rapport au dernier point d'interaction
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

    // On commence le remplissage depuis tout le périmètre (avec une marge de 1 unité)
    for (let x = minX - 20; x <= maxX + 20; x += 20) {
      stack.push({ x, y: minY - 20 });
      stack.push({ x, y: maxY + 20 });
    }
    for (let y = minY; y <= maxY; y += 20) {
      stack.push({ x: minX - 20, y });
      stack.push({ x: maxX + 20, y });
    }

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const key = `${x},${y}`;
      if (reachableFromOutside.has(key) || selectedSet.has(key)) continue;
      if (x < minX - 20 || x > maxX + 20 || y < minY - 20 || y > maxY + 20) continue;

      reachableFromOutside.add(key);
      stack.push({ x: x + 20, y });
      stack.push({ x: x - 20, y });
      stack.push({ x, y: y + 20 });
      stack.push({ x, y: y - 20 });
    }

    // Toutes les unités du rectangle englobant qui ne sont ni sélectionnées ni "extérieures" sont des trous à remplir
    for (let x = minX; x <= maxX; x += 20) {
      for (let y = minY; y <= maxY; y += 20) {
        const key = `${x},${y}`;
        if (!selectedSet.has(key) && !reachableFromOutside.has(key)) {
          // C'est un trou interne, on l'ajoute s'il est dans la pièce
          if (walls.value.length > 2) {
            if (isPointInPolygon(x + 10, y + 10, walls.value)) {
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

    const newFootprint: any = {
      id: nanoid(),
      units: [...uniqueUnits],
      color: getRandomColor()
    };

    if (!currentLayer.value.footprints) {
      currentLayer.value.footprints = [];
    }
    currentLayer.value.footprints.push(newFootprint);
    selectedUnits.value = [];
  };

  const deleteFootprint = (footprintId: string) => {
    if (!currentLayer.value.footprints) return;
    currentLayer.value.footprints = currentLayer.value.footprints.filter(f => f.id !== footprintId);
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
    const snapX = Math.floor(x / 20) * 20;
    const snapY = Math.floor(y / 20) * 20;

    return currentLayer.value.footprints.find(f => 
      f.units.some(u => u.x === snapX && u.y === snapY)
    );
  };

  const updateHoveredUnit = (x: number, y: number) => {
    const snapX = Math.floor(x / 20) * 20;
    const snapY = Math.floor(y / 20) * 20;

    const isAlreadyInFootprint = currentLayer.value.footprints?.some(f =>
        f.units.some((u: any) => u.x === snapX && u.y === snapY)
    );

    if (isAlreadyInFootprint) {
      hoveredUnit.value = null;
      return;
    }

    if (walls.value.length > 2 && !isPointInPolygon(snapX + 10, snapY + 10, walls.value)) {
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

  return {
    selectedUnits,
    isSelecting,
    hoveredUnit,
    selectedFootprintId,
    startSelection,
    updateSelection,
    stopSelection,
    createFootprint,
    deleteFootprint,
    changeFootprintColor,
    getFootprintAt,
    updateHoveredUnit,
    selectFootprint
  };
};
