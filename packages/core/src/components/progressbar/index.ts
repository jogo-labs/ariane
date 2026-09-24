import { ArProgressbar } from './progressbar.js';

customElements.define('ar-progressbar', ArProgressbar);

declare global {
    interface HTMLElementTagNameMap {
        'ar-progressbar': ArProgressbar;
    }
}

export { ArProgressbar };
