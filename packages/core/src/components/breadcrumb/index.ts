import { ArBreadcrumb } from './breadcrumb.js';

customElements.define('ar-breadcrumb', ArBreadcrumb);

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb': ArBreadcrumb;
    }
}

export { ArBreadcrumb };
