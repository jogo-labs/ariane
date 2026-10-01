import { ArCollapse } from './collapse.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-collapse', ArCollapse);

declare global {
    interface HTMLElementTagNameMap {
        'ar-collapse': ArCollapse;
    }
}

export { ArCollapse };
