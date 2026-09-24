import { ArTabPanel } from './tab-panel.js';

if (!customElements.get('ar-tab-panel')) {
    customElements.define('ar-tab-panel', ArTabPanel);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-panel': ArTabPanel;
    }
}

export { ArTabPanel };
