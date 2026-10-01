import { ArBreadcrumb } from './breadcrumb.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-breadcrumb', ArBreadcrumb);

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb': ArBreadcrumb;
    }
}

export { ArBreadcrumb };
