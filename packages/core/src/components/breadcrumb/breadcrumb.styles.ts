import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    [part~='list'] {
        margin: 0;
        padding: 0;
    }

    [part~='list--desktop'] {
        display: flex;
        flex-flow: row wrap;
    }

    [part~='list--mobile'] {
        display: flex;
        flex-direction: column;
    }

    /* Le connecteur est un point d'ancrage décoratif pour le thème (trait, position verticale,
       couleur) : rester hors du flux, ancré au panel (positionné, cf. panel.styles.ts), relève de
       son rôle plutôt que d'un choix visuel — comme pour [part='panel'] lui-même. */
    [part='connector'] {
        position: absolute;
        inset-inline-start: 0;
    }

    /* ── Wrapper dropdown mobile ────────────────────────────── */

    .dropdown {
        display: inline-flex;
        position: relative;
    }

    /* ── Boutons home/trigger mobile ──────────────────────────────────── */

    [part='home'],
    [part='trigger'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-height: var(--ar-breadcrumb-toggle-min-size, 2.5rem);
    }

    [part='trigger'] {
        padding: 0;
        aspect-ratio: 1 / 1;
        /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
        min-width: var(--ar-breadcrumb-toggle-min-size, 2.5rem);
    }

    svg {
        height: 1.25em;
        overflow: visible;
        width: auto;
    }
`;
