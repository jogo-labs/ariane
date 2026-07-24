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
    }

    [part='header'] span[aria-live] {
        flex: 1;
        text-align: center;
    }

    [part~='nav-btn'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1 / 1;
        cursor: pointer;
        font: inherit;
        border-style: solid;
        /* a11y-fallback: border: raccourci scindé en longhands — un var() défaillant dans un raccourci invalide border-style, ce qui ferait disparaître la bordure entièrement sans thème */
        border-color: var(--ar-datepicker-nav-btn-border-color, transparent);
    }

    [part~='nav-btn']:focus-visible {
        outline: 2px solid var(--ar-datepicker-nav-btn-focus-ring-color, ButtonText);
    }

    [part~='footer-btn'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font: inherit;
        border-style: solid;
        /* a11y-fallback: border: raccourci scindé en longhands — un var() défaillant dans un raccourci invalide border-style, ce qui ferait disparaître la bordure entièrement sans thème */
        border-color: var(--ar-datepicker-footer-btn-border-color, transparent);
    }

    [part~='footer-btn']:focus-visible {
        outline: 2px solid var(--ar-datepicker-footer-btn-focus-ring-color, ButtonText);
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
        color: var(--ar-datepicker-day-color);
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
        border-style: solid;
        border-width: var(--ar-datepicker-day-border-width);
        /* a11y-fallback: border: raccourci scindé en longhands — un var() défaillant dans un raccourci invalide border-style, ce qui casse la surcharge border-color de .today ci-dessous */
        border-color: var(--ar-datepicker-day-border-color, transparent);
    }

    [part='day'].today {
        color: var(--ar-datepicker-day-today-color);
        /* a11y-fallback: garde une distinction visible du reste de la grille sans thème */
        border-color: var(--ar-datepicker-day-today-border, GrayText);
        background: var(--ar-datepicker-day-today-bg);
    }

    /* Efface la bordure au hover, sauf sur la cellule active de la grille */
    [part='day']:not([aria-disabled='true']):not(.disabled):not([tabindex='0']):hover {
        border-color: transparent;
    }

    [part='day']:not([aria-disabled='true']):not(.disabled):hover {
        /* a11y-fallback: fond et texte pairés — un fallback de fond seul introduirait une combinaison non testée */
        background-color: var(--ar-datepicker-day-hover-bg, ButtonFace);
        color: var(--ar-datepicker-day-hover-color, ButtonText);
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
        border-color: var(--ar-panel-bg);
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
        /* a11y-fallback: sinon indiscernable des jours non sélectionnés sans thème */
        background-color: var(--ar-datepicker-day-selected-bg, Highlight);
        color: var(--ar-datepicker-day-selected-color, HighlightText);
        border-color: transparent;
    }

    [part='day'].selected:not([aria-disabled='true']):not(.disabled):hover {
        background-color: var(--ar-datepicker-day-selected-bg);
        /* border-color: transparent; */
    }

    [part='day'].other-month {
        /* a11y-fallback: atténuation visible sans thème */
        color: var(--ar-datepicker-day-other-month-color, GrayText);
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
    }
`;
