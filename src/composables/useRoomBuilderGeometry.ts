export const rackWidth = 40;
export const rackHeight = 40;

const getRackCorners = (rack: Rack) => {
  return [
    { x: rack.x, y: rack.y },
    { x: rack.x + rackWidth, y: rack.y },
    { x: rack.x, y: rack.y + rackHeight },
    { x: rack.x + rackWidth, y: rack.y + rackHeight }
  ];
};

export const useRoomBuilderGeometry = () => {
  const getPodBoundaries = (layerRacks: Rack[], layerPods: Pod[] = []) => {
    return layerPods.map(pod => {
      const podRacks = layerRacks.filter(r => r.podId === pod.id);
      if (podRacks.length === 0) return null;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      podRacks.forEach(rack => {
        const corners = getRackCorners(rack);
        const rotation = typeof rack.rotation === 'number' ? rack.rotation : 0;

        if (rotation) {
          const angle = (rotation * Math.PI) / 180;
          const cx = rack.x + rackWidth / 2;
          const cy = rack.y + rackHeight / 2;

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
    if (walls.length < 3) return null;

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

  return {
    getPodBoundaries,
    getWallBoundingBox,
    getConstrainedPoint,
    isPointInPolygon
  };
};
