import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    [part='panel'] {
        /* Overrides composant — chaînent vers les tokens shared --ar-panel-* */
        background-color: var(--ar-dropdown-bg, Canvas);
        border-color: var(--ar-dropdown-border-color, ButtonBorder);
    }
`;
