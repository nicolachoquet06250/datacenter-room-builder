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

  export interface Layer {
    id: number;
    name: string;
    racks: Rack[];
    pods: Pod[];
    walls: Point[];
  }
}

export {}