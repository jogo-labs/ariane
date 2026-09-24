import { ArAlert } from './alert.js';

customElements.define('ar-alert', ArAlert);

declare global {
    interface HTMLElementTagNameMap {
        'ar-alert': ArAlert;
    }
}

export { ArAlert };
