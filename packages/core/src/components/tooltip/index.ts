import { ArTooltip } from './tooltip.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-tooltip', ArTooltip);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tooltip': ArTooltip;
    }
}

export { ArTooltip };
