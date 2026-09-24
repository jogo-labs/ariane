import { ArDialog } from './dialog.js';

if (!customElements.get('ar-dialog')) {
    customElements.define('ar-dialog', ArDialog);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-dialog': ArDialog;
    }
}

export { ArDialog };
