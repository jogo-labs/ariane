import { css } from 'lit';

export default css`
    :host {
        display: inline-flex;
        cursor: pointer;
        white-space: nowrap;
        user-select: none;
        border-radius: var(--ar-tab-border-radius);
        font-weight: var(--ar-tab-font-weight);
    }

    [part='base'] {
        display: flex;
        align-items: center;
        color: var(--ar-tab-color);
        background: var(--ar-tab-bg);
        /* a11y-fallback: sans thème, --ar-tab-bg reste transparent même par défaut — le padding est le seul mécanisme séparant visuellement des onglets adjacents ; sans lui les libellés se collent les uns aux autres */
        padding: var(--ar-tab-padding-y, 1rem) var(--ar-tab-padding-x, 1.5rem);
        border-radius: inherit;
        margin-block-start: calc(-1 * var(--ar-tab-group-border-top-width, 0px));
        margin-block-end: calc(-1 * var(--ar-tab-group-border-bottom-width, 0px));
    }

    :host(:hover:not([disabled]):not([aria-selected='true'])) [part='base'] {
        color: var(--ar-tab-hover-color);
        background: var(--ar-tab-hover-bg);
    }

    :host([aria-selected='true']) [part='base'] {
        color: var(--ar-tab-active-color);
        background: var(--ar-tab-active-bg);
        /* a11y-fallback: indicateur d'onglet actif indiscernable sans thème (WCAG 2.4.7) */
        box-shadow: var(--ar-tab-active-shadow, inset 0 -2px 0 Highlight);
    }

    :host([disabled]) {
        cursor: not-allowed;
        opacity: var(--ar-tab-disabled-opacity);
    }

    :host([aria-selected='true']:not([disabled])) {
        cursor: default;
    }

    :host(:focus-visible) {
        outline: 2px solid var(--ar-focus-ring-color, ButtonText);
        outline-offset: var(--ar-tab-focus-ring-offset);
    }
`;
