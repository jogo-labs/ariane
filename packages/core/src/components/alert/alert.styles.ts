import { css } from 'lit';

export default css`
    :host {
        display: flex;
        box-sizing: border-box;
        align-items: center;
        opacity: 1;
        transform: scale(1);
        color: var(--ar-alert-color);
        background-color: var(--ar-alert-bg);
        border-color: var(--ar-alert-border);
    }

    :host([hiding]) {
        transition:
            opacity var(--ar-alert-hide-transition-duration),
            transform var(--ar-alert-hide-transition-duration);
    }

    @media (prefers-reduced-motion: reduce) {
        :host([hiding]),
        [part~='close-button'] {
            transition: none;
        }
    }

    [part~='close-button'] {
        order: 1;
        align-self: flex-start;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        width: var(--ar-alert-close-size, 2rem);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        height: var(--ar-alert-close-size, 2rem);
        padding: 0;
        border: none;
        cursor: pointer;
        transition:
            opacity var(--ar-alert-close-transition-duration),
            background-color var(--ar-alert-close-transition-duration);

        &:focus-visible {
            outline: 2px solid currentColor;
            outline-offset: 2px;
        }
    }

    svg {
        height: 1.25em;
        overflow: visible;
        width: auto;
    }

    [part='icon'] {
        color: var(--ar-alert-icon);
        flex: 0 0 auto;
        display: flex;
        align-items: center;
    }
`;
