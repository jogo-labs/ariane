import { css, type CSSResultGroup } from 'lit';
import animationsStyles from '../../styles/animations.styles.js';

const tooltipStyles = css`
    :host {
        display: contents;
    }

    [part~='bubble'] {
        /* Popover positioning reset */
        position: absolute;
        inset: 0 auto auto 0;
        margin: 0;

        /* Box model */
        box-sizing: border-box;
        padding: var(--ar-tooltip-padding);
        border-radius: var(--ar-tooltip-radius);

        /* a11y-fallback: évite un débordement horizontal (WCAG 1.4.10 Reflow) sur un viewport
           étroit, avec ou sans thème chargé — calc(100vw - 2rem) borne la largeur sur mobile.
           Personnalisable via ::part(bubble) { max-width: ... } si besoin. */
        max-width: min(18rem, calc(100vw - 2rem));

        /* overflow: visible requis pour que le caret (position: absolute) dépasse de la bulle */
        overflow: visible;

        /* Visual */
        background-color: var(--ar-tooltip-bg, Canvas);
        color: var(--ar-tooltip-color, CanvasText);
        border: none;
        word-break: break-word;

        /* Typography */
        font-size: var(--ar-tooltip-font-size);
        line-height: var(--ar-tooltip-line-height);
    }

    [part='bubble']:not(:popover-open) {
        display: none;
    }

    [part='bubble']:popover-open {
        animation: arPanelShow var(--ar-tooltip-show-duration) ease-out;
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
        background-color: var(--ar-tooltip-bg, Canvas);
        transform: rotate(45deg);
        pointer-events: none;
    }
`;

const styles: CSSResultGroup = [animationsStyles, tooltipStyles];
export default styles;
