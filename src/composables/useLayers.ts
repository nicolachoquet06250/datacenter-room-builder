import {computed, type ComputedRef, onMounted, type Ref, ref, watch} from "vue";

const layers = ref<Layer[]>([]);
const currentLayerIndex = ref(0);

export const layerNames = [
    'FloorPlanBuilder:Layers:Walls:Title',
    'FloorPlanBuilder:Layers:Circuits:Title',
    'FloorPlanBuilder:Layers:Footprints:Title',
    'FloorPlanBuilder:Layers:Racks:Title'
] as const;

export const useLayers = (walls: Ref<Point[]>, defaultLayers?: ComputedRef<Layer[]>) => {
    if (!defaultLayers) {
        defaultLayers = computed<Layer[]>(() => []);
    }

    const clearLayers = () => {
        layers.value.forEach(layer => {
            layer.walls = [];
            layer.pillars = [];
        });
    }

    const initialize = () => {
        const finalWalls = [...walls.value];

        if (layers.value.length > 0) {
            layers.value = layers.value.map(layer => ({
                ...layer,
                walls: JSON.parse(JSON.stringify(finalWalls))
            }));
        } else {
            layers.value = layerNames.map((name, index) => ({
                id: index + 1,
                name,
                racks: [],
                pods: [],
                walls: JSON.parse(JSON.stringify(finalWalls)),
                footprints: [],
                circuits: [],
                pillars: []
            }));
        }
        currentLayerIndex.value = 0;
    }

    onMounted(() => {
        if (defaultLayers && defaultLayers.value.length > 0) {
            let initialLayers: Layer[];
            if (defaultLayers.value[0]!.name === layerNames[0]) {
                initialLayers = defaultLayers.value.map((layer) => ({
                    ...layer,
                    pillars: layer.pillars ?? [],
                    circuits: layer.circuits ?? []
                }));
            } else {
                initialLayers = [
                    {
                        id: 0,
                        name: layerNames[0],
                        racks: [],
                        pods: [],
                        walls: defaultLayers.value[0]!.walls,
                        footprints: [],
                        circuits: [],
                        pillars: defaultLayers.value[0]!.pillars ?? []
                    },
                    ...defaultLayers.value.map((layer) => ({
                        ...layer,
                        pillars: layer.pillars ?? [],
                        circuits: layer.circuits ?? []
                    }))
                ];
            }

            // S'assurer que tous les calques ont les mêmes poteaux
            const allPillars = initialLayers.find(l => l.pillars && l.pillars.length > 0)?.pillars || [];
            layers.value = initialLayers.map(l => ({
                ...l,
                pillars: JSON.parse(JSON.stringify(allPillars))
            }));

            if (initialLayers.length > 0 && initialLayers[0]!.walls.length > 0) {
                walls.value = JSON.parse(JSON.stringify(initialLayers[0]!.walls));
            }

            currentLayerIndex.value = 0;
        }
    })

    watch(defaultLayers, () => {
        if (defaultLayers && defaultLayers.value.length > 0) {
            let initialLayers: Layer[];
            if (defaultLayers.value[0]!.name === layerNames[0]) {
                initialLayers = defaultLayers.value.map((layer) => ({
                    ...layer,
                    pillars: layer.pillars ?? [],
                    circuits: layer.circuits ?? []
                }));
            } else {
                initialLayers = [
                    {
                        id: 0,
                        name: layerNames[0],
                        racks: [],
                        pods: [],
                        walls: defaultLayers.value[0]!.walls,
                        footprints: [],
                        circuits: [],
                        pillars: defaultLayers.value[0]!.pillars ?? []
                    },
                    ...defaultLayers.value.map((layer) => ({
                        ...layer,
                        pillars: layer.pillars ?? [],
                        circuits: layer.circuits ?? []
                    }))
                ];
            }

            // S'assurer que tous les calques ont les mêmes poteaux
            const allPillars = initialLayers.find(l => l.pillars && l.pillars.length > 0)?.pillars || [];
            layers.value = initialLayers.map(l => ({
                ...l,
                pillars: JSON.parse(JSON.stringify(allPillars))
            }));

            if (initialLayers.length > 0 && initialLayers[0]!.walls.length > 0) {
                walls.value = JSON.parse(JSON.stringify(initialLayers[0]!.walls));
            }

            currentLayerIndex.value = 0;
        }
    }, { immediate: true })

    return {
        layers,
        currentLayerIndex,
        currentLayer: computed({
            get: () => layers.value[currentLayerIndex.value] || {
                id: 0,
                name: '',
                racks: [],
                pods: [],
                walls: [],
                footprints: [],
                circuits: [],
                pillars: []
            },
            set: (val) => {
                if (layers.value[currentLayerIndex.value]) {
                    layers.value[currentLayerIndex.value] = val;
                }
            }
        }),
        clearLayers,
        initialize
    }
}

export const useLayersState = () => {
    return {
        layers,
        currentLayerIndex,
    }
}
