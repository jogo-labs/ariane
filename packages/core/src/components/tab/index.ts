import { ArTab } from './tab.js';

if (!customElements.get('ar-tab')) {
    customElements.define('ar-tab', ArTab);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab': ArTab;
    }
}

export { ArTab };
