import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    /* ── Nav / item ──────────────────────────────────────────── */

    [part~='nav'] {
        padding-inline-end: 0.25rem;
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

    [part~='list'] {
        margin: 0;
        padding: 0;
    }

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
        inset-inline-start: 0;
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

    /* ── Boutons home/trigger mobile (découplés de button.styles.ts) ────── */

    [part='home'],
    [part='trigger'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        border: none;
        cursor: pointer;
        background-color: var(--ar-breadcrumb-toggle-bg);
        transition: background-color var(--ar-breadcrumb-toggle-transition-duration);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-height: var(--ar-breadcrumb-toggle-min-size, 2.5rem);
    }

    svg {
        height: 1.25em;
        overflow: visible;
        width: auto;
    }

    /* Ordre volontaire : :focus-visible avant :hover avant :active, à spécificité égale, pour
       qu'un état combiné (ex. clic — hover + focus simultanés) retienne toujours le fond de
       l'état le plus fort visuellement plutôt qu'un fond issu d'une autre origine de valeur qui
       pourrait entrer en collision avec la couleur pilotée par :hover (cf. #157). */

    [part='home']:focus-visible,
    [part='trigger']:focus-visible {
        background-color: var(--ar-breadcrumb-toggle-bg-focus);
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }

    [part='home']:hover,
    [part='trigger']:hover {
        background-color: var(--ar-breadcrumb-toggle-bg-hover);
    }

    [part='home']:active,
    [part='trigger']:active {
        background-color: var(--ar-breadcrumb-toggle-bg-pressed);
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
`;
