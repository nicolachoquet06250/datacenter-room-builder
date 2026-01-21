import {type Ref, ref} from "vue";
import {useRacksCrud} from "./useRacksCrud.ts";

const isPanning = ref(false);

export const usePan = (zoomLevel: Ref<number>) => {
    const {panOffset} = useRacksCrud(zoomLevel)
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