import { css } from 'lit';

export default css`
    :host {
        display: inline-block;
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
