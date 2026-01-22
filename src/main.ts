import { defineCustomElement } from 'vue'
import RoomBuilder from './components/RoomBuilder.vue'

const RoomBuilderElement = defineCustomElement(RoomBuilder)

customElements.define('room-builder', RoomBuilderElement)

window.addEventListener('DOMContentLoaded', () => {
    document.querySelector('room-builder')?.addEventListener('saved', event => {
        console.log('Room saved:', event.detail[0])
    })
})