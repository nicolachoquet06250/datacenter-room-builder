declare global {
  export interface Rack extends Point {
    id: number;
    roomId: number;
    name: string;
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

  export interface MinPoint {
    minX: number;
    minY: number;
  }

  export interface MaxPoint {
    maxX: number;
    maxY: number;
  }

  export interface Size {
    width: number;
    height: number;
  }

  export interface Footprint {
    id: string;
    units: Point[]; // Coordonnées de la grille (multiples de 20)
    color: string;
  }

  export interface Layer {
    id: number;
    name: string;
    racks: Rack[];
    pods: Pod[];
    walls: Point[];
    footprints: Footprint[];
    circuits: Point[][];
    pillars?: Point[];
  }
}

export {}
