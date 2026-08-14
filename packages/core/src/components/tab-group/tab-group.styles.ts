import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    [part='tab-group'] {
        display: flex;
        flex-direction: column;
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
        min-width: 100%;
        border-top: var(--ar-tab-group-border-top-width) solid var(--ar-tab-group-border-color);
        border-bottom: var(--ar-tab-group-border-bottom-width) solid
            var(--ar-tab-group-border-color);
    }
`;
