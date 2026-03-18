import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
        opacity: 1;
        transform: scale(1);
        color: var(--ar--color-text-color, #000, #2e2e31);
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
        color: #2e2e31;
    }

    .alert .close .icon {
        display: block;
        margin: 0;
    }

    .alert .close:focus,
    .alert .close:hover {
        color: #171717;
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
        font-size: var(--ar--font-size-text);
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
        background-color: var(--ar--bg-info, #dfe9ff);
        border-color: var(--ar--border-info);
    }

    .alert-info .close:focus {
        background: var(--ar--border-info, #dfe9ff);
    }

    .alert-info .alert-icon-container {
        color: var(--ar--icon-info, #2c74ff);
    }

    .alert-error {
        background-color: var(--ar--bg-error, #ffeceb);
        border-color: var(--ar--border-error, #ffeceb);
    }

    .alert-error .alert-icon-container {
        color: var(--ar--icon-error, #f04438);
    }

    .alert-warning {
        background-color: var(--ar--bg-warning, #fffaeb);
        border-color: var(--ar--border-warning, #fffaeb);
    }

    .alert-warning .alert-icon-container {
        color: var(--ar--icon-warning, #f79009);
    }

    .alert-success {
        background-color: var(--ar--bg-success, #d9f6e8);
        border-color: var(--ar--border-success, #d9f6e8);
    }

    .alert-success .alert-icon-container {
        color: var(--ar--icon-success, #09aa5f);
    }
`;
