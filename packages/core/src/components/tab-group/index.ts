import { ArTabGroup } from './tab-group.js';

if (!customElements.get('ar-tab-group')) {
    customElements.define('ar-tab-group', ArTabGroup);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab-group': ArTabGroup;
    }
}

export { ArTabGroup };
