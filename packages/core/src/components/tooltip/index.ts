import { ArTooltip } from './tooltip.js';

if (!customElements.get('ar-tooltip')) {
    customElements.define('ar-tooltip', ArTooltip);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-tooltip': ArTooltip;
    }
}

export { ArTooltip };
