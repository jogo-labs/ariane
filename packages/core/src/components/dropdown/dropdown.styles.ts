import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    [part='panel'] {
        /* Overrides composant — chaînent vers les tokens shared --ar-panel-* */
        background-color: var(--ar-dropdown-bg);
        color: var(--ar-dropdown-color);
        border-color: var(--ar-dropdown-border-color);
        border-radius: var(--ar-dropdown-border-radius);
        box-shadow: var(--ar-dropdown-shadow);
        padding: var(--ar-dropdown-padding);
        min-width: var(--ar-dropdown-min-width);
        max-width: var(--ar-dropdown-max-width);
    }
`;
