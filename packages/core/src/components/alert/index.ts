import { ArAlert } from './alert.js';

if (!customElements.get('ar-alert')) {
    customElements.define('ar-alert', ArAlert);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-alert': ArAlert;
    }
}

export { ArAlert };
