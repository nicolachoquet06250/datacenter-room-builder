import {ref} from "vue";

const showClearModal = ref(false);
const clearModalConfig = ref({
    title: 'Supprimer la pièce',
    message: 'Voulez-vous vraiment supprimer la pièce ainsi que tous les racks et pods à l\'intérieur ?',
    confirmText: 'Supprimer',
    onConfirm: () => {}
});

export const useModal = (confirm: () => void) => {
    const triggerClearWalls = () => {
        clearModalConfig.value.onConfirm = () => {
            confirm();
            showClearModal.value = false;
        };
        showClearModal.value = true;

    }

    const cancelModal = () => {
        showClearModal.value = false
    }

    return {
        showClearModal,
        clearModalConfig,
        triggerClearWalls,
        cancelModal
    }
}