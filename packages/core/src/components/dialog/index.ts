import { ArDialog } from './dialog.js';

customElements.define('ar-dialog', ArDialog);

declare global {
    interface HTMLElementTagNameMap {
        'ar-dialog': ArDialog;
    }
}

export { ArDialog };
