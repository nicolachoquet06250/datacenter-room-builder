import {computed, ref} from "vue";
import {useLayersState} from "./useLayers.ts";

const isDrawingWalls = ref(false);
const wallPreviewPoint = ref<Point | null>(null);
const isWallSelected = ref(false);

export const useDrawRoomWalls = () => {
    const wallsRef = ref<Point[]>([]);
    const {layers: globalLayers, currentLayerIndex} = useLayersState();

    const walls = computed({
        get: () => {
            return globalLayers.value.length > 0 ? (globalLayers.value[currentLayerIndex.value]?.walls || []) : wallsRef.value;
        },
        set: (val) => {
            if (globalLayers.value.length > 0) {
                globalLayers.value.forEach(layer => {
                    layer.walls = JSON.parse(JSON.stringify(val));
                });
            }
            wallsRef.value = JSON.parse(JSON.stringify(val));
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