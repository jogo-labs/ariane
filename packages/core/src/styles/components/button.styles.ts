import { css } from 'lit';

export default css`
    .btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 var(--ar-button-padding-x);
        min-height: var(--ar-button-height);
        border-color: transparent;
        border-radius: var(--ar-button-border-radius-pill);
        text-decoration: none;
        border: 1px solid transparent;
        font-size: var(--ar-font-size-md);
        line-height: 1;
        font-weight: 500;
    }

    .btn .icon {
        flex-shrink: 0;
    }

    .btn:where(:not(.btn-ratio-square)) .icon:where(:first-child) {
        margin-right: 0.375rem;
    }

    .btn:where(:not(.btn-ratio-square)) .icon:where(:last-child) {
        margin-left: 0.5rem;
    }

    .btn .btn-content + [class*='icon-chevron'] {
        margin-left: 0.25rem;
        margin-right: -0.125rem;
    }

    .btn:not(:disabled):not(.disabled):not([aria-disabled='true']):active {
        border-color: transparent;
    }

    .btn:not(:disabled):not(.disabled):not([aria-disabled='true']):active:focus {
        box-shadow: none;
    }

    .btn[aria-disabled='true'],
    .btn[aria-disabled='true']:hover {
        font-style: italic;
        background-color: var(--ar-button-disabled-bg) !important;
        border-color: var(--ar-button-disabled-border) !important;
        color: var(--ar-button-disabled-color) !important;
        box-shadow: none;
        cursor: not-allowed;
    }

    .btn[aria-disabled='true'] .icon,
    .btn[aria-disabled='true']:hover .icon {
        color: var(--ar-button-disabled-icon-color) !important;
    }

    .btn:focus {
        outline: 0;
        box-shadow: none;
        border-color: transparent;
        box-shadow:
            inset 0 0 0 0.125rem var(--ar-button-focus-ring-color),
            inset 0 0 0 0.25rem var(--ar-color-white);
    }

    .btn:focus:before {
        display: block;
    }

    .btn + .btn {
        margin-left: 0.5rem;
    }

    a.btn {
        color: var(--ar-button-link-color);
        background-color: transparent;
    }

    a.btn,
    a.btn:active,
    a.btn:active:focus,
    a.btn:hover {
        text-decoration: none;
    }

    a.btn:active,
    a.btn:hover {
        color: var(--ar-button-link-color);
    }

    .btn-secondary,
    a.btn-secondary {
        background-color: var(--ar-button-secondary-bg);
        color: var(--ar-color-text);
        border-color: var(--ar-color-neutral-40);
    }

    .btn-secondary:focus,
    .btn-secondary:hover,
    a.btn-secondary:focus,
    a.btn-secondary:hover {
        background-color: var(--ar-button-secondary-bg-hover);
        color: var(--ar-color-white);
    }

    .btn-secondary:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    .btn-secondary:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
    a.btn-secondary:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    a.btn-secondary:not(:disabled):not(.disabled):not([aria-disabled='true']):active {
        background-color: var(--ar-color-neutral-30);
        color: var(--ar-color-white);
    }

    .btn-tertiary,
    a.btn-tertiary:not([aria-disabled='true']) {
        background-color: var(--ar-button-tertiary-bg);
        color: var(--ar-color-text);
    }

    .btn-tertiary:hover,
    a.btn-tertiary:not([aria-disabled='true']):hover {
        background-color: var(--ar-button-tertiary-bg-hover);
        color: var(--ar-color-white);
    }

    .btn-tertiary:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    .btn-tertiary:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
    a.btn-tertiary:not([aria-disabled='true']):not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ).active,
    a.btn-tertiary:not([aria-disabled='true']):not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ):active {
        background-color: var(--ar-button-tertiary-bg-active);
        border-color: var(--ar-button-tertiary-bg-active);
        box-shadow: inset var(--ar-button-tertiary-active-shadow);
        color: var(--ar-color-white);
    }

    .btn-tertiary:focus,
    a.btn-tertiary:not([aria-disabled='true']):focus {
        background-color: var(--ar-button-tertiary-bg-focus);
        border-color: var(--ar-button-tertiary-bg-focus);
        color: var(--ar-color-text);
    }

    .btn-ratio-square {
        padding: 0;
        justify-content: center;
        aspect-ratio: 1/1;
        min-width: var(--ar-button-ratio-square-width);
    }

    .btn-block {
        display: flex;
    }
`;
