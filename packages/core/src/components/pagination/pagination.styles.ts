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

    [part='prev'],
    [part='next'],
    [part='link'],
    [part='current'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 0.125rem;
        padding: 0 0.75rem;
        border: 1px solid transparent;
        text-decoration: none;
        /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
        min-height: var(--ar-pagination-btn-size, 2.5rem);
        transition:
            background-color 0.15s,
            color 0.15s,
            border-color 0.15s;
    }

    [part='prev'],
    [part='next'] {
        aspect-ratio: 1/1;
        padding: 0;
        /* a11y-fallback: WCAG 2.5.8 taille de cible minimale */
        min-width: var(--ar-pagination-btn-size, 2.5rem);
    }

    [part='prev']:focus-visible,
    [part='next']:focus-visible,
    [part='link']:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
    }

    [part='prev'][aria-disabled='true'],
    [part='next'][aria-disabled='true'] {
        opacity: 0.5;
        cursor: not-allowed;
    }

    [part='ellipsis'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0 0.125rem;
        /* a11y-fallback: sans thème chargé, l'ellipse perdrait l'alignement vertical avec les items interactifs adjacents (WCAG 2.5.8) */
        min-height: var(--ar-pagination-btn-size, 2.5rem);
    }

    @media only screen and (max-width: 640px) {
        [part='item']:not([part~='item--current']):not([aria-hidden='true']):not(:first-child):not(
                :last-child
            ):not(:nth-child(2)):not(:nth-last-child(2)) {
            display: none;
        }
    }
`;
