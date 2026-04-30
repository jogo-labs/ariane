import { css } from 'lit';

export default css`
    @keyframes spinnerRotate {
        to {
            transform: rotate(1turn);
        }
    }

    @keyframes spinnerDash {
        0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
        }

        50% {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -35px;
        }

        to {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -124px;
        }
    }

    @keyframes spinnerPulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.35;
        }
    }

    @keyframes arPanelShow {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;
