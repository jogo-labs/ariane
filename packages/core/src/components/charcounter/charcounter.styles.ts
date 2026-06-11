import { css } from 'lit';

export default css`
    :host {
        display: inline-block;
    }

    [part='count'] {
        color: var(--ar-charcounter-color);
        font-size: var(--ar-charcounter-font-size);
    }

    :host([state='warning']) [part='count'] {
        color: var(--ar-charcounter-warning-color);
        font-weight: var(--ar-charcounter-warning-weight);
    }

    :host([state='error']) [part='count'] {
        color: var(--ar-charcounter-error-color);
        font-weight: var(--ar-charcounter-error-weight);
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
