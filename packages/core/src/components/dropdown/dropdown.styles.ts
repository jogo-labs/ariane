import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    [part='panel'] {
        position: fixed;
        inset: unset;
        box-sizing: border-box;
        min-width: var(--ar-dropdown-min-width, 10rem);
        max-width: var(--ar-dropdown-max-width, none);
        padding: var(--ar-dropdown-padding, 0.25rem);
        background: var(--ar-dropdown-bg, var(--ar-color-bg, #fff));
        border: 1px solid var(--ar-dropdown-border-color, var(--ar-color-border, #e2e2e5));
        border-radius: var(--ar-dropdown-border-radius, 0.375rem);
        box-shadow: var(
            --ar-dropdown-shadow,
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 10px 15px -3px rgba(0, 0, 0, 0.07)
        );
        margin: 0;
        overflow-y: auto;
    }

    [part='panel']:not(:popover-open) {
        display: none;
    }

    [part='panel']:popover-open {
        animation: arDropdownShow 0.12s ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='panel']:popover-open {
            animation: none;
        }
    }

    @keyframes arDropdownShow {
        from {
            opacity: 0;
            transform: scaleY(0.95) translateY(-4px);
            transform-origin: top;
        }
        to {
            opacity: 1;
            transform: scaleY(1) translateY(0);
            transform-origin: top;
        }
    }
`;
