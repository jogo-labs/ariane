import { ArProgressbar } from './progressbar.js';
import { defineComponent } from '../../internal/define-component.js';

defineComponent('ar-progressbar', ArProgressbar);

declare global {
    interface HTMLElementTagNameMap {
        'ar-progressbar': ArProgressbar;
    }
}

export { ArProgressbar };
