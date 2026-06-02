import { css, type CSSResultGroup } from 'lit';
import animationsStyles from '../../styles/animations.styles.js';

const tooltipStyles = css`
    :host {
        display: contents;
    }

    [part='bubble'] {
        /* Popover positioning reset */
        position: absolute;
        inset: 0 auto auto 0;
        margin: 0;

        /* Box model */
        box-sizing: border-box;
        padding: var(--ar-tooltip-padding);
        max-width: var(--ar-tooltip-max-width);

        /* overflow: visible requis pour que le caret (position: absolute) dépasse de la bulle */
        overflow: visible;

        /* Visual */
        background-color: var(--ar-tooltip-bg);
        color: var(--ar-tooltip-color);
        border: none;
        border-radius: var(--ar-tooltip-border-radius);
        font-size: var(--ar-tooltip-font-size);
        line-height: 1.4;
        word-break: break-word;
    }

    [part='bubble']:not(:popover-open) {
        display: none;
    }

    [part='bubble']:popover-open {
        animation: arPanelShow 0.15s ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
        [part='bubble']:popover-open {
            animation: none;
        }
    }

    [part='arrow'] {
        position: absolute;
        width: var(--ar-tooltip-arrow-size);
        height: var(--ar-tooltip-arrow-size);
        background-color: var(--ar-tooltip-bg);
        transform: rotate(45deg);
        pointer-events: none;
    }
`;

const styles: CSSResultGroup = [animationsStyles, tooltipStyles];
export default styles;
