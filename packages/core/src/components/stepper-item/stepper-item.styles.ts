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
        /* Empêche le soulignement de ::part(step-link) de peindre à travers ce
         * flex-item (le conteneur <a> est en inline-flex, sans cette règle le trait
         * traverse aussi le chiffre du compteur). */
        text-decoration: none;
    }

    /* functional-default: pont interne — la forme/taille/couleur de l'indicateur sont du
       ressort du thème (::part(indicator) dans default.css, y compris pour les sous-étapes
       via le sélecteur structurel ar-stepper-item > ar-stepper-item::part(indicator)). Seule
       la numérotation par défaut (chiffre visible sur les étapes principales, puce nue sur
       les sous-étapes) reste ici : c'est un comportement interne, pas une valeur de design,
       et [part~='list--substep'] (élément réel, pas un détournement de part sur le host) ne
       peut relayer cette information à ses enfants slottés que via une custom property —
       :host-context() n'étant pas viable cross-navigateur. */
    [part~='indicator']:before {
        content: counter(step);
        /* a11y-fallback: posé par ar-stepper-item lui-même seulement quand imbriqué (sous-étape), sinon numéro visible */
        display: var(--ar-stepper-item-indicator-number-display, inline);
        /* Les pseudo-éléments n'héritent pas toujours de façon fiable le
           text-decoration: none posé sur [part~='indicator'] (cf. commentaire
           ci-dessus) — le chiffre lui-même ne doit jamais être souligné. */
        text-decoration: none;
    }

    /* Un contenu projeté dans le slot indicator (icône custom) remplace toujours le chiffre
       par défaut — jamais les deux en même temps. */
    [part~='indicator'][data-has-content]:before {
        display: none;
    }

    /* Ce reset dédié évite que la liste de sous-étapes hérite du compteur "step" du parent au
       lieu de repartir de zéro, ce qui ferait sauter la numérotation des étapes principales
       suivantes. C'est aussi le pont qui relaie aux enfants slottés (sous-étapes) le fait
       qu'ils sont imbriqués — cf. commentaire plus haut : hérité via l'arbre plat (slot),
       jamais via :host-context(). Le connecteur décoratif, lui, n'a pas besoin de ce pont : le
       thème le cible directement via des sélecteurs structurels (ar-stepper > ar-stepper-item,
       ar-stepper-item > ar-stepper-item — cf. default.css), qui distinguent étape/sous-étape
       sans aucun état à relayer. */
    [part~='list--substep'] {
        counter-reset: step;
        margin: 0;
        /* flex column, comme .desktop côté ar-stepper — sans ça, align-self (posé par le thème
           sur le connecteur externe, cf. default.css) n'a aucun effet : ce n'est pas un axe de
           grille/flex mais du flux normal, où align-self est un no-op silencieux. */
        display: flex;
        flex-flow: column;
        /* functional-default: pont d'état interne — imbrication structurelle relayée aux enfants slottés via une custom property (cf. commentaire plus haut), pas une valeur de thème. */
        --ar-stepper-item-indicator-number-display: none;
    }

    /* La couleur/fond de l'indicateur au survol/focus est portée par le thème
       (::part(indicator):hover/:focus, default.css) — une règle interne équivalente ici serait du
       code mort : un ::part() posé par une feuille @layer l'emporte toujours sur une règle
       interne du shadow tree pour la même propriété, quelle que soit sa spécificité (vérifié
       empiriquement, cf. #226 suivi). */
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

    /* Le connecteur décoratif (ligne pointillée entre étapes) n'est plus défini ici : c'est un
       pseudo-élément du host lui-même (:before/:after), jamais un vrai part — ::part() ne peut
       pas l'atteindre depuis l'extérieur (ni via chaînage ::part(x)::before, invalide en spec).
       Mais un sélecteur externe sur le tag lui-même (ex. ar-stepper-item::after) atteint bien le
       même pseudo-élément que :host::after posé ici, sans passer par ::part() — vérifié
       empiriquement (cf. #226 suivi). C'est donc entièrement défini dans default.css, y compris
       le choix étape/sous-étape (résolu par sélecteur structurel, pas par un pont d'état) et
       l'alignement sous reverse-align (résolu en ciblant directement l'attribut sur ar-stepper,
       pas la custom property interne). */

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
