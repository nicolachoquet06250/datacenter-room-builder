import {ref} from "vue";

const zoomLevel = ref(1);

export const useZoom = () => {
    const zoomIn = () => {
        zoomLevel.value = Math.min(zoomLevel.value + 0.1, 3);
    };

    const zoomOut = () => {
        zoomLevel.value = Math.max(zoomLevel.value - 0.1, 0.2);
    };

    const onWheel = (event: WheelEvent) => {
        if (event.ctrlKey) {
            event.preventDefault();
            event.deltaY < 0 ? zoomIn() : zoomOut();
        }
    };

    return {zoomLevel, zoomIn, zoomOut, onWheel};
}