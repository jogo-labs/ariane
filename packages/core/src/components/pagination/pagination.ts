import { LitElement, type TemplateResult, type CSSResultGroup, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
import styles from './pagination.styles.js';
import { mrPaginationUtils } from './pagination.utils.js';

/** Objet de configuration d'un webcomposant ArPagination */
export class ArPaginationConfig {
    current?: number = 1;
    total?: number = 5;
    variant?: ArPaginationVariant = 'light';
}

/** Variantes de style disponibles */
export type ArPaginationVariant = 'light' | 'dark';

/** Détail de l'événement émis lors d'un changement de page */
export interface ArPaginationPageChangeDetail {
    /** Numéro de la page précédente */
    from: number;
    /** Numéro de la nouvelle page */
    to: number;
}

/**
 * @summary Pagination accessible avec numérotation dynamique et ellipses automatiques.
 * @display demo
 *
 * Les pages intermédiaires sont calculées automatiquement selon le nombre total.
 * Des ellipses (`...`) sont insérées quand le nombre de pages dépasse le seuil d'affichage.
 *
 * @csspart nav      - L'élément `<nav>` englobant.
 * @csspart list     - L'élément `<ul>` de la liste des pages.
 * @csspart item     - Chaque `<li>` de la liste.
 * @csspart link     - Les `<a>` cliquables de chaque page.
 * @csspart current  - Le `<span>` de la page courante (non cliquable).
 * @csspart prev     - Le bouton "Page précédente".
 * @csspart next     - Le bouton "Page suivante".
 *
 * @event {CustomEvent<{from: number, to: number}>} ar-pagination-page-change - Émis à chaque changement de page. Contient `from` et `to`.
 */
@customElement('ar-pagination')
export class ArPagination extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, buttonStyles, styles];

    static readonly DEFAULT_CURRENT: number = 1;
    static readonly DEFAULT_TOTAL: number = 5;
    static readonly DEFAULT_VARIANT: ArPaginationVariant = 'light';

    /**
     * Numéro de la page courante (commence à 1).
     * @attr current
     * @default 1
     */
    @property({ reflect: true, type: Number, useDefault: true })
    current: number = ArPagination.DEFAULT_CURRENT;

    /**
     * Nombre total de pages.
     * @attr total
     * @default 5
     */
    @property({ reflect: true, type: Number, useDefault: true })
    total: number = ArPagination.DEFAULT_TOTAL;

    /**
     * Variante de style. Adapter selon la couleur de fond de la page.
     * @attr variant
     * @default 'light'
     */
    @property({ reflect: true, type: String, useDefault: true })
    variant: 'light' | 'dark' = ArPagination.DEFAULT_VARIANT;

    override render(): TemplateResult {
        const isNextDisabled = this.current >= this.total;
        const isPreviousDisabled = this.current <= 1;
        const previousPageNumber = mrPaginationUtils._clamp(
            this.current - 1,
            1,
            this.total > 1 ? this.total - 1 : 1,
        );
        const nextPageNumber = mrPaginationUtils._clamp(this.current + 1, 1, this.total);
        const current = mrPaginationUtils._clamp(this.current, 1, this.total);

        return html` <nav part="nav" role="navigation" aria-labelledby="ar-pagination">
            <p id="ar-pagination" class="sr-only">Pagination</p>
            <ul part="list" class="pagination" @click=${this._onPageChange}>
                <li part="item" class="pagination-item">
                    <a
                        part="prev"
                        class="btn btn-tertiary light btn-ratio-square"
                        href="javascript:;"
                        .ariaDisabled=${isPreviousDisabled}
                        aria-disabled=${isPreviousDisabled}
                        @click=${this._onPreviousPage}
                    >
                        <span aria-hidden="true" class="icon icon-chevron-l">&lt;</span>
                        <span class="sr-only">Page précédente (page ${previousPageNumber})</span>
                    </a>
                </li>

                ${repeat(
                    mrPaginationUtils._calculatePages(this.current, this.total),
                    (page) => page,
                    (page) => {
                        // -1 et -2 sont des sentinelles représentant les ellipses
                        return page === -1 || page === -2
                            ? html` <li part="item" class="pagination-item" aria-hidden="true">
                                  <span class="btn btn-tertiary ${this.variant}">...</span>
                              </li>`
                            : this.renderPage(page, page === current, this.variant);
                    },
                )}

                <li part="item" class="pagination-item">
                    <a
                        part="next"
                        class="btn btn-tertiary light btn-ratio-square"
                        href="javascript:;"
                        .ariaDisabled=${isNextDisabled}
                        aria-disabled=${isNextDisabled}
                        @click=${this._onNextPage}
                    >
                        <span aria-hidden="true" class="icon icon-chevron-r">&gt;</span>
                        <span class="sr-only">Page suivante (page ${nextPageNumber})</span>
                    </a>
                </li>
            </ul>
        </nav>`;
    }

    /**
     * Génère le `<li>` d'une page.
     * Rendu public pour permettre la surcharge dans les sous-classes.
     */
    renderPage(
        page: number,
        active: boolean,
        variant: ArPaginationVariant = 'light',
    ): TemplateResult {
        return html` <li part="item" class="pagination-item${active ? ' active' : ''}">
            ${this.renderPageLink(page, active, variant)}
        </li>`;
    }

    /** Génère le lien ou le span (si page active) d'une page */
    renderPageLink(
        page: number,
        active: boolean,
        variant: ArPaginationVariant = 'light',
    ): TemplateResult {
        if (active) {
            return html` <span
                part="current"
                aria-current="true"
                class="btn btn-tertiary ${variant}"
                data-ar-pagination-page="${page}"
            >
                ${this.renderPageLabel(page)}
            </span>`;
        }
        return html` <a
            part="link"
            class="btn btn-tertiary ${variant}"
            data-ar-pagination-page="${page}"
            href="javascript:;"
        >
            ${this.renderPageLabel(page)}
        </a>`;
    }

    /** Génère le label d'une page avec texte sr-only pour les lecteurs d'écran */
    renderPageLabel(page: number): TemplateResult {
        return html`<span class="sr-only">Page&nbsp;</span>${page}`;
    }

    private _onPreviousPage(): void {
        if (this.current <= 1) return;
        const from = this.current;
        this.current = this.current - 1;
        this._emit({ from, to: this.current });
    }

    private _onNextPage(): void {
        if (this.current >= this.total) return;
        const from = this.current;
        this.current = this.current + 1;
        this._emit({ from, to: this.current });
    }

    private _onPageChange(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const page = target.dataset['arPaginationPage'];
        if (target.tagName !== 'A' || !page) return;
        const from = this.current;
        this.current = parseInt(page);
        this._emit({ from, to: this.current });
    }

    private _emit(detail: ArPaginationPageChangeDetail): void {
        this.dispatchEvent(
            new CustomEvent<ArPaginationPageChangeDetail>('ar-pagination-page-change', {
                bubbles: true,
                composed: true,
                cancelable: true,
                detail,
            }),
        );
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-pagination': ArPagination;
    }
}
