import { ArBreadcrumbItem } from './breadcrumb-item.js';

customElements.define('ar-breadcrumb-item', ArBreadcrumbItem);

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb-item': ArBreadcrumbItem;
    }
}

export { ArBreadcrumbItem };
