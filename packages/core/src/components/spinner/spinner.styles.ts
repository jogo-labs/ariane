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
        animation: spinnerRotate 2s linear infinite;
        transform-box: fill-box;
        transform-origin: center center;
    }

    .spinner-path {
        stroke-width: 4;
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
        stroke-linecap: round;
        stroke: var(--ar-spinner-stroke-color);
        animation: spinnerDash 1.5s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
        .spinner {
            animation: spinnerPulse 1.5s ease-in-out infinite;
        }

        .spinner-path {
            animation: none;
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -35px;
        }
    }

    :host([size='lg']) {
        .spinner {
            width: 5rem;
            height: 5rem;
        }

        .spinner-path {
            stroke-width: 2;
        }
    }

    :host([size='sm']) {
        .spinner {
            width: 2rem;
            height: 2rem;
        }
    }

    :host([size='xs']) {
        .spinner {
            width: 1rem;
            height: 1rem;
        }

        .spinner-path {
            stroke-width: 6;
        }
    }
`;
