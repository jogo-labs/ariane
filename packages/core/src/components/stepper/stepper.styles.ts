import { css } from 'lit';

export default css`
    :host(.loading) {
        display: none !important;
    }

    .stepper-dropdown {
        position: relative;
        display: flex;
    }

    .stepper-dropdown .btn-content {
        margin-right: 1rem;
        gap: 0.25rem;
    }

    [part='trigger'] {
        padding: 0.5rem 0.75rem;
        justify-content: space-between;
        line-height: normal;
        text-align: left;
    }

    [part='panel'] {
        background-color: var(--ar-stepper-panel-bg, Canvas);
        border-color: var(--ar-stepper-panel-border-color, ButtonBorder);
    }

    .stepper-list {
        margin: 0;
        counter-reset: step;
    }

    .stepper-item-inner {
        display: inline-flex;
        counter-increment: step;
    }

    .stepper-item-bullet,
    .stepper-item-inner {
        align-items: center;
        color: var(--ar-stepper-label-color);
    }

    .stepper-item-bullet {
        width: 2.25rem;
        height: 2.25rem;
        display: flex;
        flex-shrink: 0;
        justify-content: center;
        padding-bottom: 0.125rem;
        margin-right: 0.5rem;
        transform: translateY(1px);
        box-shadow: 0 0 0 1px var(--ar-stepper-bullet-border-color) inset;
        background-color: transparent;
    }

    .stepper-item-bullet:before {
        content: counter(step);
    }

    .stepper-item {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    .stepper-item .stepper-link {
        text-decoration: none;

        .stepper-item-label {
            text-decoration: underline;
        }

        &:is(:focus, :hover) {
            &:before {
                background-color: var(--ar-stepper-link-hover-bullet-color);
            }

            .stepper-item-label {
                text-decoration: none;
                color: var(--ar-stepper-link-hover-label-color);
            }

            .stepper-item-bullet {
                color: var(--ar-stepper-link-hover-bullet-text-color);
                background-color: var(--ar-stepper-bullet-hover-bg);
                box-shadow: none;
            }
        }

        &:focus {
            outline-offset: 4px;
            outline-color: var(--ar-stepper-link-focus-outline-color);
        }
    }

    .stepper-item.active > .stepper-item-inner {
        color: var(--ar-stepper-active-label-color);
        font-weight: 700;
    }

    .stepper-item:not(:last-child):after {
        content: '';
        display: block;
    }

    .stepper-link .stepper-item-bullet {
        color: var(--ar-stepper-bullet-color);
        background-color: var(--ar-stepper-bullet-bg);
    }

    .stepper-list .stepper-item:after {
        width: 2.25rem;
        height: var(--ar-stepper-gap);
        background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 3px;
        background-repeat: repeat-y;
    }

    .stepper-list .stepper-list {
        .stepper-item {
            &:after {
                content: none;
            }

            &:before {
                content: '';
                display: block;
                width: 2.25rem;
                height: var(--ar-stepper-substep-gap);
                background-image: linear-gradient(
                    var(--ar-stepper-connector-color) 25%,
                    transparent 0
                );
                background-size: 2px 8px;
                background-position: center 4px;
                background-repeat: repeat-y;
            }
        }

        .stepper-item-bullet {
            width: 0.75rem;
            height: 0.75rem;
            margin-left: 0.75rem;
            margin-right: 1.25rem;
            display: block;
            padding-bottom: 0;

            &:before {
                content: '';
            }
        }
    }

    @media (min-width: 992px) {
        .stepper-desktop {
            display: flex !important;
            flex-flow: column !important;
        }
    }

    :host([align='right']) .stepper-desktop {
        .stepper-item {
            align-items: flex-end;
            text-align: right;

            &::after {
                margin-left: auto;
            }
        }

        .stepper-item-inner {
            justify-content: flex-end;
            margin-left: auto;
            text-align: right;
        }

        .stepper-item-bullet {
            order: 2;
            margin-right: 0;
            margin-left: 0.5rem;
        }

        .stepper-list .stepper-item-bullet {
            margin-left: 1.25rem;
            margin-right: 0.75rem;
        }
    }
`;
