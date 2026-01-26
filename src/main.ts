import { defineCustomElement } from 'vue'
import RoomBuilder from './components/RoomBuilder.vue'

const RoomBuilderElement = defineCustomElement(RoomBuilder)

customElements.define('room-builder', RoomBuilderElement)