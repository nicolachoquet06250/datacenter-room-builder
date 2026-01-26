import {computed, type ComputedRef, onMounted, type Ref, ref} from "vue";

const layers = ref<Layer[]>([]);
const currentLayerIndex = ref(0);

export const layerNames = ['Murs', 'Circuits électriques', 'Surfaces au sol', 'Baies'] as const;

export const useLayers = (walls: Ref<Point[]>, defaultLayers?: ComputedRef<Layer[]>) => {
    if (!defaultLayers) {
        defaultLayers = computed<Layer[]>(() => []);
    }

    const clearLayers = () => layers.value = [];

    const initialize = () => {
        const finalWalls = [...walls.value];

        layers.value = layerNames.map((name, index) => ({
            id: index + 1,
            name,
            racks: [],
            pods: [],
            walls: JSON.parse(JSON.stringify(finalWalls)),
            footprints: [],
            circuits: []
        }));
        currentLayerIndex.value = 0;
    }

    onMounted(() => {
        if (defaultLayers && defaultLayers.value.length > 0) {
            layers.value = [
                {
                    id: 0,
                    name: layerNames[0],
                    racks: [],
                    pods: [],
                    walls: defaultLayers.value[0]!.walls,
                    footprints: [],
                    circuits: []
                },
                ...defaultLayers.value.map((layer) => ({
                    ...layer,
                    circuits: Array.isArray(layer.circuits?.[0])
                        ? layer.circuits
                        : (layer.circuits?.length ? [layer.circuits as unknown as Point[]] : [])
                }))
            ];
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
