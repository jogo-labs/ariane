import { css } from 'lit';

export default css`
    :host(.loading) {
        display: none !important;
    }

    .dropdown {
        position: relative;
        display: flex;
    }

    .btn-content {
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

    [part='list'] {
        margin: 0;
        counter-reset: step;
    }

    .item-header {
        display: inline-flex;
        counter-increment: step;
    }

    [part~='bullet'],
    .item-header {
        align-items: center;
        color: var(--ar-stepper-label-color);
    }

    [part~='bullet'] {
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
        /* Empêche le soulignement de ::part(step-link) de peindre à travers ce
         * flex-item (le conteneur <a> est en inline-flex, sans cette règle le trait
         * traverse aussi le chiffre du compteur). */
        text-decoration: none;
    }

    [part~='bullet']:before {
        content: counter(step);
    }

    .item {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    [part~='step-link'] {
        &:is(:focus, :hover) {
            &:before {
                background-color: var(--ar-stepper-link-hover-bullet-color);
            }

            .item-label {
                color: var(--ar-stepper-link-hover-label-color);
            }

            [part~='bullet'] {
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

    .current > .item-header {
        color: var(--ar-stepper-current-header-color);
        font-weight: 700;
    }

    [part='step']:not(:last-child):after {
        content: '';
        display: block;
    }

    [part~='step-link'] [part~='bullet'] {
        color: var(--ar-stepper-bullet-color);
        background-color: var(--ar-stepper-bullet-bg);
    }

    [part='step']:after {
        width: 2.25rem;
        height: var(--ar-stepper-gap);
        background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 3px;
        background-repeat: repeat-y;
    }

    [part='substep'] {
        &:before {
            content: '';
            display: block;
            width: 2.25rem;
            height: var(--ar-stepper-substep-gap);
            background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);
            background-size: 2px 8px;
            background-position: center 4px;
            background-repeat: repeat-y;
        }
    }

    [part='substep'] [part~='bullet'] {
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

    .desktop {
        display: flex;
        flex-flow: column;
    }

    :host([align='right']) .desktop {
        .item {
            align-items: flex-end;
            text-align: right;

            &::after {
                margin-left: auto;
            }
        }

        .item-header {
            justify-content: flex-end;
            margin-left: auto;
            text-align: right;
        }

        [part~='bullet'] {
            order: 2;
            margin-right: 0;
            margin-left: 0.5rem;
        }

        [part='substep'] [part~='bullet'] {
            margin-left: 1.25rem;
            margin-right: 0.75rem;
        }
    }
`;
