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

    [part='link'],
    [part='current'] {
        display: inline-flex;
        align-items: center;
        color: inherit;
        background-color: inherit;
    }

    [part='separator'] {
        display: inline-block;
        flex-shrink: 0;
        margin: 0.125rem 0.5rem 0;
        height: 65%;
        width: 1px;
        transform: rotate(15deg);
        transform-origin: center;
    }

    [part~='indicator'] {
        flex-shrink: 0;
        width: 0.375rem;
        height: 0.375rem;
        margin: 0 0.75rem;
    }

    [part~='indicator--current'] {
        width: 0.625rem;
        height: 0.625rem;
        margin: 0 0.625rem;
    }

    .item--mobile [part='link'],
    .item--mobile [part='current'] {
        flex-grow: 1;
        padding: 0.5rem 0.25rem;
    }
`;
