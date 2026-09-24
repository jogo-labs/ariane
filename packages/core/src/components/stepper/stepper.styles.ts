import { css } from 'lit';

export default css`
    :host(.loading) {
        display: none !important;
    }

    .dropdown {
        position: relative;
        display: flex;
    }

    [part='trigger'] {
        display: flex;
        align-items: center;
        line-height: normal;
        transition:
            background-color var(--ar-stepper-toggle-transition-duration),
            color var(--ar-stepper-toggle-transition-duration),
            border-color var(--ar-stepper-toggle-transition-duration);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-height: var(--ar-stepper-toggle-min-size, 2.5rem);
    }

    .trigger-text {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
    }

    [part='trigger-icon'] {
        display: inline-flex;
        flex-shrink: 0;
    }

    svg {
        height: 1.25em;
        overflow: visible;
        width: auto;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='trigger'] {
            transition: none;
        }
    }

    [part='list'] {
        margin: 0;
        counter-reset: step;
        display: flex;
        flex-flow: column;
    }

    /* functional-default: pont d'état vers ar-stepper-item — reverse-align est un attribut
       booléen de ar-stepper ; ces custom properties (héritées à travers le shadow DOM) relaient
       cet état au shadow DOM de ar-stepper-item, qui ne peut pas lire l'attribut de son ancêtre.
       Ce ne sont pas des tokens de design : elles ne portent que le renversement structurel du
       layout (alignement, ordre flex de l'indicateur). Tailles et marges de l'indicateur
       relèvent du thème. */
    :host([reverse-align]) {
        /* functional-default: cf. commentaire ci-dessus */
        --ar-stepper-item-align: flex-end;
        /* functional-default: cf. commentaire ci-dessus */
        --ar-stepper-item-margin-start: auto;
        /* functional-default: cf. commentaire ci-dessus */
        --ar-stepper-item-text-align: end;
        /* functional-default: cf. commentaire ci-dessus */
        --ar-stepper-item-indicator-order: 2;
        /* functional-default: cf. commentaire ci-dessus */
        --ar-stepper-item-indicator-margin-end: 0;
        /* functional-default: cf. commentaire ci-dessus */
        --ar-stepper-item-indicator-margin-start: 0.5rem;
    }
`;
