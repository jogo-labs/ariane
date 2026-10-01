import { ArTabPanel } from './tab-panel.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-tab-panel', ArTabPanel);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-panel': ArTabPanel;
    }
}

export { ArTabPanel };
