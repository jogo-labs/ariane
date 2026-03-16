import { css } from 'lit';

export default css`
    @-webkit-keyframes spinnerRotate {
        to {
            -webkit-transform: rotate(1turn);
            transform: rotate(1turn)
        }
    }

    @keyframes spinnerRotate {
        to {
            -webkit-transform: rotate(1turn);
            transform: rotate(1turn)
        }
    }

    @-webkit-keyframes spinnerDash {
        0% {
            stroke-dasharray: 1,200;
            stroke-dashoffset: 0
        }

        50% {
            stroke-dasharray: 89,200;
            stroke-dashoffset: -35px
        }

        to {
            stroke-dasharray: 89,200;
            stroke-dashoffset: -124px
        }
    }

    @keyframes spinnerDash {
        0% {
            stroke-dasharray: 1,200;
            stroke-dashoffset: 0
        }

        50% {
            stroke-dasharray: 89,200;
            stroke-dashoffset: -35px
        }

        to {
            stroke-dasharray: 89,200;
            stroke-dashoffset: -124px
        }
    }

    @-webkit-keyframes tabMaskFading {
        to {
            -webkit-mask-position: 0;
            mask-position: 0
        }
    }
`;
