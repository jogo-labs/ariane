import { ArCharcounter } from './charcounter.js';

customElements.define('ar-charcounter', ArCharcounter);

declare global {
    interface HTMLElementTagNameMap {
        'ar-charcounter': ArCharcounter;
    }
}

export { ArCharcounter };
