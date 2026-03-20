import { css } from 'lit';

export default css`
    .btn {
        position: relative;
        display: -webkit-inline-box;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        padding: 0 var(--ar-button-padding-x, 1rem);
        min-height: var(--ar-button-height, 2.5rem);
        border-color: transparent;
        border-radius: var(--ar-button-border-radius-pill, 0.75rem);
        text-decoration: none;
        border: 1px solid transparent;
        font-size: var(--ar-font-size-md, 1rem);
        line-height: 1;
    }

    .btn:not(.btn-link) {
        font-weight: 500;
    }

    .btn .icon,
    .btn ft-icon {
        -ms-flex-negative: 0;
        flex-shrink: 0;
    }

    .btn:where(:not(.btn-ratio-square):not(.close)) .icon:where(:first-child),
    .btn:where(:not(.btn-ratio-square):not(.close)) ft-icon:where(:first-child) {
        margin-right: 0.375rem;
    }

    .btn:where(:not(.btn-ratio-square):not(.close)) .icon:where(:last-child),
    .btn:where(:not(.btn-ratio-square):not(.close)) ft-icon:where(:last-child) {
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
        -webkit-box-shadow: none;
        box-shadow: none;
    }

    .btn[aria-disabled='true'],
    .btn[aria-disabled='true']:hover {
        font-style: italic;
        background-color: var(--ar-color-neutral-100, #e6e7ec) !important;
        border-color: var(--ar-color-neutral-200, #cdcfd8) !important;
        color: #71747f !important;
        -webkit-box-shadow: none;
        box-shadow: none;
        cursor: not-allowed;
    }

    .btn[aria-disabled='true'] .icon,
    .btn[aria-disabled='true']:hover .icon {
        color: #9ea2b3 !important;
    }

    .high-contrast .btn[aria-disabled='true'],
    .high-contrast .btn[aria-disabled='true']:hover {
        color: var(--ar-color-text-base, #2e2e31) !important;
        border-color: #b5b8c5 !important;
    }

    .high-contrast .btn[aria-disabled='true'] .icon,
    .high-contrast .btn[aria-disabled='true']:hover .icon {
        color: #71747f !important;
    }

    .btn:not(.btn-link):not(.btn-reset):focus {
        outline: 0;
        -webkit-box-shadow: none;
        box-shadow: none;
        border-color: transparent;
        -webkit-box-shadow:
            0 0 0 0.125rem var(--ar-color-text-base, #2e2e31) inset,
            0 0 0 0.25rem var(--ar-color-neutral-0, #fff) inset;
        box-shadow:
            inset 0 0 0 0.125rem var(--ar-color-text-base, #2e2e31),
            inset 0 0 0 0.25rem var(--ar-color-neutral-0, #fff);
    }

    .btn.text-white:focus {
        -webkit-box-shadow:
            0 0 0 0.0625rem var(--ar-color-neutral-0, #fff) inset,
            0 0 0 0.25rem transparent inset;
        box-shadow:
            inset 0 0 0 0.0625rem var(--ar-color-neutral-0, #fff),
            inset 0 0 0 0.25rem transparent;
    }

    .btn:focus:before {
        display: block;
    }

    .btn + .btn {
        margin-left: 0.5rem;
    }

    .btn-sort .prefix {
        -webkit-transition: color 0.15s ease-in-out;
        transition: color 0.15s ease-in-out;
    }

    .btn-sort .prefix,
    .btn-sort:focus .prefix,
    .btn-sort:focus:hover .prefix {
        color: var(--ar-color-neutral-600, #5b5d65);
    }

    .btn-sort:active .prefix,
    .btn-sort:hover .prefix {
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-link {
        color: var(--ar-button-link-color, #2458e5);
        text-decoration: none;
        background-color: transparent;
        border: none;
        height: auto;
        min-height: auto;
        padding: 0;
        border-radius: 0;
        vertical-align: baseline;
    }

    .btn-link .btn-content {
        text-decoration: underline;
    }

    .btn-link:hover {
        color: var(--ar-button-link-color, #2458e5);
    }

    .btn-link:active,
    .btn-link:active .btn-content,
    .btn-link:active:focus,
    .btn-link:active:focus .btn-content,
    .btn-link:hover,
    .btn-link:hover .btn-content {
        text-decoration: none;
    }

    .btn-link:active {
        color: var(--ar-button-link-color, #2458e5);
    }

    .btn-link:visited {
        color: var(--ar-button-link-visited, #69408c);
    }

    .btn-link:focus,
    .btn-link:focus:not(:focus-visible) {
        outline: auto;
        -webkit-box-shadow: none;
        box-shadow: none;
        outline-offset: 0.25rem;
    }

    @media (prefers-contrast: more) {
        .btn-link {
            color: var(--ar-button-link-contrast, #1644c0);
        }
    }

    .btn-link.high-contrast,
    .high-contrast .btn-link {
        color: var(--ar-button-link-contrast, #1644c0);
    }

    a.btn {
        color: var(--ar-button-link-color, #2458e5);
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
        color: var(--ar-button-link-color, #2458e5);
    }

    .show > .btn.dropdown-toggle {
        background-color: var(--ar-color-text, #2e2e31);
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-primary,
    a.btn-primary {
        --ar-spinner-stroke: var(--ar-color-neutral-0, #fff);
        background-color: var(--ar-color-interactive, var(--ar-color-primary-500, #283276));
        border-color: var(--ar-color-interactive, var(--ar-color-primary-500, #283276));
        color: var(--ar-color-neutral-0, #fff);
    }

    .high-contrast .btn-group .btn-primary,
    .high-contrast .btn-group a.btn-primary {
        border: 1px solid var(--ar-color-neutral-0, #fff);
    }

    .btn-primary:focus,
    .btn-primary:hover,
    a.btn-primary:focus,
    a.btn-primary:hover {
        background-color: var(--ar-color-interactive-hover, var(--ar-color-primary-600, #1b2256));
        border-color: var(--ar-color-interactive-hover, var(--ar-color-primary-600, #1b2256));
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-primary:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    .btn-primary:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
    a.btn-primary:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    a.btn-primary:not(:disabled):not(.disabled):not([aria-disabled='true']):active {
        background-color: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
        border-color: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-secondary,
    a.btn-secondary {
        background-color: var(--ar-color-neutral-0, #fff);
        color: var(--ar-color-text, #2e2e31);
        border-color: var(--ar-color-neutral-600, #5b5d65);
    }

    .high-contrast .btn-secondary,
    .high-contrast a.btn-secondary {
        border-color: var(--ar-color-text-base, #2e2e31);
    }

    .btn-secondary:focus,
    .btn-secondary:hover,
    a.btn-secondary:focus,
    a.btn-secondary:hover {
        background-color: var(--ar-color-neutral-600, #5b5d65);
        color: var(--ar-color-neutral-0, #fff);
    }

    .high-contrast .btn-secondary:focus,
    .high-contrast .btn-secondary:hover,
    .high-contrast a.btn-secondary:focus,
    .high-contrast a.btn-secondary:hover {
        background-color: var(--ar-color-neutral-700, #44454b);
    }

    .btn-secondary:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    .btn-secondary:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
    a.btn-secondary:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    a.btn-secondary:not(:disabled):not(.disabled):not([aria-disabled='true']):active {
        background-color: var(--ar-color-neutral-700, #44454b);
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-transverse.dark {
        background-color: var(--ar-color-interactive, var(--ar-color-primary-500, #283276));
        border-color: var(--ar-color-interactive, var(--ar-color-primary-500, #283276));
        color: var(--ar-color-neutral-0, #fff);
    }

    .high-contrast .btn-group .btn-transverse.dark {
        border: 1px solid var(--ar-color-neutral-0, #fff);
    }

    .btn-transverse.dark:hover {
        background-color: var(--ar-color-interactive-hover, var(--ar-color-primary-600, #1b2256));
        border-color: var(--ar-color-interactive-hover, var(--ar-color-primary-600, #1b2256));
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-transverse.dark:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    .btn-transverse.dark:not(:disabled):not(.disabled):not([aria-disabled='true']):active {
        background-color: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
        border-color: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-transverse.dark:focus {
        background: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
        border-color: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-transverse.light {
        background-color: var(--ar-color-neutral-0, #fff);
        border-color: var(--ar-color-interactive, var(--ar-color-primary-500, #283276));
        color: var(--ar-color-interactive, var(--ar-color-primary-500, #283276));
    }

    .btn-transverse.light:hover {
        background-color: var(--ar-color-neutral-50, #f5f5f8);
        border-color: var(--ar-color-interactive-hover, var(--ar-color-primary-600, #1b2256));
        color: var(--ar-color-interactive-hover, var(--ar-color-primary-600, #1b2256));
    }

    .btn-transverse.light:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    .btn-transverse.light:not(:disabled):not(.disabled):not([aria-disabled='true']):active {
        background-color: var(--ar-color-neutral-0, #fff);
        border-color: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
        border-width: 2px;
        -webkit-box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.25) inset;
        box-shadow: inset 0 1px 4px 0 rgba(0, 0, 0, 0.25);
    }

    .btn-transverse.light:focus {
        background-color: var(--ar-color-neutral-50, #f5f5f8);
        border-color: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
        color: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
    }

    .show > .btn-primary.dropdown-toggle {
        background-color: var(--ar-color-interactive-active, var(--ar-color-primary-700, #0f1438));
    }

    .btn-tertiary.light,
    a.btn-tertiary:not([aria-disabled='true']).light {
        background-color: rgba(26, 26, 26, 0.05);
        color: var(--ar-color-text, #2e2e31);
    }

    .high-contrast .btn-tertiary.light,
    .high-contrast a.btn-tertiary:not([aria-disabled='true']).light {
        border-color: var(--ar-color-text-base, #2e2e31);
    }

    .btn-tertiary.light:hover,
    a.btn-tertiary:not([aria-disabled='true']).light:hover {
        background-color: rgba(18, 20, 55, 0.7);
        color: var(--ar-color-neutral-0, #fff);
    }

    .high-contrast .btn-tertiary.light:hover,
    .high-contrast a.btn-tertiary:not([aria-disabled='true']).light:hover {
        background-color: var(--ar-color-neutral-700, #44454b);
        border-color: var(--ar-color-neutral-700, #44454b);
    }

    .btn-tertiary.light:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    .btn-tertiary.light:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
    a.btn-tertiary:not([aria-disabled='true']).light:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ).active,
    a.btn-tertiary:not([aria-disabled='true']).light:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ):active {
        background-color: rgba(18, 20, 55, 0.8);
        border-color: rgba(18, 20, 55, 0.8);
        -webkit-box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.25) inset;
        box-shadow: inset 0 1px 4px 0 rgba(0, 0, 0, 0.25);
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-tertiary.light:focus,
    a.btn-tertiary:not([aria-disabled='true']).light:focus {
        background-color: rgba(26, 26, 26, 0.05);
        border-color: rgba(18, 20, 55, 0.05);
        color: var(--ar-color-text, #2e2e31);
    }

    .btn-tertiary.dark,
    a.btn-tertiary:not([aria-disabled='true']).dark {
        background-color: hsla(0, 0%, 100%, 0.1);
        border-width: 0;
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-tertiary.dark:hover,
    a.btn-tertiary:not([aria-disabled='true']).dark:hover {
        background-color: hsla(0, 0%, 9%, 0.3);
    }

    .btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    .btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
    .btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']):active:focus,
    a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ).active,
    a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ):active,
    a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ):active:focus {
        background-color: hsla(0, 0%, 9%, 0.5);
        -webkit-box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.25) inset;
        box-shadow: inset 0 1px 4px 0 rgba(0, 0, 0, 0.25);
    }

    .btn-tertiary.dark:focus,
    a.btn-tertiary:not([aria-disabled='true']).dark:focus {
        background-color: hsla(0, 0%, 9%, 0.4);
    }

    .high-contrast .btn-tertiary.dark,
    .high-contrast a.btn-tertiary:not([aria-disabled='true']).dark {
        background-color: hsla(0, 0%, 9%, 0.3);
        border: 1px solid var(--ar-color-neutral-0, #fff) !important;
    }

    .high-contrast .btn-tertiary.dark:hover,
    .high-contrast a.btn-tertiary:not([aria-disabled='true']).dark:hover {
        background-color: hsla(0, 0%, 9%, 0.4);
    }

    .high-contrast
        .btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']).active
        .high-contrast
        .btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']):active:focus,
    .high-contrast
        .btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']).active
        .high-contrast
        a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ):active:focus,
    .high-contrast
        .btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
    .high-contrast
        a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ).active
        .high-contrast
        .btn-tertiary.dark:not(:disabled):not(.disabled):not([aria-disabled='true']):active:focus,
    .high-contrast
        a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ).active
        .high-contrast
        a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ):active:focus,
    .high-contrast
        a.btn-tertiary:not([aria-disabled='true']).dark:not(:disabled):not(.disabled):not(
            [aria-disabled='true']
        ):active {
        background-color: hsla(0, 0%, 9%, 0.6);
        -webkit-box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.25) inset;
        box-shadow: inset 0 1px 4px 0 rgba(0, 0, 0, 0.25);
    }

    .high-contrast .btn-tertiary.dark:focus,
    .high-contrast a.btn-tertiary:not([aria-disabled='true']).dark:focus {
        background-color: hsla(0, 0%, 9%, 0.5);
    }

    .btn-ghost,
    a.btn-ghost {
        background-color: transparent;
        color: var(--ar-color-neutral-0, #fff);
        -webkit-box-shadow: 0 0 0 0.0625rem var(--ar-color-neutral-0, #fff) inset;
        box-shadow: inset 0 0 0 0.0625rem var(--ar-color-neutral-0, #fff);
    }

    .btn-ghost:hover,
    a.btn-ghost:hover {
        background-color: var(--ar-color-neutral-600, #5b5d65);
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-ghost:focus,
    .btn-ghost:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    .btn-ghost:not(:disabled):not(.disabled):not([aria-disabled='true']):active,
    a.btn-ghost:focus,
    a.btn-ghost:not(:disabled):not(.disabled):not([aria-disabled='true']).active,
    a.btn-ghost:not(:disabled):not(.disabled):not([aria-disabled='true']):active {
        background-color: var(--ar-color-neutral-700, #44454b);
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-table {
        width: 100%;
        height: 100%;
        padding: 0.25rem var(--ar-table-padding-x, 1rem);
        color: inherit;
        background-color: transparent;
        border: none;
        border-radius: 0;
        -webkit-box-pack: start;
        -ms-flex-pack: start;
        justify-content: flex-start;
        text-align: left;
        font-weight: 700 !important;
        line-height: 1.1;
    }

    .btn-table:active,
    .btn-table:hover {
        background-color: var(--ar-color-neutral-100, #e6e7ec);
    }

    .btn-table:focus,
    .btn-table:focus:not(:focus-visible) {
        outline-offset: 0;
        background-color: var(--ar-color-neutral-100, #e6e7ec);
    }

    .high-contrast .btn-table {
        color: var(--ar-color-text-base, #2e2e31);
    }

    .table-rounded .table-sort:first-child > .btn-table {
        border-radius: 0.1875rem 0 0 0;
    }

    .table-rounded .table-sort:last-child > .btn-table {
        border-radius: 0 0.1875rem 0 0;
    }

    .btn-group-sm > .btn,
    .btn-sm {
        padding: 0 var(--ar-button-sm-padding-x, 0.75rem);
        min-height: var(--ar-button-sm-height, 2rem);
        border-radius: var(--ar-button-border-radius-sm-pill, 0.5rem);
    }

    .btn-group-sm > .btn:focus,
    .btn-sm:focus {
        -webkit-box-shadow:
            0 0 0 0.125rem var(--ar-color-text-base, #2e2e31) inset,
            0 0 0 0.1875rem var(--ar-color-neutral-0, #fff) inset;
        box-shadow:
            inset 0 0 0 0.125rem var(--ar-color-text-base, #2e2e31),
            inset 0 0 0 0.1875rem var(--ar-color-neutral-0, #fff);
    }

    .btn-group-lg > .btn,
    .btn-lg {
        padding: 0 var(--ar-button-lg-padding-x, 1.25rem);
        min-height: var(--ar-button-lg-height, 3rem);
    }

    .show > .btn-primary.dropdown-toggle:focus {
        -webkit-box-shadow:
            0 0 0 0.125rem var(--ar-color-text-base, #2e2e31) inset,
            0 0 0 0.1875rem var(--ar-color-neutral-0, #fff) inset;
        box-shadow:
            inset 0 0 0 0.125rem var(--ar-color-text-base, #2e2e31),
            inset 0 0 0 0.1875rem var(--ar-color-neutral-0, #fff);
    }

    .btn-ratio-square {
        padding: 0;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        aspect-ratio: 1/1;
        min-width: var(--ar-button-ratio-square-width, 2.5rem);
    }

    .btn-group-sm > .btn-ratio-square.btn,
    .btn-ratio-square.btn-sm {
        min-width: var(--ar-button-ratio-square-sm-width, 2rem);
    }

    .btn-group-lg > .btn-ratio-square.btn,
    .btn-ratio-square.btn-lg {
        min-width: var(--ar-button-ratio-square-lg-width, 3rem);
    }

    @media (max-width: 575.98px) {
        .d-xs-btn-ratio-square {
            padding: 0;
            -webkit-box-pack: center;
            -ms-flex-pack: center;
            justify-content: center;
            aspect-ratio: 1/1;
            min-width: var(--ar-button-ratio-square-width, 2.5rem);
        }

        .btn-group-sm > .d-xs-btn-ratio-square.btn,
        .d-xs-btn-ratio-square.btn-sm {
            min-width: var(--ar-button-ratio-square-sm-width, 2rem);
        }

        .btn-group-lg > .d-xs-btn-ratio-square.btn,
        .d-xs-btn-ratio-square.btn-lg {
            min-width: var(--ar-button-ratio-square-lg-width, 3rem);
        }

        .d-xs-btn-ratio-square .btn-content {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        .d-xs-btn-ratio-square .icon {
            margin: 0;
        }
    }

    @media (max-width: 767.98px) {
        .d-sm-btn-ratio-square {
            padding: 0;
            -webkit-box-pack: center;
            -ms-flex-pack: center;
            justify-content: center;
            aspect-ratio: 1/1;
            min-width: var(--ar-button-ratio-square-width, 2.5rem);
        }

        .btn-group-sm > .d-sm-btn-ratio-square.btn,
        .d-sm-btn-ratio-square.btn-sm {
            min-width: var(--ar-button-ratio-square-sm-width, 2rem);
        }

        .btn-group-lg > .d-sm-btn-ratio-square.btn,
        .d-sm-btn-ratio-square.btn-lg {
            min-width: var(--ar-button-ratio-square-lg-width, 3rem);
        }

        .d-sm-btn-ratio-square .btn-content {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        .d-sm-btn-ratio-square .icon {
            margin: 0;
        }
    }

    @media (max-width: 991.98px) {
        .d-md-btn-ratio-square {
            padding: 0;
            -webkit-box-pack: center;
            -ms-flex-pack: center;
            justify-content: center;
            aspect-ratio: 1/1;
            min-width: var(--ar-button-ratio-square-width, 2.5rem);
        }

        .btn-group-sm > .d-md-btn-ratio-square.btn,
        .d-md-btn-ratio-square.btn-sm {
            min-width: var(--ar-button-ratio-square-sm-width, 2rem);
        }

        .btn-group-lg > .d-md-btn-ratio-square.btn,
        .d-md-btn-ratio-square.btn-lg {
            min-width: var(--ar-button-ratio-square-lg-width, 3rem);
        }

        .d-md-btn-ratio-square .btn-content {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        .d-md-btn-ratio-square .icon {
            margin: 0;
        }
    }

    .btn-block {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
    }

    .btn-stepper-mobile {
        padding: 0.5rem 0.75rem;
        border-radius: 0.75rem;
        -webkit-box-pack: justify;
        -ms-flex-pack: justify;
        justify-content: space-between;
        line-height: normal;
        text-align: left;
    }

    .btn-help,
    a.btn-help {
        margin-left: 0.25rem;
        min-width: 1.25rem;
        min-height: 1.25rem;
        background-color: var(--ar-color-info-500, #2c74ff);
        border-color: var(--ar-color-info-500, #2c74ff);
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-help:active,
    .btn-help:focus,
    .btn-help:hover,
    a.btn-help:active,
    a.btn-help:focus,
    a.btn-help:hover {
        background-color: #043392;
        border-color: #043392;
        color: var(--ar-color-neutral-0, #fff);
    }

    .btn-help:focus,
    a.btn-help:focus {
        -webkit-box-shadow:
            0 0 0 0.125rem var(--ar-color-text-base, #2e2e31) inset,
            0 0 0 0.1875rem var(--ar-color-neutral-0, #fff) inset;
        box-shadow:
            inset 0 0 0 0.125rem var(--ar-color-text-base, #2e2e31),
            inset 0 0 0 0.1875rem var(--ar-color-neutral-0, #fff);
    }
`;
