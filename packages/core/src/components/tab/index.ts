import { ArTab } from './tab.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-tab', ArTab);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab': ArTab;
    }
}

export { ArTab };
