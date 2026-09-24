import { ArStepperItem } from './stepper-item.js';

if (!customElements.get('ar-stepper-item')) {
    customElements.define('ar-stepper-item', ArStepperItem);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-stepper-item': ArStepperItem;
    }
}

export { ArStepperItem };
