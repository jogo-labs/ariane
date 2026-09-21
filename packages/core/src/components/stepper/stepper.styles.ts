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
        align-items: flex-start;
        flex-direction: column;
        line-height: normal;
        transition:
            background-color var(--ar-stepper-toggle-transition-duration),
            color var(--ar-stepper-toggle-transition-duration),
            border-color var(--ar-stepper-toggle-transition-duration);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-height: var(--ar-stepper-toggle-min-size, 2.5rem);
    }

    @media (prefers-reduced-motion: reduce) {
        [part='trigger'] {
            transition: none;
        }
    }

    [part='list'] {
        margin: 0;
        counter-reset: step;
    }

    .desktop {
        display: flex;
        flex-flow: column;
    }

    /* functional-default: pont d'état interne vers ar-stepper-item — reverse-align est un
       attribut booléen posé sur ar-stepper, pas une valeur de thème ; ces custom properties
       relaient cet état (aligné à droite ou non) au shadow DOM de ar-stepper-item, qui ne peut
       pas lire un attribut de son hôte ancêtre. Pas des tokens de design. La marge/taille par
       défaut de l'indicateur (y compris pour les sous-étapes) est du ressort du thème
       (::part(indicator), ar-stepper-item > ar-stepper-item::part(indicator)) — seul l'ordre
       de flex (avant/après le label) reste ici, c'est un renversement de layout structurel. */
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
