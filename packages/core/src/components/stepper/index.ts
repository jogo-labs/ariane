import { ArStepper } from './stepper.js';

customElements.define('ar-stepper', ArStepper);

declare global {
    interface HTMLElementTagNameMap {
        'ar-stepper': ArStepper;
    }
}

export { ArStepper };
