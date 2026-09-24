import { ArSpinner } from './spinner.js';

customElements.define('ar-spinner', ArSpinner);

declare global {
    interface HTMLElementTagNameMap {
        'ar-spinner': ArSpinner;
    }
}

export { ArSpinner };
