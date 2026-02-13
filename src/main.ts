import { defineCustomElement } from 'vue'
import RoomBuilder from './components/RoomBuilder.vue'
import {useNotify} from "./composables/useNotify.ts";

const RoomBuilderElement = defineCustomElement(RoomBuilder)

customElements.define('room-builder', RoomBuilderElement)

const {success: _success, error: _error} = useNotify();

export const success = _success;
export const error = _error;

(globalThis as any).RoomBuilder = Object.assign((globalThis as any).RoomBuilder ?? {}, {
    success: _success,
    error: _error,
});