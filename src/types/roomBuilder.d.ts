declare global {
  export enum RackStatus {
    RESERVED_WITH_CUSTOMER = 'reserved_with_customer',
    IN_PRODUCTION_WITH_CUSTOMER = 'in_production_with_customer',
    IN_PRODUCTION_WITHOUT_CUSTOMER = 'in_production_without_customer',
    OTHER = 'other',
  }

  export interface Rack {
    id: number;
    roomId: number;
    name: string;
    x?: number | null;
    y?: number | null;
    rotation?: number | null;
    podId?: string | null;
    width?: number | null;
    height?: number | null;
    status: RackStatus;
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
    width?: number;
    height?: number;
    name?: string;
    rotation?: number;
  }

  export interface Circuit {
    id: string;
    x?: number | null;
    y?: number | null;
    rotation?: number | null;
    name: string;
  }

  export interface Layer {
    id: number;
    name: string;
    racks: Rack[];
    pods: Pod[];
    walls: Point[];
    footprints: Footprint[];
    circuits: Circuit[];
    pillars?: Point[];
  }
}

export {}
