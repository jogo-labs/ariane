import { css } from 'lit';

/**
 * Styles du composant ArButton.
 * Utiliser des CSS custom properties pour la customisation :
 *   mr-button { --ar-button-bg: hotpink; }
 */
export default css`
    :host {
        display: inline-block;
        box-sizing: border-box;
    }

    /* Désactiver sans JS via l'attribut pour les interactions pointer */
    :host([disabled]) {
        pointer-events: none;
        opacity: 0.5;
        cursor: not-allowed;
    }

    button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4em;
        padding: var(--ar-button-padding-y, 0.5em) var(--ar-button-padding-x, 1.25em);
        font-size: var(--ar-button-font-size, 1rem);
        font-weight: var(--ar-button-font-weight, 500);
        font-family: inherit;
        line-height: 1.2;
        border-radius: var(--ar-button-border-radius, 0.375em);
        border: 1px solid transparent;
        cursor: pointer;
        transition:
            background 0.15s ease,
            color 0.15s ease,
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            opacity 0.15s ease;
        white-space: nowrap;
        user-select: none;
        text-decoration: none;
        appearance: none;
    }

    /* ── Variants ─────────────────────────────────────────────── */

    :host([variant='filled']) button,
    :host(:not([variant])) button {
        background: var(--ar-button-bg, #2563eb);
        color: var(--ar-button-color, #fff);
        border-color: transparent;
    }

    :host([variant='outlined']) button {
        background: transparent;
        color: var(--ar-button-color, #2563eb);
        border-color: var(--ar-button-border-color, #2563eb);
    }

    :host([variant='ghost']) button {
        background: transparent;
        color: var(--ar-button-color, #2563eb);
        border-color: transparent;
    }

    :host([variant='danger']) button {
        background: var(--ar-button-bg, #dc2626);
        color: var(--ar-button-color, #fff);
        border-color: transparent;
    }

    /* ── Tailles ──────────────────────────────────────────────── */

    :host([size='small']) button {
        font-size: var(--ar-button-font-size, 0.875rem);
        padding: var(--ar-button-padding-y, 0.3em) var(--ar-button-padding-x, 0.875em);
    }

    :host([size='large']) button {
        font-size: var(--ar-button-font-size, 1.125rem);
        padding: var(--ar-button-padding-y, 0.7em) var(--ar-button-padding-x, 1.75em);
    }

    /* ── Focus (accessibilité) ────────────────────────────────── */

    button:focus {
        outline: none;
    }

    button:focus-visible {
        outline: 2px solid var(--ar-focus-ring-color, #2563eb);
        outline-offset: 2px;
    }

    /* ── Slots ────────────────────────────────────────────────── */

    .prefix:empty,
    .suffix:empty {
        display: none;
    }
`;
