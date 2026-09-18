import { css } from 'lit';

export default css`
    :host {
        display: contents;
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
        margin-inline-end: 0.5rem;
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
        /* Les pseudo-éléments n'héritent pas toujours de façon fiable le
           text-decoration: none posé sur [part~='bullet'] (cf. commentaire
           ci-dessus) — le chiffre lui-même ne doit jamais être souligné. */
        text-decoration: none;
    }

    :host([part='substep']) [part~='bullet'] {
        width: 0.75rem;
        height: 0.75rem;
        margin-inline-start: 0.75rem;
        margin-inline-end: 1.25rem;
        display: block;
        padding-bottom: 0;

        &:before {
            content: '';
        }
    }

    /* [part='step']/[part='substep'] (égalité stricte) ne matche pas "list list--substep" côté
       ar-stepper : ce reset dédié évite que la liste de sous-étapes hérite du compteur "step" du
       parent au lieu de repartir de zéro, ce qui ferait sauter la numérotation des étapes
       principales suivantes. */
    [part~='list--substep'] {
        counter-reset: step;
        margin: 0;
    }

    /* S'applique à toute puce (étape ou sous-étape) dans un lien survolé/focus —
       même mécanisme pour les deux niveaux, aucun traitement spécifique au niveau. */
    [part~='step-link']:is(:hover, :focus) [part~='bullet'] {
        color: var(--ar-stepper-link-hover-bullet-text-color);
        background-color: var(--ar-stepper-bullet-hover-bg);
        box-shadow: none;
    }

    [part~='step-link']:is(:hover, :focus) .item-label {
        color: var(--ar-stepper-link-hover-label-color);
    }

    .item-header:focus-visible {
        outline-offset: 4px;
        outline-color: var(--ar-stepper-link-focus-outline-color);
    }

    :host([aria-current='step']) .item-header {
        color: var(--ar-stepper-current-header-color);
        font-weight: 700;
    }

    :host([part='step']:not(:last-child)):after {
        content: '';
        display: block;
        width: 2.25rem;
        height: var(--ar-stepper-gap);
        background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 3px;
        background-repeat: repeat-y;
    }

    :host([part='substep']):before {
        content: '';
        display: block;
        width: 2.25rem;
        height: var(--ar-stepper-substep-gap);
        background-image: linear-gradient(var(--ar-stepper-connector-color) 25%, transparent 0);
        background-size: 2px 8px;
        background-position: center 4px;
        background-repeat: repeat-y;
    }

    [part~='step-link'] [part~='bullet'] {
        color: var(--ar-stepper-bullet-color);
        background-color: var(--ar-stepper-bullet-bg);
        box-shadow: none;
    }

    .item-header {
        /* a11y-fallback: posé par ar-stepper seulement sous reverse-align, sinon layout normal */
        justify-content: var(--ar-stepper-item-align, flex-start);
        /* a11y-fallback: idem — reproduit l'absence de marge du layout par défaut */
        margin-inline-start: var(--ar-stepper-item-margin-start, unset);
        /* a11y-fallback: idem — reproduit l'alignement de texte par défaut */
        text-align: var(--ar-stepper-item-text-align, start);
    }

    [part~='bullet'] {
        /* a11y-fallback: posé par ar-stepper seulement sous reverse-align, sinon ordre normal */
        order: var(--ar-stepper-item-bullet-order, 0);
        /* a11y-fallback: idem — reproduit la marge de puce par défaut */
        margin-inline-end: var(--ar-stepper-item-bullet-margin-end, 0.5rem);
        /* a11y-fallback: idem — reproduit l'absence de marge de puce par défaut */
        margin-inline-start: var(--ar-stepper-item-bullet-margin-start, 0);
    }
`;
