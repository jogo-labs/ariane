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
        transition: height var(--ar-collapse-duration) var(--ar-collapse-easing);
    }

    [part='panel'][hidden] {
        display: none;
    }
`;
