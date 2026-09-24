import { ArSpinner } from './spinner.js';

if (!customElements.get('ar-spinner')) {
    customElements.define('ar-spinner', ArSpinner);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-spinner': ArSpinner;
    }
}

export { ArSpinner };
