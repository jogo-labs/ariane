import { ArDropdownItem } from './dropdown-item.js';

customElements.define('ar-dropdown-item', ArDropdownItem);

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown-item': ArDropdownItem;
    }
}

export { ArDropdownItem };
