import { ArDropdownItem } from './dropdown-item.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-dropdown-item', ArDropdownItem);

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown-item': ArDropdownItem;
    }
}

export { ArDropdownItem };
