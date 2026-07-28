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
        color: var(--ar-alert-color);
    }

    :host([variant='info']) {
        background-color: var(--ar-alert-info-bg);
        border-color: var(--ar-alert-info-border);

        [part='icon'] {
            color: var(--ar-alert-info-icon);
        }
    }

    :host([variant='error']) {
        background-color: var(--ar-alert-error-bg);
        border-color: var(--ar-alert-error-border);

        [part='icon'] {
            color: var(--ar-alert-error-icon);
        }
    }

    :host([variant='warning']) {
        background-color: var(--ar-alert-warning-bg);
        border-color: var(--ar-alert-warning-border);

        [part='icon'] {
            color: var(--ar-alert-warning-icon);
        }
    }

    :host([variant='success']) {
        background-color: var(--ar-alert-success-bg);
        border-color: var(--ar-alert-success-border);

        [part='icon'] {
            color: var(--ar-alert-success-icon);
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
        width: var(--ar-alert-close-size);
        height: var(--ar-alert-close-size);
        padding: 0;
        border: none;
        background-color: var(--ar-alert-close-bg);
        color: currentColor;
        cursor: pointer;
        opacity: 0.75;
        transition:
            opacity var(--ar-alert-close-transition-duration),
            background-color var(--ar-alert-close-transition-duration);
        position: relative;
        top: -0.2rem;
        right: -0.2rem;

        &:hover {
            opacity: 1;
            background-color: var(--ar-alert-close-hover-bg);
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
