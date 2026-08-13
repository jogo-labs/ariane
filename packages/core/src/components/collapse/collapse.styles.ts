import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='base'] {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    [part='panel'] {
        /* [part='base'] utilise align-items: flex-start pour que le trigger (souvent un bouton
           compact) garde sa largeur naturelle plutôt que de s'étirer sur toute la largeur —
           mais ce même align-items rétrécit aussi le panel à la largeur de son contenu (fit-content)
           au lieu de la largeur du conteneur. align-self: stretch réaffirme l'étirement pour le
           panel seul, sans changer le comportement du trigger. */
        align-self: stretch;
        overflow: hidden;
        transition: height var(--ar-collapse-duration) var(--ar-collapse-easing);
    }

    [part='panel'][hidden] {
        display: none;
    }
`;
