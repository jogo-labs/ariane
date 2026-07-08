import { ArTabPanel } from './tab-panel.js';

customElements.define('ar-tab-panel', ArTabPanel);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-panel': ArTabPanel;
    }
}

export { ArTabPanel };
