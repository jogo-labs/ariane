import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    /* ── Nav / item ──────────────────────────────────────────── */

    [part='nav'] {
        padding-right: 0.25rem;
    }

    [part='item'] {
        display: flex;
        align-items: center;
    }

    [part='link'],
    [part='current'] {
        display: inline-flex;
        align-items: center;
        color: inherit;
        background-color: inherit;
    }

    /* ── Layout desktop ──────────────────────────────────────── */

    [part~='list--desktop'] {
        display: flex;
        flex-flow: row wrap;
    }

    [part='separator'] {
        display: inline-block;
        flex-shrink: 0;
        margin: 0.125rem 0.5rem 0;
        height: 65%;
        width: 1px;
        transform: rotate(15deg);
        transform-origin: center;
    }

    /* ── Layout mobile ───────────────────────────────────────── */

    [part~='list--mobile'] {
        display: flex;
        flex-direction: column;
        position: relative;
    }

    [part~='list--mobile']:before {
        content: '';
        display: block;
        position: absolute;
        width: 1.875rem;
        top: 1.5rem;
        bottom: 1.5rem;
        left: 0;
        background-image: linear-gradient(
            var(--ar-breadcrumb-mobile-separator-color) 25%,
            transparent 0
        );
        background-size: 2px 8px;
        background-position: center 4px;
        background-repeat: repeat-y;
    }

    [part~='bullet'] {
        flex-shrink: 0;
        width: 0.375rem;
        height: 0.375rem;
        margin: 0 0.75rem;
    }

    [part~='bullet--current'] {
        width: 0.625rem;
        height: 0.625rem;
        margin: 0 0.625rem;
    }

    [part~='list--mobile'] [part='link'],
    [part~='list--mobile'] [part='current'] {
        flex-grow: 1;
        padding: 0.5rem 0.25rem;
    }

    /* ── Wrapper dropdown mobile ────────────────────────────── */

    .dropdown {
        display: inline-flex;
        position: relative;
    }

    /* ── Panel flottant mobile ───────────────────────────────── */

    [part='panel'] {
        background-color: var(--ar-breadcrumb-panel-bg, Canvas);
        border-color: var(--ar-breadcrumb-panel-border-color, ButtonBorder);
    }

    /* ── Boutons home/trigger mobile (découplés de button.styles.ts) ────── */

    [part='home'],
    [part='trigger'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        cursor: pointer;
        background-color: var(--ar-breadcrumb-toggle-bg);
        transition: background-color var(--ar-breadcrumb-toggle-transition-duration);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-height: var(--ar-breadcrumb-toggle-min-size, 2.5rem);
    }

    [part='home']:hover,
    [part='trigger']:hover {
        background-color: var(--ar-breadcrumb-toggle-bg-hover);
    }

    [part='home']:active,
    [part='trigger']:active {
        background-color: var(--ar-breadcrumb-toggle-bg-pressed);
    }

    [part='home']:focus,
    [part='trigger']:focus {
        background-color: var(--ar-breadcrumb-toggle-bg-focus);
    }

    [part='home']:focus-visible,
    [part='trigger']:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='home'],
        [part='trigger'] {
            transition: none;
        }
    }

    [part='trigger'] {
        padding: 0;
        aspect-ratio: 1 / 1;
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-width: var(--ar-breadcrumb-toggle-min-size, 2.5rem);
    }

    [part='home'] .icon,
    [part='trigger'] .icon {
        flex-shrink: 0;
    }

    [part='home'] .icon:first-child {
        margin-right: 0.375rem;
    }
`;
