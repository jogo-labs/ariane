import { css } from 'lit';
import type { CSSResultGroup } from 'lit';
import animationsStyles from '../animations.styles.js';

const panelBaseStyles = css`
    [part='panel'] {
        /* Popover positioning reset */
        position: absolute;
        inset: 0 auto auto 0;
        margin: 0;

        /* Box model */
        box-sizing: border-box;
        overflow-y: auto;

        /* Tokens visuels */
        background-color: var(--ar-panel-bg, var(--ar-color-bg, #fff));
        color: var(--ar-panel-text, var(--ar-color-text, #2e2e31));
        border: 1px solid var(--ar-panel-border-color, var(--ar-color-border, #e2e2e5));
        border-radius: var(--ar-panel-radius, 0.375rem);
        box-shadow: var(
            --ar-panel-shadow,
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 10px 15px -3px rgba(0, 0, 0, 0.07)
        );
        padding: var(--ar-panel-padding, 0.25rem);
        max-width: var(--ar-panel-max-width, 18rem);
    }

    [part='panel']:not(:popover-open) {
        display: none;
    }

    [part='panel']:popover-open {
        animation: arPanelShow 0.2s ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='panel']:popover-open {
            animation: none;
        }
    }
`;

const panelStyles: CSSResultGroup = [animationsStyles, panelBaseStyles];
export default panelStyles;
