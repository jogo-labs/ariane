import { ArStepper } from './stepper.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-stepper', ArStepper);

declare global {
    interface HTMLElementTagNameMap {
        'ar-stepper': ArStepper;
    }
}

export { ArStepper };
