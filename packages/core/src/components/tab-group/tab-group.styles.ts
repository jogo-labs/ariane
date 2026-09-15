import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='tab-group'] {
        display: flex;
        flex-direction: column;
    }

    [part='nav'] {
        overflow-x: auto;
        scrollbar-width: none;
    }

    [part='nav']::-webkit-scrollbar {
        display: none;
    }

    [part='tabs'] {
        display: flex;
        flex-direction: row;
        /* width: auto (implicite) ne dépasse jamais la largeur disponible du
           conteneur, même si le contenu est plus large — les onglets débordent
           alors silencieusement de cette boîte au lieu de l'agrandir, et la
           bordure (dessinée sur les bords de cette boîte) s'arrête à la
           largeur visible avant tout scroll, sans jamais suivre le
           débordement. min-width seul ne change rien : il ne fait que poser
           un plancher, jamais un moyen de grandir au-delà. width: max-content
           force la boîte à adopter la largeur naturelle de son contenu (donc
           à déborder correctement dans [part='nav'], overflow-x: auto) ;
           min-width: 100% reste nécessaire pour que la bordure occupe toute
           la largeur disponible quand les onglets ne débordent pas. */
        width: max-content;
        min-width: 100%;
        border-top: var(--ar-tab-group-border-top-width) solid var(--ar-tab-group-border-color);
        border-bottom: var(--ar-tab-group-border-bottom-width) solid
            var(--ar-tab-group-border-color);
    }
`;
