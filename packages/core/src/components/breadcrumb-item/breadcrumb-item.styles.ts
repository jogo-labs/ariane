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

    /* position: relative ancre le connecteur mobile, positionné par le thème. */
    .item {
        position: relative;
        display: flex;
        align-items: center;
    }

    [part='link'],
    [part='current'] {
        display: inline-flex;
        align-items: center;
    }

    /* functional-default: sans thème, item et séparateur ne doivent jamais être collés. */
    [part='separator'] {
        flex-shrink: 0;
        margin-inline: 0.5em;
    }

    [part~='indicator'] {
        flex-shrink: 0;
    }

    .item--mobile [part='link'],
    .item--mobile [part='current'] {
        flex-grow: 1;
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — cible tactile des lignes de la liste mobile */
        padding: 0.5rem 0.25rem;
    }
`;
