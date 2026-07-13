import { css } from 'lit';

export default css`
    :host {
        display: block;
        box-sizing: border-box;
    }

    .pagination {
        padding-left: 0;
        list-style: none;
        border-radius: 0.5rem;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
        margin-bottom: 0;
    }

    .pagination .btn-tertiary {
        aspect-ratio: 1/1;
        padding: 0;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        margin: 0 0.125rem;
    }

    @media only screen and (max-width: 640px) {
        .pagination
            li:not(.active):not([aria-hidden='true']):not(:first-child):not(:last-child):not(
                :nth-child(2)
            ):not(:nth-last-child(2)) {
            display: none;
        }
    }

    .pagination-item.active .btn-tertiary {
        z-index: 3;
        color: var(--ar-pagination-active-color);
        background-color: var(--ar-color-bg);
        border: 1px solid var(--ar-pagination-active-color);
        font-weight: 700;
    }

    .pagination-item[aria-hidden='true'] .btn-tertiary:not([aria-disabled='true']) {
        background: none !important;
        -webkit-box-shadow: none !important;
        box-shadow: none !important;
        cursor: default !important;
        border-color: transparent !important;
        color: var(--ar-color-text) !important;
    }
`;
