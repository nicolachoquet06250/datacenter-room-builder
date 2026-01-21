import {ref} from "vue";
import {useRacksCrud} from "./useRacksCrud.ts";
import {useZoom} from "./useZoom.ts";

const isPanning = ref(false);

export const usePan = (roomId: number) => {
    const {zoomLevel} = useZoom();
    const {panOffset} = useRacksCrud(zoomLevel, roomId)

    const panStart = () => isPanning.value = true;
    const panStop = () => isPanning.value = false;

    const panRunning = (event: MouseEvent) => {
        panOffset.value.x += event.movementX / zoomLevel.value;
        panOffset.value.y += event.movementY / zoomLevel.value;
    }

    return {
        isPanning,
        panStart,
        panStop,
        panRunning
    }
}