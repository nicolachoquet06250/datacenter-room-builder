import {computed, ref} from "vue";
import {useLayers} from "./useLayers.ts";
import {useRoomBuilderHistory} from "./useRoomBuilderHistory.ts";
import {useDrawRoomWalls} from "./useDrawRoomWalls.ts";
import {rackHeight, rackWidth, useRoomBuilderGeometry} from "./useRoomBuilderGeometry.ts";
import {useZoom} from "./useZoom.ts";

const selectedRackIndices = ref<number[]>([]);
const rotatingRack = ref<number | null>(null);
const panOffset = ref({ x: 0, y: 0 });
const startRotationAngle = ref(0);
const initialRackRotation = ref(0);

const draggingRack = ref<number | null>(null);
const rackPositionsBeforeDrag = ref<Point[]>([]);
const lastMousePos = { x: 0, y: 0 };

export const useRacksCrud = (roomId: number) => {
    const {zoomLevel} = useZoom();
    const {walls} = useDrawRoomWalls();
    const {currentLayer, layers, currentLayerIndex} = useLayers(walls);
    const {getWallBoundingBox} = useRoomBuilderGeometry();

    const {takeSnapshot} = useRoomBuilderHistory({
        layers,
        walls,
        currentLayerIndex
    });
    const {isPointInPolygon} = useRoomBuilderGeometry()

    const {isDrawingWalls, isWallSelected} = useDrawRoomWalls();

    const wallBoundingBox = computed(() => {
        if (isDrawingWalls.value) return null;
        return getWallBoundingBox(walls.value);
    });

    const racks = computed({
        get: () => (currentLayer.value?.racks || []) as Rack[],
        set: (val) => {
            if (currentLayer.value) {
                currentLayer.value.racks = val as Rack[];
            }
        }
    });

    const createRack = () => {
        if (walls.value.length === 0) return;
        isWallSelected.value = false;
        takeSnapshot();

        let startX = 40;
        let startY = 40;

        if (wallBoundingBox.value) {
            const centerX = wallBoundingBox.value.minX + wallBoundingBox.value.width / 2;
            const centerY = wallBoundingBox.value.minY + wallBoundingBox.value.height / 2;

            startX = Math.round((centerX - rackWidth / 2) / 20) * 20;
            startY = Math.round((centerY - rackHeight / 2) / 20) * 20;

            if (!isPointInPolygon(startX + rackWidth / 2, startY + rackHeight / 2, walls.value)) {
                let found = false;
                for (let x = wallBoundingBox.value.minX + 20; x < wallBoundingBox.value.maxX; x += 20) {
                    for (let y = wallBoundingBox.value.minY + 20; y < wallBoundingBox.value.maxY; y += 20) {
                        if (isPointInPolygon(x, y, walls.value)) {
                            startX = Math.round((x - rackWidth / 2) / 20) * 20;
                            startY = Math.round((y - rackHeight / 2) / 20) * 20;
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
            }
        }

        racks.value.push({
            id: racks.value.length + 1,
            roomId,
            name: `Rack ${racks.value.length + 1}`,
            x: startX,
            y: startY,
            rotation: 0
        });
        selectedRackIndices.value = [racks.value.length - 1];
    };

    const duplicateRack = (index: number) => {
        takeSnapshot();
        const rack = racks.value[index];
        const newRack = JSON.parse(JSON.stringify(rack));
        delete newRack.id;
        newRack.name = `${rack?.name} (copie)`;
        newRack.x += 20;
        newRack.y += 20;

        racks.value.push(newRack);
        selectedRackIndices.value = [racks.value.length - 1];
    };

    const copyRack = (index: number) => {
        const rack = racks.value[index];
        const copyData = JSON.parse(JSON.stringify(rack));
        delete copyData.id;
        copyData._type = 'rack';

        navigator.clipboard.writeText(JSON.stringify(copyData))
            .then(() => console.log('Rack copied to clipboard'))
            .catch(err => console.error('Failed to copy rack: ', err));
    };

    const pastRack = (data: any) => {
        takeSnapshot();
        const newRack = data;
        delete newRack._type;
        newRack.x += 20;
        newRack.y += 20;

        racks.value.push(newRack);
        selectedRackIndices.value = [racks.value.length - 1];
    };

    const removeRack = (index: number) => {
        takeSnapshot();
        racks.value.splice(index, 1);
        selectedRackIndices.value = [];
    };

    const updateRackName = (value: string) => {
        if (selectedRackIndices.value.length !== 1) return;
        const rack = racks.value[selectedRackIndices.value[0]!];
        if (!rack) return;
        rack.name = value;
    };

    const updateRackRotation = (value: number) => {
        if (selectedRackIndices.value.length !== 1) return;
        const rack = racks.value[selectedRackIndices.value[0]!];
        if (!rack) return;
        rack.rotation = Math.round((value ?? 0) / 45) * 45;
    };

    const startRotateRack = (event: MouseEvent, index: number) => {
        if (isDrawingWalls.value || currentLayerIndex.value === 1) return;
        isWallSelected.value = false;
        takeSnapshot();
        event.stopPropagation();
        rotatingRack.value = index;
        selectedRackIndices.value = [index];

        const rack = racks.value[index];
        const centerX = (rack?.x ?? 0) + rackWidth / 2 + panOffset.value.x;
        const centerY = (rack?.y ?? 0) + rackHeight / 2 + panOffset.value.y;

        startRotationAngle.value = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
        initialRackRotation.value = rack?.rotation || 0;
    };

    const startDragRack = (event: MouseEvent, index: number) => {
        if (isDrawingWalls.value || currentLayerIndex.value === 1) return;
        if (event.button !== 0) return;
        isWallSelected.value = false;
        takeSnapshot();
        draggingRack.value = index;

        if (event.ctrlKey || event.metaKey) {
            if (selectedRackIndices.value.includes(index)) {
                selectedRackIndices.value = selectedRackIndices.value.filter(i => i !== index);
            } else {
                selectedRackIndices.value.push(index);
            }
        } else {
            if (!selectedRackIndices.value.includes(index)) {
                selectedRackIndices.value = [index];
            }
        }

        rackPositionsBeforeDrag.value = racks.value.map(r => ({ x: r.x, y: r.y }));

        lastMousePos.x = event.clientX;
        lastMousePos.y = event.clientY;
    };

    const dragRack = (event: MouseEvent) => {
        const deltaX = (event.clientX - lastMousePos.x) / zoomLevel.value;
        const deltaY = (event.clientY - lastMousePos.y) / zoomLevel.value;

        selectedRackIndices.value.forEach(index => {
            const rack = racks.value[index] as Rack;
            const initialPos = rackPositionsBeforeDrag.value[index];
            if (!rack || !initialPos) return;

            const rawX = initialPos.x + deltaX;
            const rawY = initialPos.y + deltaY;

            const snapX = Math.round(rawX / 20) * 20;
            const snapY = Math.round(rawY / 20) * 20;

            if (walls.value.length > 2) {
                const { isPointInPolygon } = useRoomBuilderGeometry();
                if (isPointInPolygon(snapX + rackWidth / 2, snapY + rackHeight / 2, walls.value)) {
                    rack.x = snapX;
                    rack.y = snapY;
                }
            } else {
                rack.x = snapX;
                rack.y = snapY;
            }
        });
    };

    const rotateRack = (event: MouseEvent) => {
        const rack = racks.value[rotatingRack.value!];
        const centerX = (rack?.x ?? 0) + (rackWidth ?? 0) / 2 + panOffset.value.x;
        const centerY = (rack?.y ?? 0) + (rackHeight ?? 0) / 2 + panOffset.value.y;

        const currentAngle = Math.atan2(event.clientY / zoomLevel.value - centerY, event.clientX / zoomLevel.value - centerX);
        const deltaAngle = (currentAngle - startRotationAngle.value) * (180 / Math.PI);

        const rawRotation = (initialRackRotation.value + deltaAngle) % 360;
        rack!.rotation = Math.round(rawRotation / 45) * 45;
    }

    const resetRackState = () => {
        draggingRack.value = null;
        rotatingRack.value = null;
        rackPositionsBeforeDrag.value = [];
    }

    return {
        racks,
        selectedRackIndices,
        rotatingRack,
        panOffset,
        startRotationAngle,
        initialRackRotation,
        draggingRack,
        rackPositionsBeforeDrag,
        lastMousePos,

        createRack,
        startDragRack,
        dragRack,
        duplicateRack,
        copyRack,
        pastRack,
        updateRackName,
        updateRackRotation,
        startRotateRack,
        rotateRack,
        removeRack,
        resetRackState
    };
}