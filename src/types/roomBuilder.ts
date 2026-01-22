declare global {
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
    circuits: Point[];
  }
}

export {}
