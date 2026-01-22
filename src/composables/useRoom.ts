import {ref, watch} from "vue";

const _roomName = ref('');

export const useRoom = (roomId: number, roomName: string) => {
    watch(() => roomId, async (newId) => {
        if (newId) {
            _roomName.value = roomName;
        }
    });

    return {roomName: _roomName};
}