import { ArStepper } from './stepper.js';

if (!customElements.get('ar-stepper')) {
    customElements.define('ar-stepper', ArStepper);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-stepper': ArStepper;
    }
}

export { ArStepper };
