import { ArTooltip } from './tooltip.js';

customElements.define('ar-tooltip', ArTooltip);

declare global {
    interface HTMLElementTagNameMap {
        'ar-tooltip': ArTooltip;
    }
}

export { ArTooltip };
