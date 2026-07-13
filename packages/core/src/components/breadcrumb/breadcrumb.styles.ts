import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    /* ── Base ────────────────────────────────────────────────── */

    .breadcrumb-container {
        padding-right: 0.25rem;
    }

    .breadcrumb {
        margin: 0;
        padding: 0;
        border-radius: 0;
        background-color: transparent;
        color: var(--ar-breadcrumb-color);
    }

    .breadcrumb-link {
        text-decoration: underline;
    }

    .breadcrumb-link:hover {
        color: inherit;
    }

    .breadcrumb-text,
    .breadcrumb-link,
    .breadcrumb-link:visited {
        display: inline-flex;
        align-items: center;
        color: inherit;
        background-color: inherit;
        font-weight: 400;
    }

    .breadcrumb-text .icon:first-child,
    .breadcrumb-link .icon:first-child,
    .breadcrumb-link:visited .icon:first-child {
        margin-right: 0.5rem;
    }

    .breadcrumb-item {
        display: flex;
        align-items: center;
    }

    .breadcrumb-item.active {
        color: var(--ar-breadcrumb-color);
        font-weight: 700;
    }

    /* ── Desktop layout ──────────────────────────────────────── */

    .breadcrumb-desktop {
        display: flex;
        flex-flow: row wrap;
    }

    .breadcrumb-desktop .breadcrumb-item + .breadcrumb-item {
        padding: 0;
    }

    .breadcrumb-desktop .breadcrumb-item + .breadcrumb-item:before {
        content: '';
        margin: 0.125rem 0.5rem 0;
        padding: 0;
        background-color: var(--ar-breadcrumb-separator-color);
        height: 65%;
        width: 1px;
        transform: rotate(15deg);
        transform-origin: center;
    }

    /* ── Mobile layout ───────────────────────────────────────── */

    .breadcrumb-mobile {
        flex-direction: column;
        margin: 0;
    }

    .breadcrumb-mobile,
    .breadcrumb-mobile .breadcrumb-item {
        position: relative;
        padding: 0;
    }

    .breadcrumb-mobile .breadcrumb-item:before {
        content: '';
        padding: 0;
        border-radius: 100rem;
        width: 0.375rem;
        height: 0.375rem;
        background-color: var(--ar-breadcrumb-bullet-color);
        margin: 0 0.75rem;
        flex-shrink: 0;
        box-shadow: 0 0 0 2px var(--ar-color-bg);
    }

    .breadcrumb-mobile .breadcrumb-item:first-child:before,
    .breadcrumb-mobile .breadcrumb-item:last-child:before {
        width: 0.625rem;
        height: 0.625rem;
        margin: 0 0.625rem;
    }

    .breadcrumb-mobile .breadcrumb-item:last-child:before {
        background-color: var(--ar-color-interactive);
    }

    .breadcrumb-mobile .breadcrumb-link,
    .breadcrumb-mobile .breadcrumb-text {
        display: flex;
        flex-grow: 1;
        padding: 0.5rem 0.25rem;
    }

    .breadcrumb-mobile:before {
        content: '';
        display: block;
        position: absolute;
        width: 1.875rem;
        top: 1.5rem;
        bottom: 1.5rem;
        left: 0;
        background-image: linear-gradient(var(--ar-color-neutral-90) 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 4px;
        background-repeat: repeat-y;
    }

    /* ── Wrapper dropdown mobile ────────────────────────────── */

    .breadcrumb-dropdown {
        display: inline-flex;
        position: relative;
    }

    /* ── Panel flottant mobile ───────────────────────────────── */

    [part='panel'] {
        min-width: var(--ar-breadcrumb-panel-min-width);
        max-width: var(--ar-breadcrumb-panel-max-width);
    }

    /* ── Boutons trigger/home mobile (tokens scopés au composant) ──────────
     * #mobile-home-btn gagne la cascade par spécificité d'ID. [part='trigger']
     * reçoit .btn + l'attribut pour dépasser .btn-tertiary dans
     * button.styles.ts, indépendamment de l'ordre des styles. */

    #mobile-home-btn,
    [part='trigger'].btn.btn-tertiary {
        background-color: var(--ar-breadcrumb-toggle-bg);
    }

    #mobile-home-btn:hover,
    [part='trigger'].btn.btn-tertiary:hover {
        background-color: var(--ar-breadcrumb-toggle-bg-hover);
    }

    #mobile-home-btn:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
    [part='trigger'].btn.btn-tertiary:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ):active {
        background-color: var(--ar-breadcrumb-toggle-bg-pressed);
    }

    #mobile-home-btn:focus,
    [part='trigger'].btn.btn-tertiary:focus {
        background-color: var(--ar-breadcrumb-toggle-bg-focus);
    }
`;
