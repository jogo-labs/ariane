import { LitElement, type TemplateResult, type CSSResultGroup, html } from 'lit';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import resetStyles from '../../styles/components/reset.styles.js';
import buttonStyles from '../../styles/components/button.styles.js';
import styles from './pagination.styles.js';
import { mrPaginationUtils } from './pagination.utils.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { warn } from '../../utils/warn.js';

/** Objet de configuration d'un webcomposant ArPagination */
export class ArPaginationConfig {
    current?: number = 1;
    total?: number = 5;
}

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
 * @cssprop [--ar-pagination-radius=var(--ar-border-radius-lg)] - Arrondi du conteneur de pagination.
 * @cssprop [--ar-pagination-active-color=var(--ar-color-interactive)] - Couleur de la page active (texte + bordure).
 * @cssprop [--ar-pagination-color=var(--ar-color-text)] - Couleur du texte des boutons prev/next/page (non actifs). À surcharger localement pour un fond sombre ponctuel, indépendamment du thème global.
 * @cssprop [--ar-pagination-bg=var(--ar-button-tertiary-bg)] - Fond des boutons prev/next/page (non actifs).
 * @cssprop [--ar-pagination-bg-hover=var(--ar-button-tertiary-bg-hover)] - Fond des boutons prev/next/page au survol.
 * @cssprop [--ar-pagination-bg-pressed=var(--ar-button-tertiary-bg-active)] - Fond des boutons prev/next/page pressés.
 * @cssprop [--ar-pagination-bg-focus=var(--ar-button-tertiary-bg-focus)] - Fond des boutons prev/next/page au focus.
 *
 * @event {CustomEvent<{from: number, to: number}>} ar-pagination-page-change - Émis à chaque changement de page. Contient `from` et `to`.
 */
export class ArPagination extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, buttonStyles, styles];

    static readonly DEFAULT_CURRENT: number = 1;
    static readonly DEFAULT_TOTAL: number = 5;

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

    override updated(changed: Map<string, unknown>): void {
        if (changed.has('total') && this.total < 1) {
            warn('ar-pagination', `total doit être ≥ 1. Valeur reçue : ${this.total}.`);
        }
        if (changed.has('current') || changed.has('total')) {
            if (this.current < 1) {
                warn('ar-pagination', `current doit être ≥ 1. Valeur reçue : ${this.current}.`);
            } else if (this.current > this.total) {
                warn(
                    'ar-pagination',
                    `current (${this.current}) est supérieur à total (${this.total}).`,
                );
            }
        }
    }

    override render(): TemplateResult {
        // Garde défensive : total/current invalides sont déjà signalés par warn() dans
        // updated(), mais render() doit rester fonctionnel — sans ce clamp, un total
        // négatif produit des numéros de page négatifs affichés (previousPageNumber/
        // nextPageNumber) et une liste de pages vide, sans qu'aucune erreur ne le
        // signale à l'exécution.
        const total = Math.max(this.total, 1);
        const current = mrPaginationUtils._clamp(this.current, 1, total);
        const isNextDisabled = current >= total;
        const isPreviousDisabled = current <= 1;
        const previousPageNumber = mrPaginationUtils._clamp(
            current - 1,
            1,
            total > 1 ? total - 1 : 1,
        );
        const nextPageNumber = mrPaginationUtils._clamp(current + 1, 1, total);

        return html` <nav part="nav" role="navigation" aria-labelledby="ar-pagination">
            <p id="ar-pagination" class="sr-only">Pagination</p>
            <ul part="list" class="pagination" @click=${this._onPageChange}>
                <li part="item" class="pagination-item">
                    <a
                        part="prev"
                        class="btn btn-tertiary btn-ratio-square"
                        href="javascript:;"
                        aria-disabled=${isPreviousDisabled}
                        @click=${this._onPreviousPage}
                    >
                        <span aria-hidden="true" class="icon icon-chevron-l">&lt;</span>
                        <span class="sr-only">Page précédente (page ${previousPageNumber})</span>
                    </a>
                </li>

                ${repeat(
                    mrPaginationUtils._calculatePages(current, total),
                    (page) => page,
                    (page) => {
                        // -1 et -2 sont des sentinelles représentant les ellipses
                        return page === -1 || page === -2
                            ? html` <li part="item" class="pagination-item" aria-hidden="true">
                                  <span class="btn btn-tertiary">...</span>
                              </li>`
                            : this.renderPage(page, page === current);
                    },
                )}

                <li part="item" class="pagination-item">
                    <a
                        part="next"
                        class="btn btn-tertiary btn-ratio-square"
                        href="javascript:;"
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

    /** Génère le `<li>` d'une page. Surcharger en sous-classe si besoin. */
    protected renderPage(page: number, active: boolean): TemplateResult {
        return html` <li part="item" class="pagination-item${active ? ' active' : ''}">
            ${this.renderPageLink(page, active)}
        </li>`;
    }

    /** Génère le lien ou le span (si page active) d'une page */
    protected renderPageLink(page: number, active: boolean): TemplateResult {
        if (active) {
            return html` <span
                part="current"
                aria-current="true"
                class="btn btn-tertiary"
                data-ar-pagination-page="${page}"
            >
                ${this.renderPageLabel(page)}
            </span>`;
        }
        return html` <a
            part="link"
            class="btn btn-tertiary"
            data-ar-pagination-page="${page}"
            href="javascript:;"
        >
            ${this.renderPageLabel(page)}
        </a>`;
    }

    /** Génère le label d'une page avec texte sr-only pour les lecteurs d'écran */
    protected renderPageLabel(page: number): TemplateResult {
        return html`<span class="sr-only">Page&nbsp;</span>${page}`;
    }

    private _onPreviousPage(): void {
        if (this.current <= 1) return;
        const from = this.current;
        this.current = this.current - 1;
        this._emit({ from, to: this.current });
        this._announcePageChange();
    }

    private _onNextPage(): void {
        if (this.current >= this.total) return;
        const from = this.current;
        this.current = this.current + 1;
        this._emit({ from, to: this.current });
        this._announcePageChange();
    }

    private _onPageChange(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const page = target.dataset['arPaginationPage'];
        if (target.tagName !== 'A' || !page) return;
        const from = this.current;
        this.current = parseInt(page);
        this._emit({ from, to: this.current });
        this._announcePageChange();
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

    private _announcePageChange(): void {
        announceA11y(`Page ${this.current} sur ${this.total}`, 'polite');
    }
}
