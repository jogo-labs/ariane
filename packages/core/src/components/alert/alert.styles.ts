import { css } from 'lit';

export default css`
    :host {
        display: flex;
        box-sizing: border-box;
        column-gap: 0.75rem;
        position: relative;
        align-items: center;
        border-style: solid;
        opacity: 1;
        transform: scale(1);
        padding: 1rem;
        border-radius: 0.75rem;
        color: var(--ar-color-text, #2e2e31);
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
        transition: opacity, transform;
        transition-duration: 0.33s;
    }

    .alert-button,
    .icon {
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
    }

    .close {
        color: var(--ar-color-text, #2e2e31);
        position: static;
        -webkit-box-ordinal-group: 2;
        -ms-flex-order: 1;
        order: 1;
        -ms-flex-item-align: start;
        align-self: flex-start;
        -ms-flex-negative: 0;
        flex-shrink: 0;
        color: inherit;
        width: 2rem;
        height: 2rem;
        padding: 0;

        .icon {
            display: block;
            margin: 0;
        }

        &:focus,
        &:hover {
            color: var(--ar-color-text, #2e2e31);
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

    .text-link,
    a:not(.btn) {
        color: currentColor;
        text-decoration: underline;
        font-weight: 700;
    }

    .alert-title + .alert-content {
        margin-top: 0.125rem;
    }
`;
