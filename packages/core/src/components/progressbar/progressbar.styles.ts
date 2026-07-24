import { css } from 'lit';

export default css`
    :host {
        display: block;
        max-width: 500px;
        min-width: 200px;
        box-sizing: border-box;
    }

    .progressbar-container {
        display: flex;
        flex-direction: column;
        row-gap: 0.75rem;
    }

    .progress {
        display: inline-flex;
        position: relative;
        height: 0.5rem;
        background-color: var(--ar-progressbar-track-color, ButtonFace);
        border-radius: 50rem;
    }

    .progress-bar {
        background-color: var(--ar-progressbar-fill-color, ButtonText);
        border-radius: 50rem;
    }

    .progress-label {
        display: inline-flex;
        justify-content: space-between;
        flex-wrap: nowrap;
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
        color: var(--ar-progressbar-percent-color);
        flex-shrink: 0;
    }
`;
