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
        background-color: var(--ar-panel-bg);
        color: var(--ar-panel-text);
        border: 1px solid var(--ar-panel-border-color);
        border-radius: var(--ar-panel-radius);
        box-shadow: var(--ar-panel-shadow);
        padding: var(--ar-panel-padding);
        max-width: var(--ar-panel-max-width);
    }

    [part='panel']:not(:popover-open) {
        display: none;
    }

    [part='panel']:popover-open {
        animation: arPanelShow var(--ar-panel-show-duration) ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='panel']:popover-open {
            animation: none;
        }
    }
`;

const panelStyles: CSSResultGroup = [animationsStyles, panelBaseStyles];
export default panelStyles;
