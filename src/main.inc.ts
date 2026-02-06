import { defineCustomElement } from 'vue'
import RoomBuilder from './components/RoomBuilder.vue'
import dataJson from './assets/data.json';

const RoomBuilderElement = defineCustomElement(RoomBuilder)

customElements.define('room-builder', RoomBuilderElement)

window.addEventListener('DOMContentLoaded', () => {
    const roomBuilder = document.createElement('room-builder');
    roomBuilder.setAttribute('room-id', '1')
    roomBuilder.setAttribute('room-name', 'Salle principale')


    // @ts-ignore
    document.body.appendChild(roomBuilder);

    roomBuilder.setAttribute('layers', JSON.stringify(dataJson))

    document.querySelector('room-builder')?.addEventListener('saved', event => {
        console.log('Room saved:', event.detail[0])
    })
})