import { css } from 'lit';

export default css`
    :host {
        display: inline-flex;
        cursor: pointer;
        white-space: nowrap;
        user-select: none;
    }

    :host([disabled]) {
        cursor: not-allowed;
        opacity: 0.5;
    }

    :host(:focus-visible) {
        outline: 2px solid currentColor;
        outline-offset: -2px;
    }
`;
