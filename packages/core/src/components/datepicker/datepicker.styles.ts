import { css } from 'lit';

export default css`
    :host {
        display: flex;
        flex-direction: column;
        gap: var(--ar-datepicker-gap);
    }

    p {
        margin: 0;
    }

    .input-wrapper {
        display: flex;
        align-items: stretch;
    }

    [part='input'] {
        flex: 1;
        min-width: 0;
    }

    [part='trigger'] {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    :host([disabled]) [part='trigger'],
    :host([readonly]) [part='trigger'] {
        pointer-events: none;
    }

    :host([has-error]) [part='input'] {
        border-color: var(--ar-datepicker-input-error-border-color);
    }

    [part='panel'] {
        width: var(--ar-datepicker-panel-width);
        /* a11y-fallback: évite que la grille de ~35 jours s'étale sur toute la largeur de la page sans thème chargé */
        max-width: var(--ar-datepicker-panel-max-width, 25rem);
        padding: var(--ar-datepicker-panel-padding);
    }

    [part='header'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.25rem;
        font-size: var(--ar-datepicker-header-font-size);
        margin: var(--ar-datepicker-header-margin);
        padding: var(--ar-datepicker-header-padding);
        background: var(--ar-datepicker-header-bg);
        border-radius: var(--ar-datepicker-header-radius);
    }

    [part='header'] span[aria-live] {
        flex: 1;
        text-align: center;
    }

    [part~='nav-btn'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--ar-datepicker-nav-btn-size);
        aspect-ratio: 1 / 1;
        cursor: pointer;
        font: inherit;
        border-radius: var(--ar-datepicker-nav-btn-radius);
        background: var(--ar-datepicker-nav-btn-bg);
        border: var(--ar-datepicker-nav-btn-border-width) solid
            var(--ar-datepicker-nav-btn-border-color);
        color: var(--ar-datepicker-nav-btn-color);
    }

    [part~='nav-btn']:hover {
        background: var(--ar-datepicker-nav-btn-hover-bg);
    }

    [part~='nav-btn']:active {
        background: var(--ar-datepicker-nav-btn-active-bg);
    }

    [part~='nav-btn']:focus-visible {
        outline: 2px solid var(--ar-focus-ring-color, ButtonText);
        outline-offset: var(--ar-focus-ring-offset);
    }

    [part~='footer-btn'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font: inherit;
        padding: var(--ar-datepicker-footer-btn-padding);
        border-radius: var(--ar-datepicker-footer-btn-radius);
        background: var(--ar-datepicker-footer-btn-bg);
        border: var(--ar-datepicker-footer-btn-border-width) solid
            var(--ar-datepicker-footer-btn-border-color);
        color: var(--ar-datepicker-footer-btn-color);
    }

    [part~='footer-btn']:hover {
        background: var(--ar-datepicker-footer-btn-hover-bg);
        border-color: var(--ar-datepicker-footer-btn-hover-border-color);
    }

    [part~='footer-btn']:active {
        background: var(--ar-datepicker-footer-btn-active-bg);
    }

    [part~='footer-btn']:focus-visible {
        outline: 2px solid var(--ar-focus-ring-color, ButtonText);
        outline-offset: var(--ar-focus-ring-offset);
    }

    [part='grid'] {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
    }

    [part='grid'] th {
        text-align: center;
        font-size: var(--ar-datepicker-weekday-font-size);
        font-weight: normal;
        padding-block: 0.5rem;
        text-transform: uppercase;
        color: var(--ar-datepicker-weekday-color);
    }

    [part='day'] {
        font-size: var(--ar-datepicker-day-font-size);
        color: var(--ar-color-text);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — [part='grid'] a border-collapse: collapse, qui supprime l'espacement natif du <table> ; sans thème la cellule se dimensionnerait à son seul contenu textuel */
        width: var(--ar-datepicker-day-size, 2.5rem);
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — [part='grid'] a border-collapse: collapse, qui supprime l'espacement natif du <table> ; sans thème la cellule se dimensionnerait à son seul contenu textuel */
        height: var(--ar-datepicker-day-size, 2.5rem);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: auto;
        cursor: pointer;
        border-radius: var(--ar-datepicker-day-radius);
        background-color: var(--ar-datepicker-day-bg);
        border: var(--ar-datepicker-day-border-width) solid var(--ar-datepicker-day-border-color);
    }

    [part='day'].today {
        color: var(--ar-datepicker-day-today-color);
        border-color: var(--ar-datepicker-day-today-border);
        background: var(--ar-datepicker-day-today-bg);
    }

    /* Efface la bordure au hover, sauf sur la cellule active de la grille */
    [part='day']:not([aria-disabled='true']):not(.disabled):not([tabindex='0']):hover {
        border-color: transparent;
    }

    [part='day']:not([aria-disabled='true']):not(.disabled):hover {
        background-color: var(--ar-datepicker-day-hover-bg);
        color: var(--ar-datepicker-day-hover-color);
    }

    /*
     * Position courante dans la grille (roving tabindex).
     * :focus-within couvre le focus programmatique (ouverture du picker) ET le focus clavier,
     * contrairement à :focus-visible qui ne s'active pas pour le focus programmatique.
     */
    [part='grid']:focus-within [part='day'][tabindex='0'] {
        outline: solid
            /* a11y-fallback: WCAG 2.4.7 (Focus Visible) — var() dans un raccourci outline invalide tout le raccourci si non résolu, y compris la largeur */
            var(--ar-datepicker-day-focus-ring-width, 2px)
            var(--ar-datepicker-day-focus-ring-color, ButtonText);
        outline-offset: var(--ar-datepicker-day-focus-ring-offset);
        border-color: var(--ar-color-bg);
    }

    [part='grid']:focus-within [part='day'][tabindex='0']:not(.selected) {
        background-color: var(--ar-datepicker-day-hover-bg);
        color: var(--ar-datepicker-day-hover-color);
    }

    /*
     * Curseur de navigation visible quand le focus est hors de la grille (boutons nav/footer).
     * Indique quel jour prendra le focus au prochain Tab dans la grille.
     */
    [part='day'][tabindex='0']:not(:focus-visible) {
        outline: 1px dashed var(--ar-datepicker-day-focus-ring-color, ButtonText);
        outline-offset: var(--ar-datepicker-day-focus-ring-offset);
    }

    [part='day'].selected {
        background-color: var(--ar-datepicker-day-selected-bg);
        color: var(--ar-datepicker-day-selected-color);
        border-color: transparent;
    }

    [part='day'].selected:not([aria-disabled='true']):not(.disabled):hover {
        background-color: var(--ar-datepicker-day-selected-bg);
        /* border-color: transparent; */
    }

    [part='day'].other-month {
        color: var(--ar-datepicker-day-other-month-color);
    }

    [part='day'].disabled,
    [part='day'][aria-disabled='true'] {
        opacity: 0.4;
        cursor: not-allowed;
    }

    [part='footer'] {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        margin: var(--ar-datepicker-footer-margin);
        padding: var(--ar-datepicker-footer-padding);
        background: var(--ar-datepicker-footer-bg);
    }
`;
