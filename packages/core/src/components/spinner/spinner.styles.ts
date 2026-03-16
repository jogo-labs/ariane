import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    svg {
        overflow: hidden;

        &[hidden] {
            display: none;
        }
    }

    .spinner {
        width: 56px;
        height: 56px;
        -webkit-animation: spinnerRotate 2s linear infinite;
        animation: spinnerRotate 2s linear infinite;
        -webkit-transform-origin: center center;
        transform-origin: center center
    }

    .spinner-path {
        stroke-width: 4;
        stroke-dashoffset: 0;
        stroke-linecap: round;
        stroke: var(--mr--spinner-stroke, #5b5d65);
        -webkit-animation: spinnerDash 1.5s ease-in-out infinite;
        animation: spinnerDash 1.5s ease-in-out infinite
    }

    @media (prefers-reduced-motion:no-preference) {
        .spinner-path {
            stroke-dasharray: 1,200
        }
    }

    @media (prefers-reduced-motion:reduce) {
        .spinner-path {
            stroke-dasharray: 89,200
        }
    }

    :host([size="lg"]) {
        .spinner {
            width: 5rem;
            height: 5rem

        }

        .spinner-path {
            stroke-width: 2;
        }
    }

    :host([size="sm"]) {
        .spinner {
            width: 2rem;
            height: 2rem
        }
    }

    :host([size="xs"]) {
        .spinner {
            width: 1rem;
            height: 1rem
        }

        .spinner-path {
            stroke-width: 6
        }
    }
`;
