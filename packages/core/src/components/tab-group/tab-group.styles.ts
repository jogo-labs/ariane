import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='base'] {
        display: flex;
        flex-direction: column;
        gap: var(--ar-tab-group-gap);
    }

    [part='nav'] {
        overflow-x: auto;
        scrollbar-width: none;
        border-bottom: var(--ar-tab-group-border-width) solid var(--ar-tab-group-border-color);
    }

    [part='nav']::-webkit-scrollbar {
        display: none;
    }

    [part='tabs'] {
        display: flex;
        flex-direction: row;
    }
`;
