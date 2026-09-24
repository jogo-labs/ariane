import { ArDropdownItem } from './dropdown-item.js';

if (!customElements.get('ar-dropdown-item')) {
    customElements.define('ar-dropdown-item', ArDropdownItem);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown-item': ArDropdownItem;
    }
}

export { ArDropdownItem };
