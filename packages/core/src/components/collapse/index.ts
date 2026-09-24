import { ArCollapse } from './collapse.js';

if (!customElements.get('ar-collapse')) {
    customElements.define('ar-collapse', ArCollapse);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-collapse': ArCollapse;
    }
}

export { ArCollapse };
