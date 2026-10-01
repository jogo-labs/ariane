import { ArDropdown } from './dropdown.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-dropdown', ArDropdown);

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown': ArDropdown;
    }
}

export { ArDropdown };
