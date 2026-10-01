import { ArDialog } from './dialog.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-dialog', ArDialog);

declare global {
    interface HTMLElementTagNameMap {
        'ar-dialog': ArDialog;
    }
}

export { ArDialog };
