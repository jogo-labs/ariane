import { ArDropdown } from './dropdown.js';

customElements.define('ar-dropdown', ArDropdown);

declare global {
    interface HTMLElementTagNameMap {
        'ar-dropdown': ArDropdown;
    }
}

export { ArDropdown };
