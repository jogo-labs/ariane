import { css } from 'lit';

export default css`
    /* ── Keyframes ────────────────────────────────────────────────────────── */

    @keyframes showModal {
        from {
            opacity: 0;
            transform: translateY(-16px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes hideModal {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-16px);
        }
    }

    @keyframes showDrawerRight {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes hideDrawerRight {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(100%);
        }
    }

    @keyframes showDrawerLeft {
        from {
            transform: translateX(-100%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes hideDrawerLeft {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(-100%);
        }
    }

    /* ── Host & tailles ───────────────────────────────────────────────────── */

    :host {
        display: block;

        /* Taille modale par défaut (md = 500px). Surchargeable par --width sur l'instance. */
        --width: 500px;
    }

    /* Tailles modal */
    :host([size='sm']) {
        --width: 360px;
    }
    :host([size='md']) {
        --width: 500px;
    }
    :host([size='lg']) {
        --width: 800px;
    }
    :host([size='xl']) {
        --width: 1140px;
    }

    /* Tailles drawer — ont priorité sur les valeurs modal via la spécificité */
    :host([mode='drawer']) {
        --width: 720px;
    }
    :host([mode='drawer'][size='sm']) {
        --width: 360px;
    }
    :host([mode='drawer'][size='md']) {
        --width: 720px;
    }
    :host([mode='drawer'][size='lg']) {
        --width: 960px;
    }
    :host([mode='drawer'][size='xl']) {
        --width: 1440px;
    }

    /* ── Backdrop ─────────────────────────────────────────────────────────── */

    dialog::backdrop {
        background: rgba(0, 0, 0, 0.5);
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
        background: var(--ar-color-surface, #fff);
        color: var(--ar-color-text, #1f2937);
        box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 20px 50px -8px rgba(0, 0, 0, 0.2);
    }

    /* ── Modal ────────────────────────────────────────────────────────────── */

    :host(:not([mode='drawer'])) dialog {
        border-radius: 0.5rem;
        /* max-width artificiel : la modale ne prend jamais toute la largeur même sur mobile */
        width: min(var(--width), calc(100vw - 2rem));
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
        width: min(var(--width), 100vw);
        height: 100dvh;
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

    .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--ar-color-border, #e5e7eb);
        flex-shrink: 0;
    }

    .dialog-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        line-height: 1.4;
        color: inherit;
    }

    .dialog-header .btn-ratio-square {
        flex-shrink: 0;
        align-self: flex-start;
        /* @EvolutionDesign: taille forcée à 40×40 en attendant la migration vers la nouvelle charte */
        min-height: 2.5rem;
    }

    .dialog-header .btn-ratio-square svg {
        width: 1.25rem;
        height: 1.25rem;
        flex-shrink: 0;
    }

    /* ── Body ─────────────────────────────────────────────────────────────── */

    .dialog-body {
        flex: 1;
        min-height: 0; /* autorise le shrink flex pour activer le scroll */
        overflow-y: auto;
        padding: var(--spacing, 1.5rem);
    }

    /* ── Footer ───────────────────────────────────────────────────────────── */

    .dialog-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--ar-color-border, #e5e7eb);
        flex-shrink: 0;
    }

    /* ── Shake (fermeture bloquée) ────────────────────────────────────────── */

    @keyframes dialogShake {
        0%,
        100% {
            transform: none;
        }
        20% {
            transform: translateX(-8px);
        }
        40% {
            transform: translateX(8px);
        }
        60% {
            transform: translateX(-6px);
        }
        80% {
            transform: translateX(4px);
        }
    }

    dialog.shake {
        animation: dialogShake 0.4s ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
        dialog.shake {
            animation: none;
            outline: 3px solid var(--ar-color-danger, #d04442);
            outline-offset: 2px;
        }
    }

    /* ── prefers-reduced-motion ───────────────────────────────────────────── */

    @media (prefers-reduced-motion: reduce) {
        dialog,
        dialog::backdrop {
            animation: none !important;
            transition: none !important;
        }
    }
`;
