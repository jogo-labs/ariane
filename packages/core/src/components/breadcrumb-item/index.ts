import { ArBreadcrumbItem } from './breadcrumb-item.js';

if (!customElements.get('ar-breadcrumb-item')) {
    customElements.define('ar-breadcrumb-item', ArBreadcrumbItem);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb-item': ArBreadcrumbItem;
    }
}

export { ArBreadcrumbItem };
