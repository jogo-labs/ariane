import { ArTabGroup } from './tab-group.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-tab-group', ArTabGroup);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-group': ArTabGroup;
    }
}

export { ArTabGroup };
