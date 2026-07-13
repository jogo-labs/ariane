import { css } from 'lit';

export default css`
    :host(.loading) {
        display: none !important;
    }

    ol {
        margin-top: 0;
    }

    ol ol {
        margin-bottom: 0;
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
        border-radius: 0.75rem;
        justify-content: space-between;
        line-height: normal;
        text-align: left;
    }

    /* Tokens scopés au composant — .btn + [part='trigger'] pour dépasser
     * .btn-secondary dans button.styles.ts, indépendamment de l'ordre des styles. */
    [part='trigger'].btn.btn-secondary {
        background-color: var(--ar-stepper-trigger-bg);
    }

    [part='trigger'].btn.btn-secondary:hover {
        background-color: var(--ar-stepper-trigger-bg-hover);
    }

    [part='panel'] {
        padding: 0.75rem;
        min-width: var(--ar-stepper-panel-min-width);
        max-width: var(--ar-stepper-panel-max-width);
    }

    .stepper-list {
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
        border-radius: var(--ar-stepper-bullet-radius);
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
        color: var(--ar-stepper-link-color);
        text-decoration: none;
    }

    .stepper-item .stepper-link .stepper-item-label {
        text-decoration: underline;
    }

    .stepper-item .stepper-link:focus,
    .stepper-item .stepper-link:hover {
        color: var(--ar-stepper-link-hover-color);
    }

    .stepper-item .stepper-link:focus:before,
    .stepper-item .stepper-link:hover:before {
        background-color: var(--ar-color-interactive);
    }

    .stepper-item .stepper-link:focus .stepper-item-label,
    .stepper-item .stepper-link:hover .stepper-item-label {
        text-decoration: none;
        color: var(--ar-color-text);
    }

    .stepper-item .stepper-link:focus .stepper-item-bullet,
    .stepper-item .stepper-link:hover .stepper-item-bullet {
        color: var(--ar-color-text-inverse);
        background-color: var(--ar-stepper-bullet-hover-bg);
        box-shadow: none;
    }

    .stepper-item .stepper-link:focus {
        outline-offset: 4px;
        outline-color: var(--ar-color-interactive);
        border-radius: 0.125rem;
    }

    .stepper-item.active > .stepper-item-inner {
        color: var(--ar-stepper-active-label-color);
        font-weight: 700;
    }

    .stepper-item.active > .stepper-item-inner .stepper-item-bullet {
        color: var(--ar-stepper-active-bullet-color);
        background-color: var(--ar-stepper-active-bullet-bg);
        box-shadow: none;
    }

    .stepper-item:not(:last-child):after {
        content: '';
        display: block;
    }

    .stepper-link .stepper-item-bullet {
        color: var(--ar-stepper-bullet-color);
        background-color: var(--ar-stepper-bullet-bg);
    }

    .stepper-list.stepper-desktop,
    .stepper-list.stepper-mobile {
        margin-bottom: 0;
    }

    .stepper-list:not(.stepper-horizontal) .stepper-item:after {
        width: 2.25rem;
        height: var(--ar-stepper-gap);
        background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 3px;
        background-repeat: repeat-y;
    }

    .stepper-list .stepper-list .stepper-item:after {
        content: none;
    }

    .stepper-list .stepper-list .stepper-item:before {
        content: '';
        display: block;
        width: 2.25rem;
        height: var(--ar-stepper-substep-gap);
        background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);
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

    @media (min-width: 992px) {
        .stepper-desktop {
            display: flex !important;
            flex-flow: column !important;
        }
    }

    .stepper-edition .stepper-item-inner .icon {
        margin-bottom: 0;
        margin-left: 0.5rem;
    }

    .stepper-edition .stepper-item-bullet {
        color: var(--ar-stepper-bullet-color);
        background-color: var(--ar-stepper-bullet-bg);
    }

    :host([align='right']) .stepper-desktop .stepper-item {
        align-items: flex-end;
        text-align: right;
    }

    :host([align='right']) .stepper-desktop .stepper-item::after {
        margin-left: auto;
    }

    :host([align='right']) .stepper-desktop .stepper-item-inner {
        justify-content: flex-end;
        margin-left: auto;
        text-align: right;
    }

    :host([align='right']) .stepper-desktop .stepper-item-bullet {
        order: 2;
        margin-right: 0;
        margin-left: 0.5rem;
    }

    :host([align='right']) .stepper-desktop .stepper-list .stepper-item-bullet {
        margin-left: 1.25rem;
        margin-right: 0.75rem;
    }
`;
