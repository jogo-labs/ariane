import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='collapse'] {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    [part='collapsible'] {
        /* [part='collapse'] utilise align-items: flex-start pour que le trigger (souvent un bouton
           compact) garde sa largeur naturelle plutôt que de s'étirer sur toute la largeur —
           mais ce même align-items rétrécit aussi la zone collapsible à la largeur de son contenu
           (fit-content) au lieu de la largeur du conteneur. align-self: stretch réaffirme
           l'étirement, sans changer le comportement du trigger. */
        align-self: stretch;
        overflow: hidden;
        transition: height var(--ar-collapse-duration) var(--ar-collapse-easing);
    }

    [part='collapsible'][hidden] {
        display: none;
    }
`;
