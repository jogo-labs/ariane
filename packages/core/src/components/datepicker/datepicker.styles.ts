import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    p {
        margin: 0;
    }

    .input-wrapper {
        display: flex;
        align-items: stretch;
    }

    [part='input'] {
        flex: 1;
        min-width: 0;
    }

    [part='trigger'] {
        flex-shrink: 0;
        cursor: pointer;
    }

    :host([disabled]) [part='trigger'] {
        pointer-events: none;
    }

    :host([has-error]) [part='input'] {
        border-color: var(--ar-datepicker-input-error-border-color);
    }

    [part='panel'] {
        width: var(--ar-datepicker-panel-width);
    }
`;
