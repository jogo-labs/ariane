import { css } from 'lit';

export default css`
    :host(.loading) {
        display: none !important;
    }
    :host(:not(.align-left, [version='mobile'])) {
        .stepper-list {
            .stepper-item::after {
                width: 2.25rem;
                height: 1.5rem;
                background-image: -webkit-gradient(
                    linear,
                    left top,
                    left bottom,
                    color-stop(25%, #cdcfd8),
                    color-stop(25%, transparent)
                );
                background-image: linear-gradient(#cdcfd8 25%, transparent 25%);
                background-size: 2px 8px;
                background-position: center 3px;
                background-repeat: repeat-y;
            }
            .stepper-item {
                -webkit-box-align: end;
                -ms-flex-align: end;
                align-items: flex-end;
                text-align: right;
            }
            .stepper-item::after {
                margin-left: auto;
            }
            .stepper-item-inner {
                -webkit-box-pack: end;
                -ms-flex-pack: end;
                justify-content: flex-end;
                margin-left: auto;
                text-align: right;
            }
            .stepper-item-bullet {
                -webkit-box-ordinal-group: 3;
                -ms-flex-order: 2;
                order: 2;
                margin-right: 0;
                margin-left: 0.5rem;
            }
            .stepper-list .stepper-item-bullet {
                margin-left: 1.25rem;
                margin-right: 0.75rem;
            }
        }
    }

    /* .stepper-desktop {
        display: none;
    } */

    .stepper-dropdown {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
    }

    .stepper-dropdown .dropdown-toggle .btn-content {
        margin-right: 1rem;
        gap: 0.25rem;
    }

    .stepper-dropdown-menu {
        padding: 0.75rem;
        width: 100%;
    }

    .stepper-list {
        counter-reset: step;
    }

    .stepper-item-inner {
        display: -webkit-inline-box;
        display: -ms-inline-flexbox;
        display: inline-flex;
        counter-increment: step;
    }

    .stepper-item-bullet,
    .stepper-item-inner {
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        color: var(--ar--color-background-neutral-default-strong);
    }

    .stepper-item-bullet {
        width: 2.25rem;
        height: 2.25rem;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -ms-flex-negative: 0;
        flex-shrink: 0;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        border-radius: 0.75rem;
        padding-bottom: 0.125rem;
        margin-right: 0.5rem;
        -webkit-transform: translateY(1px);
        transform: translateY(1px);
        -webkit-box-shadow: 0 0 0 1px var(--ar--stepper-next-bullet-border) inset;
        box-shadow: 0 0 0 1px var(--ar--stepper-next-bullet-border) inset;
        background-color: transparent;
    }

    .stepper-item-bullet:before {
        content: counter(step);
    }

    .stepper-item {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-align: start;
        -ms-flex-align: start;
        align-items: flex-start;
    }

    .stepper-item .stepper-link {
        text-decoration: none;
    }

    .stepper-item .stepper-link .stepper-item-label {
        text-decoration: underline;
    }

    .stepper-item .stepper-link:focus,
    .stepper-item .stepper-link:hover {
        color: var(--ar--stepper-bullet-hover);
    }

    .stepper-item .stepper-link:focus:before,
    .stepper-item .stepper-link:hover:before {
        background-color: var(--ar--color-primary);
    }

    .stepper-item .stepper-link:focus .stepper-item-label,
    .stepper-item .stepper-link:hover .stepper-item-label {
        text-decoration: none;
        color: var(--ar--color-text-color);
    }

    .stepper-item .stepper-link:focus .stepper-item-bullet,
    .stepper-item .stepper-link:hover .stepper-item-bullet {
        color: #fff;
        background-color: var(--ar--stepper-bullet-hover);
        -webkit-box-shadow: none;
        box-shadow: none;
    }

    .stepper-item .stepper-link:focus {
        outline-offset: 4px;
        outline-color: var(--ar--color-primary);
        border-radius: 0.125rem;
    }

    .stepper-item.active > .stepper-item-inner {
        color: var(--ar--color-primary);
        font-weight: 700;
    }

    .stepper-item.active > .stepper-item-inner .stepper-item-bullet {
        color: #fff;
        background-color: #406bde;
        -webkit-box-shadow: none;
        box-shadow: none;
    }

    .stepper-item:not(:last-child):after {
        content: '';
        display: block;
    }

    .stepper-link .stepper-item-bullet {
        color: #283276;
        background-color: var(--ar--stepper-bullet-background);
    }

    .stepper-list.stepper-desktop,
    .stepper-list.stepper-mobile {
        margin-bottom: 0;
    }

    .stepper-list.stepper-right .stepper-item:after,
    .stepper-list:not(.stepper-horizontal) .stepper-item:after {
        width: 2.25rem;
        height: 1.5rem;
        background-image: -webkit-gradient(
            linear,
            left top,
            left bottom,
            color-stop(25%, #cdcfd8),
            color-stop(25%, transparent)
        );
        background-image: linear-gradient(#cdcfd8 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 3px;
        background-repeat: repeat-y;
    }

    .stepper-list.stepper-right .stepper-item {
        -webkit-box-align: end;
        -ms-flex-align: end;
        align-items: flex-end;
        text-align: right;
    }

    .stepper-list.stepper-right .stepper-item:after {
        margin-left: auto;
    }

    .stepper-list.stepper-right .stepper-item-inner {
        -webkit-box-pack: end;
        -ms-flex-pack: end;
        justify-content: flex-end;
        margin-left: auto;
        text-align: right;
    }

    .stepper-list.stepper-right .stepper-item-bullet {
        -webkit-box-ordinal-group: 3;
        -ms-flex-order: 2;
        order: 2;
        margin-right: 0;
        margin-left: 0.5rem;
    }

    .stepper-list.stepper-right .stepper-list .stepper-item-bullet {
        margin-left: 1.25rem;
        margin-right: 0.75rem;
    }

    .stepper-list .stepper-list .stepper-item:after {
        content: none;
    }

    .stepper-list .stepper-list .stepper-item:before {
        content: '';
        display: block;
        width: 2.25rem;
        height: 1rem;
        background-image: -webkit-gradient(
            linear,
            left top,
            left bottom,
            color-stop(25%, #cdcfd8),
            color-stop(25%, transparent)
        );
        background-image: linear-gradient(#cdcfd8 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 4px;
        background-repeat: repeat-y;
    }

    .stepper-list .stepper-list .stepper-item-bullet {
        width: 0.75rem;
        height: 0.75rem;
        margin-left: 0.75rem;
        margin-right: 1.25rem;
        display: block;
        padding-bottom: 0;
    }

    .stepper-list .stepper-list .stepper-item-bullet:before {
        content: '';
    }

    .stepper-right .stepper-list .stepper-item:before {
        margin-left: auto;
        margin-left: 0;
    }

    @media (min-width: 992px) {
        /* .stepper-dropdown {
            display:none!important
        } */

        .stepper-desktop {
            display: -webkit-box !important;
            display: -ms-flexbox !important;
            display: flex !important;
            -webkit-box-orient: vertical !important;
            -webkit-box-direction: normal !important;
            -ms-flex-flow: column !important;
            flex-flow: column !important;
        }
    }

    .stepper-edition .stepper-item-inner .icon {
        margin-bottom: 0;
        margin-left: 0.5rem;
    }

    .stepper-edition .stepper-item-bullet {
        color: #283276;
        background-color: var(--ar--stepper-bullet-background);
    }
`;
