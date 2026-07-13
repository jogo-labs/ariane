import { ArTabGroup } from './tab-group.js';

customElements.define('ar-tab-group', ArTabGroup);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-group': ArTabGroup;
    }
}

export { ArTabGroup };
