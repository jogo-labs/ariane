import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    [part='panel'] {
        position: absolute;
        inset: 0 auto auto 0;
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
        animation: arDropdownShow 0.2s ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='panel']:popover-open {
            animation: none;
        }
    }

    @keyframes arDropdownShow {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;
