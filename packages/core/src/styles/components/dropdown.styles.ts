import { css } from 'lit';

export default css`
    .dropdown {
        display: -webkit-inline-box;
        display: -ms-inline-flexbox;
        display: inline-flex;
    }

    .dropdown-menu {
        margin-top: 6px;
        min-width: 14rem;
        padding: 0.75rem;
        -webkit-box-shadow: 0 3px 7px -1px rgba(15, 20, 56, 0.2);
        box-shadow: 0 3px 7px -1px rgba(15, 20, 56, 0.2);
        border: var(--ar--contrasted-border-width) solid
            var(--ar--color-border-neutral-default-weaker);
        border-radius: 0.75rem;
        color: #000;
        font-size: var(--ar--font-size-text);
    }

    .dropdown-menu[popover] {
        inset: 0 auto auto 0;
        margin: 0;
    }

    .dropdown-menu.with-footer {
        padding: 0;
        border-radius: 0.75rem;
    }

    .dropdown-menu.with-footer .dropdown-list {
        padding: 0.75rem;
    }

    .dropdown-menu .input-list-with-check-bg .form-check {
        margin-left: 0.5rem;
    }

    .dropdown-menu .input-list-with-check-bg .form-check .form-check-label {
        width: 100%;
    }

    .dropdown-menu .input-list-with-check-bg .form-check .form-check-label:before {
        right: 0;
    }

    .dropdown-menu .input-list-with-check-bg .form-check:not(:last-child) {
        margin-bottom: 0.5rem;
    }

    .dropdown-legend,
    .dropdown-title {
        font-weight: 700;
        font-size: inherit;
        margin-bottom: 0.75rem;
    }

    .dropdown-item {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        gap: 0.625rem;
        padding: 0.5rem;
        border-radius: 0.75rem;
        text-decoration: none;
        white-space: nowrap;
        position: relative;
        font-weight: 500;
    }

    .dropdown-item:visited {
        color: initial;
    }

    .dropdown-item:focus,
    .dropdown-item:hover {
        background-color: var(--ar--color-background-neutral-default-weaker);
    }

    .dropdown-item:focus {
        z-index: 100;
    }

    .dropdown-item[aria-disabled='true'] {
        color: #71747f;
    }

    .dropdown-item:active {
        background-color: var(--ar--color-primary);
        color: #fff;
    }

    .dropdown-item > svg {
        -ms-flex-negative: 0;
        flex-shrink: 0;
    }

    .dropdown-footer {
        background-color: #f5f5f8;
        border-radius: 0 0 0.75rem 0.75rem;
        padding: 0.75rem;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: end;
        -ms-flex-pack: end;
        justify-content: flex-end;
    }

    .dropdown-footer:has(.dropdown-item) {
        padding: 0;
    }

    .dropdown-footer .dropdown-item {
        border-radius: 0 0 0.75rem 0.75rem;
        padding: 0.75rem 1.25rem;
    }

    .dropdown-button-container {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: end;
        -ms-flex-pack: end;
        justify-content: flex-end;
        border-top: 1px solid var(--ar--color-border-neutral-default-weaker);
        margin-top: 0.75rem;
        padding: 0.75rem 0 0;
    }

    .dropdown-button-container > * + * {
        margin-left: 0.5rem;
    }

    .dropdown-sm {
        max-width: 10rem;
    }

    .dropdown-md {
        max-width: 16rem;
    }

    .dropdown-lg {
        max-width: 24rem;
    }

    .dropdown-list {
        padding: 0;
        margin-bottom: 0;
        list-style: none;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        gap: 0.25rem;
    }

    .dropdown-list .form-check-label {
        position: static;
    }

    .dropdown-list .form-check .form-check-input[type='checkbox'] ~ .form-check-label:before,
    .dropdown-list .form-check .form-check-input[type='radio'] ~ .form-check-label:before {
        inset: 0;
    }

    .dropdown-list .dropdown-item .icon {
        margin-left: 0;
        margin-bottom: 0;
    }

    .dropdown-divider {
        border-color: var(--ar--color-border-neutral-default-weaker);
    }

    .dropdown,
    .dropleft,
    .dropright,
    .dropup {
        position: relative;
    }

    .dropdown-toggle {
        white-space: nowrap;
    }

    .dropdown-toggle:after {
        display: inline-block;
        margin-left: 0.255em;
        vertical-align: 0.255em;
        content: '';
        border-top: 0.3em solid;
        border-right: 0.3em solid transparent;
        border-bottom: 0;
        border-left: 0.3em solid transparent;
    }

    .dropdown-toggle:empty:after {
        margin-left: 0;
    }

    .dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 1000;
        display: none;
        float: left;
        min-width: 10rem;
        padding: 0.625rem 1rem;
        margin: 0.125rem 0 0;
        font-size: 1rem;
        color: #2e2e31;
        text-align: left;
        list-style: none;
        background-color: #fff;
        background-clip: padding-box;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 0.5rem;
    }

    .dropdown-menu-left {
        right: auto;
        left: 0;
    }

    .dropdown-menu-right {
        right: 0;
        left: auto;
    }

    @media (min-width: 480px) {
        .dropdown-menu-xs-left {
            right: auto;
            left: 0;
        }

        .dropdown-menu-xs-right {
            right: 0;
            left: auto;
        }
    }

    @media (min-width: 576px) {
        .dropdown-menu-sm-left {
            right: auto;
            left: 0;
        }

        .dropdown-menu-sm-right {
            right: 0;
            left: auto;
        }
    }

    @media (min-width: 768px) {
        .dropdown-menu-md-left {
            right: auto;
            left: 0;
        }

        .dropdown-menu-md-right {
            right: 0;
            left: auto;
        }
    }

    @media (min-width: 992px) {
        .dropdown-menu-lg-left {
            right: auto;
            left: 0;
        }

        .dropdown-menu-lg-right {
            right: 0;
            left: auto;
        }
    }

    @media (min-width: 1200px) {
        .dropdown-menu-xl-left {
            right: auto;
            left: 0;
        }

        .dropdown-menu-xl-right {
            right: 0;
            left: auto;
        }
    }

    @media (min-width: 1440px) {
        .dropdown-menu-xxl-left {
            right: auto;
            left: 0;
        }

        .dropdown-menu-xxl-right {
            right: 0;
            left: auto;
        }
    }

    .dropup .dropdown-menu {
        top: auto;
        bottom: 100%;
        margin-top: 0;
        margin-bottom: 0.125rem;
    }

    .dropup .dropdown-toggle:after {
        display: inline-block;
        margin-left: 0.255em;
        vertical-align: 0.255em;
        content: '';
        border-top: 0;
        border-right: 0.3em solid transparent;
        border-bottom: 0.3em solid;
        border-left: 0.3em solid transparent;
    }

    .dropup .dropdown-toggle:empty:after {
        margin-left: 0;
    }

    .dropright .dropdown-menu {
        top: 0;
        right: auto;
        left: 100%;
        margin-top: 0;
        margin-left: 0.125rem;
    }

    .dropright .dropdown-toggle:after {
        display: inline-block;
        margin-left: 0.255em;
        vertical-align: 0.255em;
        content: '';
        border-top: 0.3em solid transparent;
        border-right: 0;
        border-bottom: 0.3em solid transparent;
        border-left: 0.3em solid;
    }

    .dropright .dropdown-toggle:empty:after {
        margin-left: 0;
    }

    .dropright .dropdown-toggle:after {
        vertical-align: 0;
    }

    .dropleft .dropdown-menu {
        top: 0;
        right: 100%;
        left: auto;
        margin-top: 0;
        margin-right: 0.125rem;
    }

    .dropleft .dropdown-toggle:after {
        display: inline-block;
        margin-left: 0.255em;
        vertical-align: 0.255em;
        content: '';
        display: none;
    }

    .dropleft .dropdown-toggle:before {
        display: inline-block;
        margin-right: 0.255em;
        vertical-align: 0.255em;
        content: '';
        border-top: 0.3em solid transparent;
        border-right: 0.3em solid;
        border-bottom: 0.3em solid transparent;
    }

    .dropleft .dropdown-toggle:empty:after {
        margin-left: 0;
    }

    .dropleft .dropdown-toggle:before {
        vertical-align: 0;
    }

    .dropdown-menu[x-placement^='bottom'],
    .dropdown-menu[x-placement^='left'],
    .dropdown-menu[x-placement^='right'],
    .dropdown-menu[x-placement^='top'] {
        right: auto;
        bottom: auto;
    }

    .dropdown-divider {
        height: 0;
        margin: 0.5rem 0;
        overflow: hidden;
        border-top: 1px solid #e9ecef;
    }

    .dropdown-item {
        display: block;
        width: 100%;
        padding: 0.25rem;
        clear: both;
        font-weight: 400;
        color: #212529;
        text-align: inherit;
        background-color: transparent;
        border: 0;
    }

    .dropdown-item:focus,
    .dropdown-item:hover {
        color: #16181b;
        text-decoration: none;
        background-color: #e9ecef;
    }

    .dropdown-item.active,
    .dropdown-item:active {
        color: #fff;
        text-decoration: none;
        background-color: #283276;
    }

    .dropdown-item.disabled,
    .dropdown-item:disabled {
        color: #adb5bd;
        pointer-events: none;
        background-color: transparent;
    }

    .dropdown-menu.show {
        display: block;
    }

    .dropdown-header {
        display: block;
        padding: 0.625rem 0.25rem;
        margin-bottom: 0;
        font-size: 0.875rem;
        color: #6c757d;
        white-space: nowrap;
    }

    .dropdown-item-text {
        display: block;
        padding: 0.25rem;
        color: #212529;
    }
`;
