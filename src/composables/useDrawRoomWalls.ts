import {computed, ref} from "vue";
import {useLayers} from "./useLayers.ts";

const isDrawingWalls = ref(false);
const wallPreviewPoint = ref<Point | null>(null);
const wallsRef = ref<Point[]>([]);
const isWallSelected = ref(false);

export const useDrawRoomWalls = () => {
    const walls = computed({
        get: () => layers.value.length > 0 ? (layers.value[currentLayerIndex.value]?.walls || []) : wallsRef.value,
        set: (val) => {
            if (layers.value.length > 0) {
                layers.value.forEach(layer => {
                    layer.walls = JSON.parse(JSON.stringify(val));
                });
            } else {
                wallsRef.value = val;
            }
        }
    });
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

    const {layers, currentLayerIndex} = useLayers(walls);

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