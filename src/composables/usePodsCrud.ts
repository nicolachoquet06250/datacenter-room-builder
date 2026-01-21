import {computed, type Ref} from "vue";
import {useContextMenu} from "./useContextMenu.ts";
import {useNotify} from "./useNotify.ts";
import {useDrawRoomWalls} from "./useDrawRoomWalls.ts";
import {useLayers} from "./useLayers.ts";
import {useRacksCrud} from "./useRacksCrud.ts";
import {useRoomBuilderHistory} from "./useRoomBuilderHistory.ts";

export const usePodsCrud = (
    selectedRackIndices: Ref<number[]>,
    startDragRack: (event: MouseEvent, index: number) => void
) => {
    const {racks} = useRacksCrud();
    const {closeContextMenu} = useContextMenu(
        computed(() => typeof racks.value === 'string' ? JSON.parse(racks.value) : racks.value),
        selectedRackIndices
    );
    const {success: notifySuccess} = useNotify();
    const {layers, currentLayerIndex, currentLayer} = useLayers();
    const {walls, isDrawingWalls, isWallSelected} = useDrawRoomWalls();

    const { takeSnapshot } = useRoomBuilderHistory({
        layers,
        walls,
        currentLayerIndex
    });

    const pods = computed({
        get: () => currentLayer.value?.pods || [],
        set: (val) => {
            if (currentLayer.value) {
                currentLayer.value.pods = val;
            }
        }
    });

    const createPod = () => {
        if (selectedRackIndices.value.length < 1) return;

        takeSnapshot();
        const podId = `pod-${Date.now()}`;
        const podName = `Pod ${pods.value.length + 1}`;

        pods.value.push({ id: podId, name: podName });

        selectedRackIndices.value.forEach(index => {
            if (typeof racks.value === 'string') return;
            racks.value[index]!.podId = podId;
        });

        closeContextMenu();

        notifySuccess({
            title: 'Pod créé',
            text: `${podName} a été créé avec ${selectedRackIndices.value.length} racks`
        });
    };

    const leavePod = () => {
        if (selectedRackIndices.value.length < 1) return;
        takeSnapshot();

        selectedRackIndices.value.forEach(index => {
            if (typeof racks.value === 'string') return;
            racks.value[index]!.podId = null;
        });

        closeContextMenu();

        notifySuccess({
            title: 'Pod quitté',
            text: 'Les racks sélectionnés ont été sortis de leur pod'
        })
    };

    const deletePod = (podId: string) => {
        takeSnapshot();

        if (typeof racks.value === 'string') return;

        racks.value.forEach(r => {
            if (r.podId === podId) {
                r.podId = null;
            }
        });

        const podIndex = pods.value.findIndex(p => p.id === podId);
        if (podIndex !== -1) {
            const podName = pods.value[podIndex]!.name;
            pods.value.splice(podIndex, 1);

            notifySuccess({
                title: 'Pod supprimé',
                text: `${podName} a été supprimé`
            });
        }

        closeContextMenu();
    };

    const selectPod = (event: MouseEvent, podId: string) => {
        if (isDrawingWalls.value) return;
        if (event.button !== 0) return;
        event.stopPropagation();
        isWallSelected.value = false;

        const podRacksIndices: number[] = [];
        if (typeof racks.value === 'string') return;

        racks.value.forEach((rack, index) => {
            if (rack.podId === podId) {
                podRacksIndices.push(index);
            }
        });

        if (podRacksIndices.length > 0) {
            selectedRackIndices.value = podRacksIndices;
            startDragRack(event, podRacksIndices[0]!);
        }
    };

    return {
        pods,
        createPod,
        leavePod,
        deletePod,
        selectPod
    };
}