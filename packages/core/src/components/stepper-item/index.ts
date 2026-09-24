import { ArStepperItem } from './stepper-item.js';

customElements.define('ar-stepper-item', ArStepperItem);

declare global {
    interface HTMLElementTagNameMap {
        'ar-stepper-item': ArStepperItem;
    }
}

export { ArStepperItem };
