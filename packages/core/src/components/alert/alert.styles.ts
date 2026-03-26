import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
        opacity: 1;
        transform: scale(1);
        color: var(--ar-color-text, #2e2e31);
    }

    :host([hiding]) {
        opacity: 0;
        transform: scale(0.75);
        transition: opacity, transform;
        transition-duration: 0.33s;
    }

    .alert {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-column-gap: 0.75rem;
        -moz-column-gap: 0.75rem;
        column-gap: 0.75rem;
        position: relative;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        border-style: solid;
        border-radius: 0.75rem;
    }

    .alert:has(.alert-body) {
        padding: 1rem;
    }

    .alert .alert-button,
    .alert .icon {
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
    }

    .alert .close {
        color: var(--ar-color-text, #2e2e31);
    }

    .alert .close .icon {
        display: block;
        margin: 0;
    }

    .alert .close:focus,
    .alert .close:hover {
        color: var(--ar-color-text, #2e2e31);
    }

    .alert .icon {
        margin: 0;
        line-height: 1;
    }

    .alert .text-link,
    .alert a:not(.btn) {
        color: currentColor;
        text-decoration: underline;
        font-weight: 700;
    }

    .alert .toast-time {
        margin-top: 0.75rem;
    }

    .alert-icon-container {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -ms-flex-negative: 0;
        flex-shrink: 0;
    }

    .alert-icon-container .icon {
        font-size: 1.5rem;
    }

    .alert-icon-container.has-icon-top {
        -ms-flex-item-align: start;
        align-self: flex-start;
    }

    .alert-icon-container.has-icon-bottom {
        -ms-flex-item-align: end;
        align-self: flex-end;
    }

    .alert-icon-container.has-icon-center {
        -ms-flex-item-align: center;
        align-self: center;
    }

    .alert-body {
        padding: 0;
        -webkit-box-flex: 1;
        -ms-flex-positive: 1;
        flex-grow: 1;
    }

    .alert-content,
    .alert-title {
        margin: 0;
    }

    .alert-title {
        font-family: system-ui, sans-serif;
        font-size: var(--ar-font-size-md, 1rem);
        line-height: 1.5;
        font-weight: 700;
    }

    .alert-title + .alert-content {
        margin-top: 0.125rem;
    }

    .alert-content dl:last-child,
    .alert-content ol:last-child,
    .alert-content p:last-child,
    .alert-content ul:last-child {
        margin-bottom: 0;
    }

    .alert-date {
        display: block;
        font-size: 0.875rem;
        font-style: italic;
        margin-top: 0.5rem;
    }

    .alert-dismissible .close {
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
    }

    .alert-info {
        background-color: var(--ar-alert-info-bg, var(--ar-color-info-bg));
        border-color: var(--ar-alert-info-border, var(--ar-color-info-bg));
    }

    .alert-info .close:focus {
        background: var(--ar-alert-info-border, var(--ar-color-info-bg));
    }

    .alert-info .alert-icon-container {
        color: var(--ar-alert-info-icon, var(--ar-color-info-text));
    }

    .alert-error {
        background-color: var(--ar-alert-error-bg, var(--ar-color-danger-bg));
        border-color: var(--ar-alert-error-border, var(--ar-color-danger-bg));
    }

    .alert-error .alert-icon-container {
        color: var(--ar-alert-error-icon, var(--ar-color-danger-text));
    }

    .alert-warning {
        background-color: var(--ar-alert-warning-bg, var(--ar-color-warning-bg));
        border-color: var(--ar-alert-warning-border, var(--ar-color-warning-bg));
    }

    .alert-warning .alert-icon-container {
        color: var(--ar-alert-warning-icon, var(--ar-color-warning-text));
    }

    .alert-success {
        background-color: var(--ar-alert-success-bg, var(--ar-color-success-bg));
        border-color: var(--ar-alert-success-border, var(--ar-color-success-bg));
    }

    .alert-success .alert-icon-container {
        color: var(--ar-alert-success-icon, var(--ar-color-success-text));
    }
`;
