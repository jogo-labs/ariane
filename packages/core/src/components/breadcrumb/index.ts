import { ArBreadcrumb } from './breadcrumb.js';

if (!customElements.get('ar-breadcrumb')) {
    customElements.define('ar-breadcrumb', ArBreadcrumb);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb': ArBreadcrumb;
    }
}

export { ArBreadcrumb };
