import { css } from 'lit';

export default css`
    :host {
        display: inline-flex;
        cursor: pointer;
        white-space: nowrap;
        user-select: none;
        border-radius: var(--ar-tab-border-radius, 0);
        font-weight: var(--ar-tab-font-weight, inherit);
    }

    [part='base'] {
        display: flex;
        align-items: center;
        color: var(--ar-tab-color, inherit);
        background: var(--ar-tab-bg, transparent);
        padding: var(--ar-tab-padding-y, 0.5rem) var(--ar-tab-padding-x, 1rem);
        border-radius: inherit;
    }

    :host(:hover:not([disabled])) [part='base'] {
        color: var(--ar-tab-hover-color, inherit);
        background: var(--ar-tab-hover-bg, transparent);
    }

    :host([aria-selected='true']) [part='base'] {
        color: var(--ar-tab-active-color, inherit);
        background: var(--ar-tab-active-bg, transparent);
        box-shadow: var(--ar-tab-active-shadow, none);
    }

    :host([disabled]) {
        cursor: not-allowed;
        opacity: var(--ar-tab-disabled-opacity, 0.5);
    }

    :host(:focus-visible) {
        outline: 2px solid var(--ar-focus-ring-color, currentColor);
        outline-offset: var(--ar-focus-ring-offset, 2px);
    }
`;
