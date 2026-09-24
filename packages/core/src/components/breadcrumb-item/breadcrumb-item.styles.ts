import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    /* Le premier item est rendu par le bouton "home" d'ar-breadcrumb en mobile : masqué pour ne
       pas exposer un listitem vide. :host { display: contents } l'emporterait sinon sur le style
       navigateur de [hidden]. */
    :host([hidden]) {
        display: none;
    }

    .item {
        display: flex;
        align-items: center;
    }

    /* functional-default: sans thème, item et séparateur ne doivent jamais être collés. */
    [part='separator'] {
        flex-shrink: 0;
        margin-inline: 0.5em;
    }

    [part~='control'] {
        display: inline-flex;
    }

    /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — cible tactile des lignes de la liste mobile */
    .item--mobile [part~='control'] {
        min-height: 2.5rem;
    }

    [part~='indicator'] {
        display: flex;
        flex-shrink: 0;
        justify-content: center;
        transform: translateY(1px);
        background-color: transparent;
        text-decoration: none;
    }
`;
