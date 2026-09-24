import { ArProgressbar } from './progressbar.js';

if (!customElements.get('ar-progressbar')) {
    customElements.define('ar-progressbar', ArProgressbar);
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-progressbar': ArProgressbar;
    }
}

export { ArProgressbar };
