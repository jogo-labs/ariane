import { ArDropdown } from './dropdown.js';

if (!customElements.get('ar-dropdown')) {
    customElements.define('ar-dropdown', ArDropdown);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown': ArDropdown;
    }
}

export { ArDropdown };
