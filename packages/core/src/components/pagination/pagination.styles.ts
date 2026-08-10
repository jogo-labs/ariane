import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    [part='list'] {
        display: flex;
        flex-wrap: nowrap;
        justify-content: center;
        padding-inline-start: 0;
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
    [part~='select'],
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
    }

    [part~='prev'],
    [part~='next'],
    [part~='link'],
    [part~='select'] {
        transition:
            background-color var(--ar-pagination-transition-duration),
            color var(--ar-pagination-transition-duration);
    }

    [part~='select'] {
        appearance: none;
        border: none;
        cursor: pointer;
    }

    [part~='prev'],
    [part~='next'],
    [part~='link'],
    [part~='current'],
    [part~='select'] {
        &:focus-visible {
            outline: 2px solid currentColor;
            outline-offset: 2px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        [part~='prev'],
        [part~='next'],
        [part~='link'],
        [part~='select'] {
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
`;
