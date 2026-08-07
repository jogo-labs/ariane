import { css } from 'lit';

export default css`
    :host {
        display: inline-flex;
        align-items: center;
    }

    [part='button'] {
        display: inline-flex;
        align-items: center;
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        text-align: inherit;
    }

    [part='button']:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
        border-radius: 2px;
    }

    /* ── Indicateur ↑↓ ──────────────────────────────────────────── */

    [part='indicator'] {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        width: var(--ar-table-sort-indicator-size);
        flex-shrink: 0;
    }

    [part='indicator']::before,
    [part='indicator']::after {
        content: '';
        display: block;
        border-left: calc(var(--ar-table-sort-indicator-size) / 2) solid transparent;
        border-right: calc(var(--ar-table-sort-indicator-size) / 2) solid transparent;
    }

    /* caret haut */
    [part='indicator']::before {
        border-bottom: calc(var(--ar-table-sort-indicator-size) / 2 * 1.1) solid
            var(--ar-table-sort-indicator-color);
    }

    /* caret bas */
    [part='indicator']::after {
        border-top: calc(var(--ar-table-sort-indicator-size) / 2 * 1.1) solid
            var(--ar-table-sort-indicator-color);
    }

    /* asc : caret haut actif, caret bas atténué */
    :host([order='asc']) [part='indicator']::before {
        border-bottom-color: var(--ar-table-sort-indicator-active-color);
    }

    :host([order='asc']) [part='indicator']::after {
        opacity: 0.3;
    }

    /* desc : caret bas actif, caret haut atténué */
    :host([order='desc']) [part='indicator']::after {
        border-top-color: var(--ar-table-sort-indicator-active-color);
    }

    :host([order='desc']) [part='indicator']::before {
        opacity: 0.3;
    }

    /* pending : les deux carets atténués */
    :host([pending]) [part='indicator']::before,
    :host([pending]) [part='indicator']::after {
        opacity: 0.4;
        border-bottom-color: var(--ar-table-sort-indicator-pending-color);
        border-top-color: var(--ar-table-sort-indicator-pending-color);
    }
`;
