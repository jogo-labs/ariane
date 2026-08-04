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
    [part='link'],
    [part='current'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 0.125rem;
        padding: 0 0.75rem;
        text-decoration: none;
        /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
        min-height: var(--ar-pagination-btn-size, 2.5rem);
        transition:
            background-color 0.15s,
            color 0.15s,
            border-color 0.15s;
    }

    [part~='prev'],
    [part~='next'],
    [part~='ellipsis'],
    [part~='current'],
    [part~='link'] {
        aspect-ratio: 1/1;
        padding: 0;
        /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
        min-width: var(--ar-pagination-btn-size, 2.5rem);
    }

    svg {
        height: 1.25em;
        overflow: visible;
        width: auto;
    }

    [part~='prev']:focus-visible,
    [part~='next']:focus-visible,
    [part='link']:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }

    [part~='nav-btn--disabled'] {
        cursor: not-allowed;
    }

    [part='ellipsis'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 0.125rem;
    }

    @media screen and (max-width: 640px) {
        [part~='item']:nth-child(n + 3):nth-last-child(n + 3):not([part~='item--current']):not(
                [aria-hidden='true']
            ) {
            display: none;
        }
    }
`;
