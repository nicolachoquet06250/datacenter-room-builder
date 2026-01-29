import { type Ref } from 'vue';
import {useDrawRoomWalls} from "./useDrawRoomWalls.ts";
import {useRacksCrud} from "./useRacksCrud.ts";

export const useWalls = (roomId: number, selectedPillarIndices: Ref<number[]>) => {
    const {isWallSelected} = useDrawRoomWalls();
    const {selectedRackIndices} = useRacksCrud(roomId);

    const selectWall = () => {
        isWallSelected.value = true;
        selectedRackIndices.value = [];
        selectedPillarIndices.value = [];
    };

    return {selectWall}
}