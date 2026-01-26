declare global {
    import { Rack } from "./components/RoomBuilder.vue";

    export type RoomBuilderEvents = {
        saved: Rack[];
        // ajout futur:
        // changed: { racks: Rack[]; roomId: number };
    };

    type EventName = keyof RoomBuilderEvents;

    export interface RoomBuilderElement extends HTMLElement {
        addEventListener<K extends EventName>(
            type: K,
            listener: (ev: CustomEvent<RoomBuilderEvents[K]>) => any,
            options?: boolean | AddEventListenerOptions
        ): void;

        removeEventListener<K extends EventName>(
            type: K,
            listener: (ev: CustomEvent<RoomBuilderEvents[K]>) => any,
            options?: boolean | EventListenerOptions
        ): void;
    }

    interface HTMLElementTagNameMap {
        'room-builder': RoomBuilderElement; // ton tag custom
    }
}

export {}