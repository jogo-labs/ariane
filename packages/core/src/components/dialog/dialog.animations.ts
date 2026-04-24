import { css } from 'lit';

export const dialogAnimations = css`
    @keyframes showModal {
        from {
            opacity: 0;
            transform: translateY(-16px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes hideModal {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-16px);
        }
    }

    @keyframes showDrawerRight {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes hideDrawerRight {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(100%);
        }
    }

    @keyframes showDrawerLeft {
        from {
            transform: translateX(-100%);
        }
        to {
            transform: translateX(0);
        }
    }

    @keyframes hideDrawerLeft {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(-100%);
        }
    }

    @keyframes dialogShake {
        0%,
        100% {
            transform: none;
        }
        20% {
            transform: translateX(-8px);
        }
        40% {
            transform: translateX(8px);
        }
        60% {
            transform: translateX(-6px);
        }
        80% {
            transform: translateX(4px);
        }
    }
`;
