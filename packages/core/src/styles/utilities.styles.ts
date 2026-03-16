import { css } from 'lit';

export default css`
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        white-space: nowrap;
        border: 0
    }

    .list-unstyled {
        padding-left: 0;
        list-style: none;
    }

    .d-flex {
        display: -webkit-box !important;
        display: -ms-flexbox !important;
        display: flex !important;
    }

    .d-inline-flex {
        display: -webkit-inline-box !important;
        display: -ms-inline-flexbox !important;
        display: inline-flex !important;
    }

    .flex-row {
        -webkit-box-orient: horizontal !important;
        -webkit-box-direction: normal !important;
            -ms-flex-direction: row !important;
                flex-direction: row !important;
    }

    .flex-column {
        -webkit-box-orient: vertical !important;
        -webkit-box-direction: normal !important;
            -ms-flex-direction: column !important;
                flex-direction: column !important;
    }

    .flex-row-reverse {
        -webkit-box-orient: horizontal !important;
        -webkit-box-direction: reverse !important;
            -ms-flex-direction: row-reverse !important;
                flex-direction: row-reverse !important;
    }

    .flex-column-reverse {
        -webkit-box-orient: vertical !important;
        -webkit-box-direction: reverse !important;
            -ms-flex-direction: column-reverse !important;
                flex-direction: column-reverse !important;
    }
`;
