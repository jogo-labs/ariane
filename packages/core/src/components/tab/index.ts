import { ArTab } from './tab.js';

customElements.define('ar-tab', ArTab);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab': ArTab;
    }
}

export { ArTab };
