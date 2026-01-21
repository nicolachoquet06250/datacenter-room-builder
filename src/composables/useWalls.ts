import {useDrawRoomWalls} from "./useDrawRoomWalls.ts";
import {useRacksCrud} from "./useRacksCrud.ts";

export const useWalls = () => {
    const {isWallSelected} = useDrawRoomWalls()
    const {selectedRackIndices} = useRacksCrud();

    const selectWall = () => {
        isWallSelected.value = true;
        selectedRackIndices.value = [];
    };

    return {selectWall}
}