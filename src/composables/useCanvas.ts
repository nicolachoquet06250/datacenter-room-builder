import {onMounted, type Ref, ref} from "vue";
import BuilderCanvas from "../components/room-builder/BuilderCanvas.vue";

const canvasWidth = ref(800);
const canvasHeight = ref(600);

export const useCanvas = (canvasComponent: Ref<InstanceType<typeof BuilderCanvas> | null>) => {
    const updateCanvasSize = () => {
        const svgElement = canvasComponent.value?.svgRef ?? null;
        if (svgElement) {
            canvasWidth.value = svgElement.clientWidth;
            canvasHeight.value = svgElement.clientHeight;
        }
    };

    onMounted(() => {
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    })

    return {
        canvasWidth,
        canvasHeight,
        updateCanvasSize
    }
}