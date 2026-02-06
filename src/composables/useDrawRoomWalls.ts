import {computed, ref, watch} from "vue";
import {useLayers} from "./useLayers.ts";

const isDrawingWalls = ref(false);
const wallPreviewPoint = ref<Point | null>(null);
const wallsRef = ref<Point[]>([]);
const isWallSelected = ref(false);

export const useDrawRoomWalls = () => {
    const layers = ref<Layer[]>([]);
    const walls = computed({
        get: () => layers.value.length > 0 ? (layers.value[currentLayerIndex.value]?.walls || []) : wallsRef.value,
        set: (val) => {
            if (layers.value.length > 0) {
                layers.value.forEach(layer => {
                    layer.walls = JSON.parse(JSON.stringify(val));
                });
            }
            wallsRef.value = JSON.parse(JSON.stringify(val));
        }
    });

    const {layers: _layers, currentLayerIndex} = useLayers(walls);

    watch(_layers, () => {
        layers.value = _layers.value;
    }, {immediate: true, once: true})

    const cancelDrawingWalls = () => {
        isDrawingWalls.value = false;
        wallPreviewPoint.value = null;
    }
    const toggleIsDrawingWalls = () => {
        isDrawingWalls.value = !isDrawingWalls.value;
    }
    const createWall = (point: Point) => {
        walls.value.push(point);
    }


    return {
        isDrawingWalls,
        isWallSelected,
        wallPreviewPoint,
        wallsRef,
        walls,

        cancelDrawingWalls,
        toggleIsDrawingWalls,
        createWall,
    }
}