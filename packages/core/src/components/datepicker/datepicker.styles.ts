import { css } from 'lit';

export default css`
    :host {
        display: block;
    }

    p {
        margin: 0;
    }

    .input-wrapper {
        display: flex;
        align-items: stretch;
    }

    [part='input'] {
        flex: 1;
        min-width: 0;
    }

    [part='trigger'] {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    :host([disabled]) [part='trigger'],
    :host([readonly]) [part='trigger'] {
        pointer-events: none;
    }

    :host([has-error]) [part='input'] {
        border-color: var(--ar-datepicker-input-error-border-color);
    }

    [part='panel'] {
        width: var(--ar-datepicker-panel-width);
        padding: var(--ar-panel-padding);
    }

    [part='header'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.25rem;
    }

    [part='header'] span[aria-live] {
        flex: 1;
        text-align: center;
        font-weight: 600;
    }

    [part='grid'] {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
    }

    [part='grid'] th {
        text-align: center;
        font-size: 0.75rem;
        padding-block: 0.5rem;
    }

    [part='day'] {
        width: var(--ar-datepicker-day-size);
        height: var(--ar-datepicker-day-size);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: auto;
        cursor: pointer;
        border-radius: 50%;
        background: none;
        border: none;
    }

    [part='day'].today {
        background-color: var(--ar-datepicker-day-today-bg);
        color: var(--ar-datepicker-day-today-color);
    }

    [part='day'].selected {
        background-color: var(--ar-datepicker-day-selected-bg);
        color: var(--ar-datepicker-day-selected-color);
    }

    [part='day'].other-month {
        opacity: 0.4;
    }

    [part='day'].disabled,
    [part='day'][aria-disabled='true'] {
        opacity: 0.4;
        cursor: not-allowed;
    }

    [part='footer'] {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        padding-top: 0.5rem;
    }
`;
