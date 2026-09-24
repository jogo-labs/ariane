import { ArCharcounter } from './charcounter.js';

if (!customElements.get('ar-charcounter')) {
    customElements.define('ar-charcounter', ArCharcounter);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-charcounter': ArCharcounter;
    }
}

export { ArCharcounter };
