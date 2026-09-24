import { css } from 'lit';

export default css`
    *,
    *::before,
    *::after {
        box-sizing: border-box;
    }

    button {
        margin: 0;
        overflow: visible;
        text-transform: none;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        -webkit-appearance: button;
    }

    button:not(:disabled) {
        cursor: pointer;
    }

    button:focus:not(:focus-visible) {
        outline: 0;
    }

    button::-moz-focus-inner {
        padding: 0;
        border-style: none;
    }
`;
