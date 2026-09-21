import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    /* :host { display: contents } aplatit l'item dans le flux du parent (ar-stepper) — sans ce
       conteneur, .item-header et le wrapper after-label deviendraient chacun un flex-item
       séparé de la colonne .desktop d'ar-stepper (blockifiés, empilés) au lieu de rester côte à
       côte. La numérotation (counter-increment) reste sur .item-header, pas ici : le compteur
       ne doit s'incrémenter qu'une fois par item, pas par ce conteneur purement layout. */
    .item-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .item-header {
        display: inline-flex;
        counter-increment: step;
    }

    [part~='indicator'],
    .item-header {
        align-items: center;
        color: var(--ar-stepper-item-label-color);
    }

    [part~='indicator'] {
        display: flex;
        flex-shrink: 0;
        justify-content: center;
        transform: translateY(1px);
        background-color: transparent;
        /* Empêche le soulignement de ::part(step-link) de traverser ce flex-item (le <a> est en
         * inline-flex : sans cette règle le trait barre aussi le chiffre du compteur). */
        text-decoration: none;
    }

    /* functional-default: numérotation par défaut — chiffre visible sur les étapes principales,
       indicateur nu sur les sous-étapes. Forme, taille et couleur de l'indicateur relèvent du thème. */
    [part~='indicator']:before {
        content: counter(step);
        /* a11y-fallback: posé par ar-stepper-item lui-même seulement quand imbriqué (sous-étape), sinon numéro visible */
        display: var(--ar-stepper-item-indicator-number-display, inline);
        /* Les pseudo-éléments n'héritent pas toujours de façon fiable de text-decoration: none
           posé sur [part~='indicator'] : le chiffre ne doit jamais être souligné. */
        text-decoration: none;
    }

    /* Un contenu projeté dans le slot indicator (icône custom) remplace toujours le chiffre
       par défaut — jamais les deux en même temps. */
    [part~='indicator'][data-has-content]:before {
        display: none;
    }

    /* Le reset du compteur "step" fait repartir la numérotation de zéro dans la liste de
       sous-étapes, sans quoi les étapes principales suivantes sauteraient des numéros. La custom
       property relaie aux sous-étapes slottées (via l'arbre plat) qu'elles sont imbriquées :
       :host-context() n'est pas fiable cross-navigateur. */
    [part~='list--substep'] {
        counter-reset: step;
        margin: 0;
        /* flex column, comme .desktop côté ar-stepper : align-self (posé par le thème sur le
           connecteur) n'a d'effet que sur un item flex/grid, pas dans un flux normal. */
        display: flex;
        flex-flow: column;
        /* functional-default: relaie l'imbrication aux sous-étapes slottées (cf. commentaire ci-dessus). */
        --ar-stepper-item-indicator-number-display: none;
    }

    /* Couleur et fond de l'indicateur au survol/focus : définis par le thème
       (::part(indicator) dans default.css). */
    [part~='step-link']:is(:hover, :focus) .item-label {
        color: var(--ar-stepper-item-link-hover-label-color);
    }

    .item-header:focus-visible {
        outline-offset: 4px;
        outline-color: var(--ar-stepper-item-link-focus-outline-color);
    }

    :host([aria-current='step']) .item-header {
        color: var(--ar-stepper-item-current-header-color);
        font-weight: 700;
    }

    /* Le connecteur décoratif (ligne pointillée entre étapes) est un pseudo-élément du host
       (::before/::after), défini par le thème dans default.css. */

    .item-header {
        /* a11y-fallback: posé par ar-stepper seulement sous reverse-align, sinon layout normal */
        justify-content: var(--ar-stepper-item-align, flex-start);
        /* a11y-fallback: idem — reproduit l'absence de marge du layout par défaut */
        margin-inline-start: var(--ar-stepper-item-margin-start, unset);
        /* a11y-fallback: idem — reproduit l'alignement de texte par défaut */
        text-align: var(--ar-stepper-item-text-align, start);
    }

    [part~='indicator'] {
        /* a11y-fallback: posé par ar-stepper seulement sous reverse-align, sinon ordre normal */
        order: var(--ar-stepper-item-indicator-order, 0);
        /* a11y-fallback: idem — reproduit la marge d'indicateur par défaut */
        margin-inline-end: var(--ar-stepper-item-indicator-margin-end, 0.5rem);
        /* a11y-fallback: idem — reproduit l'absence de marge d'indicateur par défaut */
        margin-inline-start: var(--ar-stepper-item-indicator-margin-start, 0);
    }
`;
