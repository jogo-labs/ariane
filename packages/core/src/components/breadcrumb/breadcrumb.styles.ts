import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    /* ── Dark theme ──────────────────────────────────────────── */

    :host([dark]) .breadcrumb-desktop .breadcrumb-text,
    :host([dark]) .breadcrumb-desktop .breadcrumb-link,
    :host([dark]) .breadcrumb-desktop .breadcrumb-link:visited {
        --mr--color-text-color: #fff;
        --mr--text-color-default: #fff;
        color: var(--mr--color-text-color, var(--mr--text-color-default));
    }

    :host([dark]) .breadcrumb-desktop .breadcrumb-item:before {
        background-color: var(--mr--color-text-color, #fff);
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
        color: var(--mr--color-text-color);
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
        color: #171717;
        font-weight: 700;
    }

    .high-contrast .breadcrumb-item.active {
        color: #000;
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
        background-color: #b5b8c5;
        height: 65%;
        width: 1px;
        transform: rotate(15deg);
        transform-origin: center;
    }

    .high-contrast .breadcrumb-desktop .breadcrumb-item + .breadcrumb-item:before {
        background-color: #2e2e31;
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
        background-color: #cdcfd8;
        margin: 0 0.75rem;
        flex-shrink: 0;
        box-shadow: 0 0 0 2px #fff;
    }

    .high-contrast .breadcrumb-mobile .breadcrumb-item:before {
        background-color: #888b99;
    }

    .breadcrumb-mobile .breadcrumb-item:first-child:before,
    .breadcrumb-mobile .breadcrumb-item:last-child:before {
        width: 0.625rem;
        height: 0.625rem;
        margin: 0 0.625rem;
    }

    .breadcrumb-mobile .breadcrumb-item:last-child:before {
        background-color: var(--mr--color-primary);
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
        background-image: linear-gradient(#e6e7ec 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 4px;
        background-repeat: repeat-y;
    }

    .high-contrast .breadcrumb-mobile:before {
        background-image: linear-gradient(#b5b8c5 25%, transparent 0);
    }
`;
