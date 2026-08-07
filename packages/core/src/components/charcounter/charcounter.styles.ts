import { css } from 'lit';

export default css`
    :host {
        display: inline-block;
    }

    [part~='count--warning'] {
        /* a11y-fallback: sans thème, la couleur seule (warning/error identiques) ne suffit pas à distinguer les états — la graisse doit rester un signal garanti même sans thème chargé */
        font-weight: var(--ar-charcounter-warning-weight, 700);
    }

    [part~='count--error'] {
        /* a11y-fallback: sans thème, la couleur seule (warning/error identiques) ne suffit pas à distinguer les états — la graisse doit rester un signal garanti même sans thème chargé */
        font-weight: var(--ar-charcounter-error-weight, 700);
    }

    slot[name='icon-warning'],
    slot[name='icon-error'] {
        display: none;
    }

    :host([state='warning']) slot[name='icon-warning'] {
        display: contents;
    }

    :host([state='error']) slot[name='icon-error'] {
        display: contents;
    }
`;
