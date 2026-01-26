import {computed, type ComputedRef, type Ref, ref} from "vue";

const contextMenu = ref<Point & { show: boolean; footprintId?: string }>({ x: 0, y: 0, show: false });

export const useContextMenu = (racks: ComputedRef<Rack[]>, selectedRackIndices: Ref<number[]>, selectedUnits?: Ref<Point[]>) => {
    const contextMenuOptions = computed<{ type: string; podId?: string; footprintId?: string }>(() => {
        if (contextMenu.value.footprintId) {
            return { type: 'footprint_actions', footprintId: contextMenu.value.footprintId };
        }

        if (selectedUnits && selectedUnits.value.length > 0) {
            return { type: 'create_footprint' };
        }

        if (!selectedRackIndices.value || selectedRackIndices.value.length === 0) return { type: 'none' };

        const selectedRacks = selectedRackIndices.value.map(idx => racks.value[idx]!) as Rack[];
        const podsInSelection = [...new Set(selectedRacks.map(r => r?.podId).filter(Boolean))];

        if (podsInSelection.length === 0) {
            return { type: 'create_pod' } as { type: string; podId?: string };
        }

        if (podsInSelection.length === 1) {
            const podId = podsInSelection[0]!;
            const racksInPod = racks.value.filter(r => r.podId === podId);
            const allRacksOfPodSelected = racksInPod.every(r =>
                selectedRackIndices.value.includes(racks.value.findIndex(rack => rack.id === r.id))
            );

            if (allRacksOfPodSelected) {
                return { type: 'delete_pod', podId } as { type: string; podId?: string };
            }
            return { type: 'leave_pod', podId } as { type: string; podId?: string };
        }

        return { type: 'leave_pod', podId: podsInSelection[0] } as { type: string; podId?: string };
    });

    const openContextMenu = (
        event: MouseEvent,
        index: number | null = null,
        footprintId: string | null = null
    ) => {
        event.preventDefault();
        event.stopPropagation();

        if (index !== null) {
            if (!selectedRackIndices.value.includes(index)) {
                if (event.ctrlKey || event.metaKey) {
                    selectedRackIndices.value.push(index);
                } else {
                    selectedRackIndices.value = [index];
                }
            }
        }

        contextMenu.value = {
            x: event.clientX,
            y: event.clientY,
            show: true,
            footprintId: footprintId || undefined
        };

        window.addEventListener('click', closeContextMenu);
    };

    const closeContextMenu = () => {
        contextMenu.value.show = false;
        window.removeEventListener('click', closeContextMenu);
    };

    return {
        contextMenu,
        contextMenuOptions,
        openContextMenu,
        closeContextMenu
    }
}