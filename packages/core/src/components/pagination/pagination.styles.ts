import { css } from 'lit';

export default css`
:host {
    display: block;
    box-sizing: border-box;
}
/* Pagination */
.pagination {
    padding-left: 0;
    list-style: none;
    border-radius: .5rem
}

.page-link {
    position: relative;
    display: block;
    padding: .5rem .75rem;
    margin-left: -1px;
    line-height: 1.25;
    background-color: #fff;
    border: 1px solid #dee2e6
}

.page-link,.page-link:hover {
    color: #2458e5;
    text-decoration: none
}

.page-link:hover {
    z-index: 2;
    background-color: #e9ecef;
    border-color: #dee2e6
}

.page-link:focus {
    z-index: 3;
    outline: 0;
    -webkit-box-shadow: 0 0 0 .2rem rgba(40,50,118,.25);
    box-shadow: 0 0 0 .2rem rgba(40,50,118,.25)
}

.page-item:first-child .page-link {
    margin-left: 0;
    border-top-left-radius: .5rem;
    border-bottom-left-radius: .5rem
}

.page-item:last-child .page-link {
    border-top-right-radius: .5rem;
    border-bottom-right-radius: .5rem
}

.page-item.active .page-link {
    z-index: 3;
    color: #fff;
    background-color: #283276;
    border-color: #283276
}

.page-item.disabled .page-link {
    color: #6c757d;
    pointer-events: none;
    cursor: auto;
    background-color: #fff;
    border-color: #dee2e6
}

.pagination-lg .page-link {
    padding: .75rem 1.5rem;
    font-size: 1.25rem;
    line-height: 1.5
}

.pagination-lg .page-item:first-child .page-link {
    border-top-left-radius: .75rem;
    border-bottom-left-radius: .75rem
}

.pagination-lg .page-item:last-child .page-link {
    border-top-right-radius: .75rem;
    border-bottom-right-radius: .75rem
}

.pagination-sm .page-link {
    padding: .25rem .5rem;
    font-size: .875rem;
    line-height: 1.5
}

.pagination-sm .page-item:first-child .page-link {
    border-top-left-radius: .25rem;
    border-bottom-left-radius: .25rem
}

.pagination-sm .page-item:last-child .page-link {
    border-top-right-radius: .25rem;
    border-bottom-right-radius: .25rem
}

.pagination {
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
.pagination li:not(.active):not([aria-hidden=true]):not(:first-child):not(:last-child):not(:nth-child(2)):not(:nth-last-child(2)) {
    display: none;
}
}

.pagination-item.active .btn-tertiary {
z-index: 3;
color: #ffffff;
background-color: rgba(18, 20, 55, 0.8);
font-weight: 700;
}
.pagination-item[aria-hidden=true] .btn-tertiary:not([aria-disabled=true]) {
background: none !important;
-webkit-box-shadow: none !important;
        box-shadow: none !important;
cursor: default !important;
border-color: transparent !important;
}
.pagination-item[aria-hidden=true] .btn-tertiary:not([aria-disabled=true]).light {
color: #2E2E31 !important;
}
.pagination-item[aria-hidden=true] .btn-tertiary:not([aria-disabled=true]).dark {
color: #ffffff !important;
}

.pagination,.pagination .btn-tertiary {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    justify-content: center
}

.pagination .btn-tertiary {
    aspect-ratio: 1/1;
    padding: 0;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    margin: 0 .125rem
}

@media only screen and (max-width: 640px) {
    .pagination li:not(.active):not([aria-hidden=true]):not(:first-child):not(:last-child):not(:nth-child(2)):not(:nth-last-child(2)) {
        display:none
    }
}

.pagination-item.active .btn-tertiary {
    z-index: 3;
    color: var(--mr--color-primary);
    background-color: #fff;
    border: 1px solid var(--mr--color-primary);
    font-weight: 700
}

.pagination-item[aria-hidden=true] .btn-tertiary:not([aria-disabled=true]) {
    background: none!important;
    -webkit-box-shadow: none!important;
    box-shadow: none!important;
    cursor: default!important;
    border-color: transparent!important
}

.pagination-item[aria-hidden=true] .btn-tertiary:not([aria-disabled=true]).light {
    color: #2e2e31!important
}

.pagination-item[aria-hidden=true] .btn-tertiary:not([aria-disabled=true]).dark {
    color: #fff!important
}
`;
