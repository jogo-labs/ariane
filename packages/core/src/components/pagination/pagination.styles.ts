import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    [part='list'] {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        padding-left: 0;
        margin-bottom: 0;
        list-style: none;
    }

    [part~='item'] {
        display: flex;
        align-items: center;
    }

    [part~='prev'],
    [part~='next'],
    [part~='link'],
    [part~='current'],
    [part~='ellipsis'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
        min-height: var(--ar-pagination-btn-size, 2.5rem);
        /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
        min-width: var(--ar-pagination-btn-size, 2.5rem);
    }

    [part~='prev'],
    [part~='next'],
    [part~='link'] {
        text-decoration: none;
        transition:
            background-color var(--ar-pagination-transition-duration),
            color var(--ar-pagination-transition-duration);

        &:focus-visible {
            outline: 2px solid currentColor;
            outline-offset: 2px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        [part~='prev'],
        [part~='next'],
        [part~='link'] {
            transition: none;
        }
    }

    svg {
        height: 1.25em;
        overflow: visible;
        width: auto;
    }

    [part~='nav-btn--disabled'] {
        cursor: not-allowed;
    }

    @media screen and (max-width: 640px) {
        [part~='item']:nth-child(n + 3):nth-last-child(n + 3):not([part~='item--current']):not(
                [aria-hidden='true']
            ) {
            display: none;
        }
    }
`;
