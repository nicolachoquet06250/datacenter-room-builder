<script lang="ts">
type Props = {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isHtml?: boolean,
  isLoading?: boolean,
  hasFooter?: boolean,
  center?: boolean
}

type Emits = {
  (e: 'confirm'): void,
  (e: 'cancel'): void
}
</script>

<script setup lang="ts">
import {computed, useTemplateRef, watch} from "vue";

const props = withDefaults(
  defineProps<Props>(),
  {
    isHtml: false,
    hasFooter: false,
    isLoading: false
  }
);

const emit = defineEmits<Emits>();

const htmlContent = useTemplateRef<HTMLDivElement|null>('htmlContent');

const message = computed(() => props.isHtml ? `<style>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    z-index: 20;
    overflow-y: auto;

    &.centeed {
        align-items: center;
    }
}

.modal-container {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    max-width: 800px;
    width: 100%;
}

.modal-header h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.modal-body {
  margin-bottom: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  line-height: 1.25rem;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}</style>${props.message}` : props.message);

const confirm = () => {
  emit('confirm');
};

const cancel = () => {
  emit('cancel');
};

const handleHtmlContentClick = (e: MouseEvent) => {
  if ((e.target as HTMLElement)?.parentElement?.tagName === 'BUTTON') {
    if ((e.target as HTMLElement)?.parentElement?.getAttribute('name') === 'cancel') {
      cancel();
    }
  }
}

watch(htmlContent, (htmlContent, oldHtmlContent) => {
  if (htmlContent) {
    htmlContent?.addEventListener('click', handleHtmlContentClick);
  }
  else {
    oldHtmlContent?.removeEventListener('click', handleHtmlContentClick);
  }
});
</script>

<template>
  <Transition name="modal">
    <div v-if="show" :class="['modal-overlay', {centered: center}]" @click.self="cancel">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ title }}</h3>
        </div>

        <div class="modal-body" v-if="isHtml">
          <div v-if="isLoading" class="loader-container modal-body">
            <span class="loader" />
          </div>
          <div class="modal-body" ref="htmlContent" v-else-if="message" v-html="message" />
        </div>

        <div class="modal-body" v-else>
          <p>{{ message }}</p>
        </div>

        <div class="modal-footer" v-if="hasFooter">
          <button class="btn btn-secondary" @click="cancel">
            {{ cancelText || 'Annuler' }}
          </button>
          <button class="btn btn-danger" @click="confirm">
            {{ confirmText || 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  z-index: 20;
  overflow-y: auto;

  &.centered {
    align-items: center;
  }
}

.modal-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  width: 100%;
}

.modal-header h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.modal-body {
  margin-bottom: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  line-height: 1.25rem;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background-color: #c0392b;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.loader-container {
  height: 100%;
  width: 100%;
  min-height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loader {
  width: 48px;
  height: 48px;
  border: 5px solid #FFF;
  border-bottom-color: #FF3D00;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
