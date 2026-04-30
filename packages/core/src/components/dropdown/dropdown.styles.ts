import { css } from 'lit';

export default css`
    :host {
        display: contents;
    }

    [part='panel'] {
        /* Overrides composant — chaînent vers les tokens shared --ar-panel-* */
        background-color: var(--ar-dropdown-bg, var(--ar-panel-bg, var(--ar-color-bg, #fff)));
        color: var(--ar-dropdown-color, var(--ar-panel-text, var(--ar-color-text, #2e2e31)));
        border-color: var(
            --ar-dropdown-border-color,
            var(--ar-panel-border-color, var(--ar-color-border, #e2e2e5))
        );
        border-radius: var(--ar-dropdown-border-radius, var(--ar-panel-radius, 0.375rem));
        box-shadow: var(
            --ar-dropdown-shadow,
            var(
                --ar-panel-shadow,
                0 4px 6px -1px rgba(0, 0, 0, 0.1),
                0 10px 15px -3px rgba(0, 0, 0, 0.07)
            )
        );
        padding: var(--ar-dropdown-padding, var(--ar-panel-padding, 0.25rem));
        min-width: var(--ar-dropdown-min-width, 10rem);
        max-width: var(--ar-dropdown-max-width, var(--ar-panel-max-width, 18rem));
    }
`;
