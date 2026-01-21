import {computed, ref, unref} from "vue";
import {useLayers} from "./useLayers.ts";

const isDrawingWalls = ref(false);
const wallPreviewPoint = ref<Point | null>(null);
const wallsRef = ref<Point[]>([]);
const isWallSelected = ref(false);
export const useDrawRoomWalls = () => {
    const {layers, currentLayerIndex} = useLayers();
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

    const walls = computed({
        get: () => layers.value.length > 0 ? (layers.value[currentLayerIndex.value]?.walls || []) : wallsRef.value,
        set: (val) => {
            if (layers.value.length > 0 && unref(layers)[currentLayerIndex.value]) {
                layers.value[currentLayerIndex.value]!.walls = val;
            } else {
                wallsRef.value = val;
            }
        }
    });

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