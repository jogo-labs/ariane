import { ArCollapse } from './collapse.js';

customElements.define('ar-collapse', ArCollapse);

declare global {
    interface HTMLElementTagNameMap {
        'ar-collapse': ArCollapse;
    }
}

export { ArCollapse };
