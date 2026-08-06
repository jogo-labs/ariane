import { css } from 'lit';
import type { CSSResultGroup } from 'lit';
import animationsStyles from '../animations.styles.js';

const panelBaseStyles = css`
    /* Cette règle est la source canonique pour toute propriété qui ne fait que
       consommer un token --ar-panel-* générique sans jamais diverger d'un
       composant à l'autre. Un composant consommateur (voir static override
       styles) ne doit ajouter sa propre règle ::part(panel) dans default.css
       QUE pour une propriété dont la valeur diverge réellement du générique —
       jamais pour redéclarer la même valeur. */
    [part='panel'] {
        /* Popover positioning reset */
        position: absolute;
        inset: 0 auto auto 0;
        margin: 0;

        /* Box model */
        box-sizing: border-box;
        overflow-y: auto;

        /* Tokens visuels */
        background-color: var(--ar-panel-bg, Canvas);
        color: var(--ar-panel-text, CanvasText);
        border: 1px solid var(--ar-panel-border-color, ButtonBorder);
        border-radius: var(--ar-panel-radius);
        box-shadow: var(--ar-panel-shadow);
        padding: var(--ar-panel-padding);
        min-width: var(--ar-panel-min-width);
        /* a11y-fallback: évite un débordement horizontal (WCAG 1.4.10 Reflow) sur un viewport étroit si aucun thème n'est chargé — 18rem correspond à --ar-panel-max-width par défaut, calc(100vw - 2rem) borne la largeur sur mobile */
        max-width: var(--ar-panel-max-width, min(18rem, calc(100vw - 2rem)));
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
