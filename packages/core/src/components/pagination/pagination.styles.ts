import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    .pagination {
        padding-left: 0;
        list-style: none;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 0;
    }

    .pagination .btn-tertiary {
        aspect-ratio: 1/1;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 0.125rem;
    }

    @media only screen and (max-width: 640px) {
        .pagination
            li:not(.active):not([aria-hidden='true']):not(:first-child):not(:last-child):not(
                :nth-child(2)
            ):not(:nth-last-child(2)) {
            display: none;
        }
    }

    /* ── Boutons prev/next/page (tokens scopés au composant) ──────────────────
     * Sélecteurs volontairement plus spécifiques que a.btn-tertiary dans
     * button.styles.ts (ajout de .pagination + .btn) pour gagner la cascade
     * indépendamment de l'ordre des styles. Ne cible que les <a> (prev/next/
     * page non active) — la page courante est un <span>, gérée séparément par
     * --ar-pagination-active-color ci-dessous. --ar-pagination-color et
     * --ar-pagination-bg permettent de rendre la pagination lisible sur un
     * fond sombre ponctuel, indépendamment du thème global (ex-variant="dark",
     * retiré au profit de tokens purs, sur le même principe que les tokens de
     * couleur exposés par d'autres composants). */

    .pagination a.btn.btn-tertiary {
        color: var(--ar-pagination-color);
        background-color: var(--ar-pagination-bg);
    }

    .pagination a.btn.btn-tertiary:hover {
        background-color: var(--ar-pagination-bg-hover);
    }

    .pagination
        a.btn.btn-tertiary:not(:disabled):not(.disabled):not([aria-disabled='true']):active {
        background-color: var(--ar-pagination-bg-pressed);
    }

    .pagination a.btn.btn-tertiary:focus {
        background-color: var(--ar-pagination-bg-focus);
    }

    .pagination-item.active .btn-tertiary {
        z-index: 3;
        color: var(--ar-pagination-active-color);
        background-color: var(--ar-pagination-active-bg);
        border: 1px solid var(--ar-pagination-active-color);
        font-weight: 700;
    }

    .pagination-item[aria-hidden='true'] .btn-tertiary:not([aria-disabled='true']) {
        background: none !important;
        box-shadow: none !important;
        cursor: default !important;
        border-color: transparent !important;
        color: var(--ar-pagination-color) !important;
    }
`;
