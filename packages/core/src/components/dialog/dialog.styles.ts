import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    /* Animation de l'apparition */
    @keyframes showDialog {
        from {
            transform: translate(0, -50px);
            opacity: 0;
        }
        to {
            transform: translate(0, 0);
            opacity: 1;
        }
    }

    @keyframes hideDialog {
        from {
            transform: translate(0, 0);
            opacity: 1;
        }
        to {
            transform: translate(0, -50px);
            opacity: 0;
        }
    }

    @keyframes showBackdrop {
        from {
            opacity: 0;
        }
        to {
            opacity: 0.5;
        }
    }

    dialog::backdrop {
        opacity: 0;
        background: black;
        transition: opacity linear 0.4s;
    }

    dialog.closing::backdrop {
        opacity: 0;
    }

    dialog:where(:not(.closing))[open]::backdrop {
        opacity: 0.5;
        animation: showBackdrop 0.4s;
    }

    dialog {
        border: none;
        background: none;
        padding: 0;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    }

    dialog:not(.closing)[open] {
        animation: showDialog 0.4s;
    }

    dialog[open].closing {
        opacity: 0;
        animation: hideDialog 0.4s;
    }

    @media (prefers-reduced-motion: reduce) {
        dialog {
            transition: none;
            animation: none;
        }

        dialog::backdrop,
        dialog[open]::backdrop {
            transition: none;
            animation: none;
        }
    }

    .modal-dialog {
        margin: 0 !important;
    }

    .modal-header {
        -moz-column-gap: 0.75rem;
        column-gap: 0.75rem;
    }

    .modal-header .close {
        ms-flex-item-align: start;
        align-self: flex-start;
        min-height: 2.5rem; /* @EvolutionDesign: On force la taille temporairement tant qu'on a pas migré sur la nouvelle charte pour s'assurer d'un bouton en 40x40 */
    }

    .modal-content {
        max-height: calc(100vh - 3.5rem);
    }

    .modal-body {
        overflow-y: auto;
    }
`;
