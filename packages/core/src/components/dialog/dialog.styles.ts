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
            background: var(--ar-dialog-backdrop);
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
            background: var(--ar-color-bg);
            color: var(--ar-color-text);
            box-shadow: var(--ar-dialog-shadow);
        }

        /* ── Modal ────────────────────────────────────────────────────────────── */

        :host(:not([mode='drawer'])) dialog {
            border-radius: var(--ar-border-radius-lg);
            /* max-width artificiel : la modale ne prend jamais toute la largeur même sur mobile */
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
            /* Sur petit écran, le drawer peut occuper 100% de la largeur */
            width: min(var(--ar-dialog-width), 100vw);
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
            gap: 0.75rem;
            padding: 1.25rem 1.25rem 0;
            flex-shrink: 0;
        }

        h1 {
            margin: 0;
            font-size: var(--ar-font-size-md);
            font-weight: 600;
            line-height: 1.4;
            color: inherit;
        }

        button {
            flex-shrink: 0;
            align-self: flex-start;
            /* @EvolutionDesign: taille forcée à 40×40 en attendant la migration vers la nouvelle charte */
            min-height: 2.5rem;
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

        /* ── Bouton de fermeture (tokens scopés au composant) ────────────────────
         * Sélecteurs volontairement plus spécifiques que .btn-tertiary dans
         * button.styles.ts (ajout de [part='close'].btn) pour gagner la cascade
         * indépendamment de l'ordre des styles. */

        [part='close'].btn.btn-tertiary {
            background-color: var(--ar-dialog-close-bg);
        }

        [part='close'].btn.btn-tertiary:hover {
            background-color: var(--ar-dialog-close-bg-hover);
        }

        [part='close'].btn.btn-tertiary:not(:disabled):not(.disabled):not(
                [aria-disabled='true']
            ):active {
            background-color: var(--ar-dialog-close-bg-pressed);
        }

        [part='close'].btn.btn-tertiary:focus {
            background-color: var(--ar-dialog-close-bg-focus);
        }

        /* ── Shake (fermeture bloquée) ────────────────────────────────────────── */

        dialog.shake {
            animation: dialogShake 0.4s ease-out;
        }

        /* ── prefers-reduced-motion ───────────────────────────────────────────── */

        @media (prefers-reduced-motion: reduce) {
            dialog,
            dialog::backdrop {
                animation: none !important;
                transition: none !important;
            }

            dialog.shake {
                animation: none;
                outline: 3px solid var(--ar-color-danger-text);
                outline-offset: 2px;
            }
        }
    `,
];
