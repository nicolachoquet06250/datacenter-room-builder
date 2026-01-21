import {computed, onMounted, ref} from "vue";
import {useDrawRoomWalls} from "./useDrawRoomWalls.ts";

const layers = ref<Layer[]>([]);
const currentLayerIndex = ref(0);

export const layerNames = ['Circuits électriques', 'Surfaces au sol', 'Baies'];

export const useLayers = (defaultLayers: Layer[]|string = []) => {
    defaultLayers = (typeof defaultLayers === 'string' ? JSON.parse(defaultLayers) : defaultLayers) as Layer[];

    const {walls} = useDrawRoomWalls();

    const clearLayers = () => layers.value = [];

    const initialize = () => {
        const finalWalls = [...walls.value];

        layers.value = layerNames.map((name, index) => ({
            id: index + 1,
            name,
            racks: [],
            pods: [],
            walls: JSON.parse(JSON.stringify(finalWalls))
        }));
        currentLayerIndex.value = 0;
    }

    onMounted(() => {
        if (defaultLayers && defaultLayers.length > 0) {
            layers.value = defaultLayers;
            currentLayerIndex.value = 0;
        }
    })

    return {
        layers,
        currentLayerIndex,
        currentLayer: computed({
            get: () => layers.value[currentLayerIndex.value]!,
            set: (val) => {
                layers.value[currentLayerIndex.value] = val;
            }
        }),
        clearLayers,
        initialize
    }
}