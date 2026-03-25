import { css } from 'lit';

export default css`
    :host {
        display: block;
        max-width: 500px;
        min-width: 200px;
        box-sizing: border-box;
    }

    .progressbar-container {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        row-gap: 0.75rem;
    }

    .progress {
        display: -webkit-inline-box;
        display: -ms-inline-flexbox;
        display: inline-flex;
        position: relative;
        height: 0.5rem;
        background-color: var(--ar-progressbar-track-color, #e6e7ec);
        border-radius: 50rem;
    }

    .progress-bar {
        background-color: var(--ar-progressbar-fill-color, #283276);
        border-radius: 50rem;
    }

    .progress-label {
        display: -webkit-inline-box;
        display: -ms-inline-flexbox;
        display: inline-flex;
        -webkit-box-pack: justify;
        -ms-flex-pack: justify;
        justify-content: space-between;
        -ms-flex-wrap: nowrap;
        flex-wrap: nowrap;
        -webkit-column-gap: 2rem;
        -moz-column-gap: 2rem;
        column-gap: 2rem;
        margin: 0;
    }

    .progress-label .content-label {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-all;
    }

    @media (min-width: 576px) {
        .progress-label .content-label {
            -webkit-line-clamp: none;
            line-clamp: none;
        }
    }

    .progress-label .progress-percent {
        color: var(--ar-progressbar-percent-color, #5b5d65);
        -ms-flex-negative: 0;
        flex-shrink: 0;
    }
`;
