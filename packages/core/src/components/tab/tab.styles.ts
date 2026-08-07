import { css } from 'lit';

export default css`
    :host {
        display: inline-flex;
        cursor: pointer;
        white-space: nowrap;
        user-select: none;
    }

    [part~='base'] {
        display: flex;
        align-items: center;
        /* a11y-fallback: sans thème, le fond de l'onglet reste transparent par défaut (couleur/fond posés par le thème via ::part()) — le padding est le seul mécanisme séparant visuellement des onglets adjacents ; sans lui les libellés se collent les uns aux autres */
        padding: var(--ar-tab-padding-y, 1rem) var(--ar-tab-padding-x, 1.5rem);
        border-radius: inherit;
        margin-block-start: calc(-1 * var(--ar-tab-group-border-top-width, 0px));
        margin-block-end: calc(-1 * var(--ar-tab-group-border-bottom-width, 0px));
    }

    :host([active]:not([disabled])) {
        cursor: default;
    }

    [part~='base--selected'] {
        /* a11y-fallback: indicateur d'onglet actif indiscernable sans thème (WCAG 2.4.7) */
        box-shadow: var(--ar-tab-active-shadow, inset 0 -2px 0 Highlight);
    }

    :host([disabled]) {
        cursor: not-allowed;
    }

    :host(:focus-visible) {
        outline: 2px solid var(--ar-tab-focus-ring-color, ButtonText);
        outline-offset: var(--ar-tab-focus-ring-offset, -2px);
    }
`;
