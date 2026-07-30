import { css } from 'lit';
import { dialogAnimations } from './dialog.animations.js';

export default [
    dialogAnimations,
    css`
        /* ── Host & tailles ───────────────────────────────────────────────────── */

        :host {
            display: block;

            /* Taille modale par défaut (md). Surchargeable par --ar-dialog-width sur l'instance. */
            --ar-dialog-width: var(--ar-dialog-width-md);
        }

        /* Tailles modal */
        :host([size='sm']) {
            --ar-dialog-width: var(--ar-dialog-width-sm);
        }
        :host([size='md']) {
            --ar-dialog-width: var(--ar-dialog-width-md);
        }
        :host([size='lg']) {
            --ar-dialog-width: var(--ar-dialog-width-lg);
        }
        :host([size='xl']) {
            --ar-dialog-width: var(--ar-dialog-width-xl);
        }

        /* Tailles drawer — ont priorité sur les valeurs modal via la spécificité */
        :host([mode='drawer']) {
            --ar-dialog-width: var(--ar-dialog-drawer-width-md);
        }
        :host([mode='drawer'][size='sm']) {
            --ar-dialog-width: var(--ar-dialog-drawer-width-sm);
        }
        :host([mode='drawer'][size='md']) {
            --ar-dialog-width: var(--ar-dialog-drawer-width-md);
        }
        :host([mode='drawer'][size='lg']) {
            --ar-dialog-width: var(--ar-dialog-drawer-width-lg);
        }
        :host([mode='drawer'][size='xl']) {
            --ar-dialog-width: var(--ar-dialog-drawer-width-xl);
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
            /* Mobile-first : plein écran par défaut, commun aux deux modes. */
            width: 100vw;
        }

        /* ── Modal ────────────────────────────────────────────────────────────── */

        :host(:not([mode='drawer'])) dialog {
            max-height: 100dvh;
        }

        @media (min-width: 576px) {
            :host(:not([mode='drawer'])) dialog {
                /* max-width artificiel : au-delà du mobile, la modale ne prend jamais toute la
                   largeur — utile pour les paliers lg/xl sur les viewports moyens (tablette
                   portrait, fenêtre desktop réduite) où le token de taille dépasse le viewport ;
                   sans effet pratique sur sm/md, déjà plus étroits que calc(100vw - 2rem) à 576px. */
                width: min(var(--ar-dialog-width), calc(100vw - 2rem));
                max-height: min(90vh, calc(100dvh - 2rem));
            }
        }

        :host(:not([mode='drawer'])) dialog.opening {
            animation: showModal 0.25s ease-out;
        }

        :host(:not([mode='drawer'])) dialog[open].closing {
            animation: hideModal 0.2s ease-in forwards;
        }

        /* ── Drawer ───────────────────────────────────────────────────────────── */

        :host([mode='drawer']) dialog {
            height: 100dvh;
            /* max-height: override le défaut UA qui plafonne à calc(100% - 6px - 2em) */
            max-height: 100dvh;
            margin: 0;
        }

        @media (min-width: 576px) {
            :host([mode='drawer']) dialog {
                width: min(var(--ar-dialog-width), 100vw);
            }
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
            gap: 0.75rem;
            padding: 1.25rem 1.25rem 0;
            flex-shrink: 0;
        }

        h1 {
            margin: 0;
            font-size: var(--ar-dialog-title-font-size);
            font-weight: 600;
            line-height: 1.4;
            color: inherit;
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
            gap: 0.75rem;
            padding: 0 1.25rem 1.25rem;
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
