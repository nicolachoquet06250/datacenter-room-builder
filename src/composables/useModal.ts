import {ref} from "vue";

interface ModalConfig {
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
}

const showModal = ref(false);
const modalConfig = ref<ModalConfig>({
    title: 'Supprimer',
    message: 'Voulez-vous vraiment effectuer cette suppression ?',
    confirmText: 'Supprimer',
    onConfirm: () => {}
});

export const useModal = () => {
    const triggerConfirm = (config: Partial<ModalConfig> & { onConfirm: () => void }) => {
        modalConfig.value = {
            title: config.title || 'Supprimer',
            message: config.message || 'Voulez-vous vraiment effectuer cette suppression ?',
            confirmText: config.confirmText || 'Supprimer',
            onConfirm: () => {
                config.onConfirm();
                showModal.value = false;
            }
        };
        showModal.value = true;
    }

    const cancelModal = () => {
        showModal.value = false
    }

    return {
        showModal,
        modalConfig,
        triggerConfirm,
        cancelModal
    }
}