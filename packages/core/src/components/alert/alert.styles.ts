import { css } from 'lit';

export default css`
    :host {
        display: flex;
        box-sizing: border-box;
        column-gap: 0.75rem;
        position: relative;
        align-items: center;
        opacity: 1;
        transform: scale(1);
        color: var(--ar-color-text, #2e2e31);
        padding: var(--ar-alert-padding, 1rem);
        border-radius: var(--ar-alert-border-radius, 0.75rem);
        border-width: var(--ar-alert-border-width, 1px);
        border-style: var(--ar-alert-border-style, solid);
    }

    :host([variant='info']) {
        background-color: var(--ar-alert-info-bg, var(--ar-color-info-bg));
        border-color: var(--ar-alert-info-border, var(--ar-color-info-bg));

        [part='icon'] {
            color: var(--ar-alert-info-icon, var(--ar-color-info-text));
        }
    }

    :host([variant='error']) {
        background-color: var(--ar-alert-error-bg, var(--ar-color-danger-bg));
        border-color: var(--ar-alert-error-border, var(--ar-color-danger-bg));

        [part='icon'] {
            color: var(--ar-alert-error-icon, var(--ar-color-danger-text));
        }
    }

    :host([variant='warning']) {
        background-color: var(--ar-alert-warning-bg, var(--ar-color-warning-bg));
        border-color: var(--ar-alert-warning-border, var(--ar-color-warning-bg));

        [part='icon'] {
            color: var(--ar-alert-warning-icon, var(--ar-color-warning-text));
        }
    }

    :host([variant='success']) {
        background-color: var(--ar-alert-success-bg, var(--ar-color-success-bg));
        border-color: var(--ar-alert-success-border, var(--ar-color-success-bg));

        [part='icon'] {
            color: var(--ar-alert-success-icon, var(--ar-color-success-text));
        }
    }

    :host([hiding]) {
        opacity: 0;
        transform: scale(0.75);
        transition:
            opacity 0.33s,
            transform 0.33s;
    }

    @media (prefers-reduced-motion: reduce) {
        :host([hiding]),
        [part='close'] {
            transition: none;
        }
    }

    [part='close'] {
        order: 1;
        align-self: flex-start;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--ar-alert-close-size, 2rem);
        height: var(--ar-alert-close-size, 2rem);
        padding: 0;
        border: none;
        border-radius: 7px;
        background-color: var(
            --ar-alert-close-bg,
            color-mix(in srgb, currentColor 8%, transparent)
        );
        color: currentColor;
        cursor: pointer;
        opacity: 0.75;
        transition:
            opacity 0.15s,
            background-color 0.15s;
        position: relative;
        top: -0.2rem;
        right: -0.2rem;

        &:hover {
            opacity: 1;
            background-color: var(
                --ar-alert-close-hover-bg,
                color-mix(in srgb, currentColor 20%, transparent)
            );
        }

        &:focus-visible {
            opacity: 1;
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
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        font-size: 1.5em;
    }
`;
