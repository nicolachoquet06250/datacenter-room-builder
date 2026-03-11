import {computed, type Ref, ref} from "vue";

const specificTooltips: Record<string, Ref<{
    show: boolean,
    content: string;
    loading: boolean;
}>> = {};

const specificTooltipsRefs: Record<string, Ref<HTMLElement | null>> = {}
const specificTooltipsContainers: Record<string, Ref<HTMLElement | null>> = {}

const tooltip = ref<{
    show: boolean;
    x: number;
    y: number;
    timer: number | null;
}>({
    show: false,
    x: 0,
    y: 0,
    timer: null
});

export const clearTooltipTimer = () => {
    if (tooltip.value.timer) {
        clearTimeout(tooltip.value.timer);
        tooltip.value.timer = null;
    }
};

export const useTooltip = () =>
    computed(() => tooltip.value);

const adjustTooltipPosition = (name: string) => {
    if (specificTooltipsRefs[name]!.value) {
        const rect = specificTooltipsRefs[name]!.value.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        if (rect.bottom > viewportHeight) {
            tooltip.value.y = viewportHeight - rect.height - 10;
        }
    }
};

export const useSpecificTooltip = <T extends string|number>(
    name : string,
    loaderFn?: (itemId: T) => Promise<void|never>
) => {
    if (!specificTooltips[name]) {
        specificTooltips[name] = ref<{
            show: boolean,
            content: string;
            loading: boolean;
        }>({
            show: false,
            content: '',
            loading: false
        });
        specificTooltipsRefs[name] = ref<HTMLElement | null>(null);
        specificTooltipsContainers[name] = ref<HTMLElement | null>(null);
    }

    return {
        tooltip: computed(() => specificTooltips[name]!.value),
        ref: specificTooltipsRefs[name]!,
        container: specificTooltipsContainers[name]!,
        adjustTooltipPosition: () => adjustTooltipPosition(name),
        loadTooltip: async (itemId: T) => {
            // Ajustement initial de la position (sera affiné après chargement/rendu)
            setTimeout(() => adjustTooltipPosition(name), 0);

            if (
                specificTooltips[name]!.value.content &&
                specificTooltips[name]!.value.content
                    .includes(`obj_key=${itemId}`)
            ) return false;

            specificTooltips[name]!.value.loading = true;
            specificTooltips[name]!.value.content = '';

            try {
                await loaderFn?.(itemId);
            }
            catch (error) {
                console.error(`Error loading ${name} tooltip:`, error);
                specificTooltips[name]!.value.content = 'Erreur lors du chargement du tooltip';
                setTimeout(() => adjustTooltipPosition(name), 0);
            }
            finally {
                specificTooltips[name]!.value.loading = false;
            }

            return true;
        },
        showTooltip: (x: number, y: number) => {
            tooltip.value.show = true;
            specificTooltips[name]!.value.show = true;
            tooltip.value.x = x;
            tooltip.value.y = y;
        },
        hideTooltip: () => {
            tooltip.value.timer = setTimeout(() => {
                tooltip.value.show = false;
                specificTooltips[name]!.value.show = false;
                specificTooltips[name]!.value.content = '';
                tooltip.value.timer = null;
            }, 300) as unknown as number;
        }
    };
}