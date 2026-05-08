import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='base'] {
        display: flex;
        flex-direction: column;
        gap: var(--ar-tab-group-gap, 0);
    }

    [part='nav'] {
        overflow-x: auto;
        scrollbar-width: none;
    }

    [part='nav']::-webkit-scrollbar {
        display: none;
    }

    [part='tabs'] {
        display: flex;
        flex-direction: row;
    }
`;
