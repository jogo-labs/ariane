import { css } from 'lit';
import { dialogAnimations } from './dialog.animations.js';

export default [
    dialogAnimations,
    css`
        /* ── Host & tailles ───────────────────────────────────────────────────── */

        :host {
            display: block;

            /* Taille par défaut (repli fonctionnel sans thème) — les paliers sm/lg/xl sont
               une taxonomie fournie par default.css, pas une exigence du composant. */
            /* functional-default: largeur modale non contrainte casserait le layout sans thème (ADR-005, amendement 2026-07-29) */
            --ar-dialog-width: 500px;
        }

        /* Taille par défaut du drawer — a priorité sur la valeur modal via la spécificité */
        :host([mode='drawer']) {
            /* functional-default: largeur drawer non contrainte casserait le layout sans thème (ADR-005, amendement 2026-07-29) */
            --ar-dialog-width: 720px;
        }

        /* ── Backdrop ─────────────────────────────────────────────────────────── */

        dialog::backdrop {
            /* a11y-fallback: sans thème chargé, le backdrop serait transparent (défaut UA de ::backdrop) — perte de l'indication visuelle de modalité */
            background: var(--ar-dialog-backdrop, rgba(0, 0, 0, 0.5));
            opacity: 0;
            transition: opacity 0.25s ease;
        }

        dialog[open]:not(.closing)::backdrop {
            opacity: 1;
        }

        dialog[open].closing::backdrop {
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        /* ── Base dialog ──────────────────────────────────────────────────────── */

        /* Masquer explicitement quand non ouvert — évite que display:flex écrase le display:none natif */
        dialog:not([open]) {
            display: none;
        }

        dialog {
            display: flex;
            flex-direction: column;
            border: none;
            padding: 0;
            overflow: hidden;
            background: var(--ar-dialog-bg, Canvas);
            color: var(--ar-dialog-color, CanvasText);
            /* max-width: override le défaut UA qui plafonne à calc(100% - 6px - 2em) —
               même raison que l'override de max-height plus bas. Posé ici (commun aux deux
               modes) car chaque mode a sa propre logique de width ci-dessous, mais tous
               deux ont besoin de désactiver ce plafond natif pour que leur propre valeur
               s'applique sans interférence. */
            max-width: 100%;
        }

        /* ── Modal ────────────────────────────────────────────────────────────── */

        :host(:not([mode='drawer'])) dialog {
            /* Marge latérale conservée à toutes les tailles d'écran, y compris mobile :
               un modal flotte au centre de la page (contrairement au drawer, ancré à un
               bord) — un plein écran collé aux bords rend mal visuellement dans ce cas. */
            width: min(var(--ar-dialog-width), calc(100vw - 2rem));
            max-height: min(90vh, calc(100dvh - 2rem));
        }

        :host(:not([mode='drawer'])) dialog.opening {
            animation: showModal 0.25s ease-out;
        }

        :host(:not([mode='drawer'])) dialog[open].closing {
            animation: hideModal 0.2s ease-in forwards;
        }

        /* ── Drawer ───────────────────────────────────────────────────────────── */

        :host([mode='drawer']) dialog {
            /* min() encode nativement le mobile-first, sans media query : quand
               --ar-dialog-width dépasse 100% (petit écran), le drawer occupe toute la
               largeur (ancré à un bord, le plein écran y reste cohérent contrairement au
               modal) ; au-delà, il est contraint à sa taille de palier. Le calcul est
               déjà continu et réactif au redimensionnement, pas besoin de palier fixe. */
            width: min(var(--ar-dialog-width), 100%);
            height: 100dvh;
            /* max-height: override le défaut UA qui plafonne à calc(100% - 6px - 2em) */
            max-height: 100dvh;
            margin: 0;
        }

        /* Placement droite (défaut du composant) */
        :host([mode='drawer']:not([placement='left'])) dialog {
            margin-inline-start: auto;
        }

        /* Placement gauche */
        :host([mode='drawer'][placement='left']) dialog {
            margin-inline-end: auto;
        }

        :host([mode='drawer']:not([placement='left'])) dialog.opening {
            animation: showDrawerRight 0.3s ease-out;
        }

        :host([mode='drawer']:not([placement='left'])) dialog[open].closing {
            animation: hideDrawerRight 0.25s ease-in forwards;
        }

        :host([mode='drawer'][placement='left']) dialog.opening {
            animation: showDrawerLeft 0.3s ease-out;
        }

        :host([mode='drawer'][placement='left']) dialog[open].closing {
            animation: hideDrawerLeft 0.25s ease-in forwards;
        }

        /* ── Header ───────────────────────────────────────────────────────────── */

        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }

        h1 {
            margin: 0;
        }

        [part='close'] {
            display: flex;
            align-items: center;
            justify-content: center;
            align-self: flex-start;
            flex-shrink: 0;
            /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
            width: var(--ar-dialog-close-size, 2.5rem);
            /* a11y-fallback: WCAG 2.5.8 (Target Size Minimum) — sans thème chargé, le bouton perdrait sa taille de cible tactile */
            height: var(--ar-dialog-close-size, 2.5rem);
            padding: 0;
            border: none;
            cursor: pointer;
            transition: background-color var(--ar-dialog-close-transition-duration);
        }

        [part='close']:focus-visible {
            outline: 2px solid currentColor;
            outline-offset: 2px;
        }

        svg {
            width: 1.25rem;
            height: 1.25rem;
            flex-shrink: 0;
        }

        /* ── Body ─────────────────────────────────────────────────────────────── */

        [part='body'] {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            padding-block: var(--ar-dialog-spacing-block, var(--ar-dialog-spacing));
            padding-inline: var(--ar-dialog-spacing-inline, var(--ar-dialog-spacing));
        }

        /* ── Footer ───────────────────────────────────────────────────────────── */

        footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            flex-shrink: 0;
        }

        /* ── Shake (fermeture bloquée) ────────────────────────────────────────── */

        dialog.shake {
            animation: dialogShake 0.4s ease-out;
        }

        /* ── prefers-reduced-motion ───────────────────────────────────────────── */

        @media (prefers-reduced-motion: reduce) {
            dialog,
            dialog::backdrop,
            [part='close'] {
                animation: none !important;
                transition: none !important;
            }

            dialog.shake {
                animation: none;
                outline: 3px solid var(--ar-dialog-shake-outline-color);
                outline-offset: 2px;
            }
        }
    `,
];
