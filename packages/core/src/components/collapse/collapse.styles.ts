import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='base'] {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }

    [part='panel'] {
        overflow: hidden;
    }

    [part='panel'][hidden] {
        display: none;
    }
`;
