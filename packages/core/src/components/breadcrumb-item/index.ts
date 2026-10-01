import { ArBreadcrumbItem } from './breadcrumb-item.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-breadcrumb-item', ArBreadcrumbItem);

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb-item': ArBreadcrumbItem;
    }
}

export { ArBreadcrumbItem };
