export const rackWidth = 40;
export const rackHeight = 40;

export const getRackDimensions = (rack: Rack) => {
  const w = (rack.width && rack.width > 0) ? Math.round(rack.width / 600 * 20) : rackWidth;
  const h = (rack.height && rack.height > 0) ? Math.round(rack.height / 600 * 20) : rackHeight;
  return { w, h };
};

const getRackCorners = (rack: Rack) => {
  const x = rack.x || 0;
  const y = rack.y || 0;
  return [
    { x, y },
    { x: x + rackWidth, y },
    { x, y: y + rackHeight },
    { x: x + rackWidth, y: y + rackHeight }
  ];
};

export const useRoomBuilderGeometry = () => {
  const getPodBoundaries = (layerRacks: Rack[], layerPods: Pod[] = []) => {
    return layerPods.map(pod => {
      const podRacks = layerRacks.filter(r => r.podId === pod.id && r.x !== null && r.x !== undefined && r.y !== null && r.y !== undefined);
      if (podRacks.length === 0) return null;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      podRacks.forEach(rack => {
        const corners = getRackCorners(rack);
        const rotation = typeof rack.rotation === 'number' ? rack.rotation : 0;

        if (rotation) {
          const x = rack.x || 0;
          const y = rack.y || 0;
          const angle = (rotation * Math.PI) / 180;
          const cx = x + rackWidth / 2;
          const cy = y + rackHeight / 2;

          corners.forEach(corner => {
            const x = cx + (corner.x - cx) * Math.cos(angle) - (corner.y - cy) * Math.sin(angle);
            const y = cy + (corner.x - cx) * Math.sin(angle) + (corner.y - cy) * Math.cos(angle);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        } else {
          corners.forEach(corner => {
            minX = Math.min(minX, corner.x);
            minY = Math.min(minY, corner.y);
            maxX = Math.max(maxX, corner.x);
            maxY = Math.max(maxY, corner.y);
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

  const getWallBoundingBox = (walls: Point[] = []) => {
    if (walls.length === 0) return null;

    const minX = Math.min(...walls.map(p => p.x));
    const minY = Math.min(...walls.map(p => p.y));
    const maxX = Math.max(...walls.map(p => p.x));
    const maxY = Math.max(...walls.map(p => p.y));

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };

  const getConstrainedPoint = (currentX: number, currentY: number, lastPoint: Point | null, snap: number = 20): Point => {
    const snapX = Math.round(currentX / snap) * snap;
    const snapY = Math.round(currentY / snap) * snap;

    if (!lastPoint) {
      return { x: snapX, y: snapY };
    }

    const dx = snapX - lastPoint.x;
    const dy = snapY - lastPoint.y;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy * 1.5) {
      return { x: snapX, y: lastPoint.y };
    }

    if (absDy > absDx * 1.5) {
      return { x: lastPoint.x, y: snapY };
    }

    const dist = Math.round((absDx + absDy) / 2 / snap) * snap;
    return {
      x: lastPoint.x + (dx >= 0 ? dist : -dist),
      y: lastPoint.y + (dy >= 0 ? dist : -dist)
    };
  };

  const isPointInPolygon = (x: number, y: number, polygon: Point[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i]!.x;
      const yi = polygon[i]!.y;
      const xj = polygon[j]!.x;
      const yj = polygon[j]!.y;

      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const findClosestPointInside = (x: number, y: number, polygon: Point[], _margin: number = 20): Point => {
    if (polygon.length < 3) return { x, y };
    if (isPointInPolygon(x, y, polygon)) return { x, y };

    let minDistance = Infinity;
    let closestPoint = { x, y };

    // Vérifier chaque segment du polygone
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i]!;
      const p2 = polygon[(i + 1) % polygon.length]!;

      // Trouver le point le plus proche sur le segment [p1, p2]
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthSq = dx * dx + dy * dy;

      let t = ((x - p1.x) * dx + (y - p1.y) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));

      const projectionX = p1.x + t * dx;
      const projectionY = p1.y + t * dy;

      const distance = Math.sqrt((x - projectionX) ** 2 + (y - projectionY) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = { x: projectionX, y: projectionY };
      }
    }

    // On déplace le point un peu vers l'intérieur pour être sûr de ne pas être sur la ligne
    // On trouve le centre de gravité du polygone comme direction "vers l'intérieur"
    const centerX = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length;
    const centerY = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length;

    const dirX = centerX - closestPoint.x;
    const dirY = centerY - closestPoint.y;
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);

    // Déplacement vers l'intérieur (par exemple de 5 unités ou de la marge demandée)
    const moveDist = 5;
    let finalX = closestPoint.x + (dirX / dirLen) * moveDist;
    let finalY = closestPoint.y + (dirY / dirLen) * moveDist;

    // Arrondir au snap si nécessaire (ici on laisse l'appelant gérer le snap final si besoin)
    return {
      x: Math.round(finalX / 20) * 20,
      y: Math.round(finalY / 20) * 20
    };
  };

  const isElementInWalls = (x: number, y: number, rotation: number | null, polygon: Point[], _width?: number, _height?: number) => {
    if (polygon.length < 3) return true;

    const corners = [
      { x, y },
      { x: x + rackWidth, y },
      { x, y: y + rackHeight },
      { x: x + rackWidth, y: y + rackHeight }
    ];

    const angle = ((rotation || 0) * Math.PI) / 180;
    const cx = x + rackWidth / 2;
    const cy = y + rackHeight / 2;

    return corners.every(corner => {
      let finalX = corner.x;
      let finalY = corner.y;

      if (rotation) {
        finalX = cx + (corner.x - cx) * Math.cos(angle) - (corner.y - cy) * Math.sin(angle);
        finalY = cy + (corner.x - cx) * Math.sin(angle) + (corner.y - cy) * Math.cos(angle);
      }

      // On réduit légèrement la taille de l'élément pour la vérification des collisions
      // afin d'éviter les problèmes de précision aux bords des murs (unité de grille.)
      const margin = 0.1;
      const testX = finalX + (finalX > cx ? -margin : margin);
      const testY = finalY + (finalY > cy ? -margin : margin);

      return isPointInPolygon(testX, testY, polygon);
    });
  };

  return {
    getPodBoundaries,
    getWallBoundingBox,
    getConstrainedPoint,
    isPointInPolygon,
    findClosestPointInside,
    isElementInWalls
  };
};
