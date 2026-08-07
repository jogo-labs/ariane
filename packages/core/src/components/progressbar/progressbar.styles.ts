import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
        /* a11y-fallback: sans plafond, [part='label'] peut s'étirer sur un conteneur très large et éloigner visuellement le pourcentage de son label (lien a11y label/valeur) */
        max-width: var(--ar-progressbar-max-width, 500px);
    }

    [part='container'] {
        display: flex;
        flex-direction: column;
    }

    [part='track'] {
        display: inline-flex;
        position: relative;
        height: 0.5rem;
        background-color: var(--ar-progressbar-track-color, ButtonFace);
    }

    [part='bar'] {
        background-color: var(--ar-progressbar-fill-color, ButtonText);
    }

    [part='label'] {
        display: inline-flex;
        justify-content: space-between;
        flex-wrap: nowrap;
        margin: 0;
    }

    [part='label-text'] {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-all;
    }

    @media (min-width: 576px) {
        [part='label-text'] {
            -webkit-line-clamp: none;
            line-clamp: none;
        }
    }

    [part='percent'] {
        flex-shrink: 0;
    }
`;
