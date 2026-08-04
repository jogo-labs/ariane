import { LitElement, type TemplateResult, type CSSResultGroup, html } from 'lit';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import resetStyles from '../../styles/components/reset.styles.js';
import styles from './pagination.styles.js';
import { _calculatePages, _clamp } from './pagination.utils.js';
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
 * @csspart item     - Chaque `<li>` de la liste. Porte aussi le part d'état `item--current` sur le `<li>` de la page active.
 * @csspart item--current - Le `<li>` de la page courante (variante d'état de `item`).
 * @csspart link     - Les `<a>` cliquables de chaque page. Personnalisable via `::part(link)` (fond, couleur, bordure, survol/pressé/focus).
 * @csspart current  - Le `<span>` de la page courante (non cliquable). Personnalisable via `::part(current)` (fond, couleur, bordure, épaisseur de trait).
 * @csspart prev     - Le bouton "Page précédente". Porte aussi le part combiné `nav-btn`, partagé avec `next`.
 * @csspart next     - Le bouton "Page suivante". Porte aussi le part combiné `nav-btn`, partagé avec `prev`.
 * @csspart nav-btn  - Part combiné sur `prev`/`next`, pour cibler les deux boutons de navigation ensemble (ex. `::part(nav-btn)` pour un style commun distinct des numéros de page).
 * @csspart nav-btn--disabled - Variante d'état de `nav-btn` posée sur `prev`/`next` quand désactivé (page 1 ou dernière page).
 * @csspart ellipsis - Le `<span>` d'ellipse (`...`) entre deux groupes de pages, non interactif.
 *
 * @slot prev-icon - Icône du bouton "Page précédente". Remplace le chevron SVG par défaut.
 * @slot next-icon - Icône du bouton "Page suivante". Remplace le chevron SVG par défaut.
 *
 * @cssprop --ar-pagination-btn-size - Hauteur et largeur minimales des boutons/pages (repli interne `2.5rem`, WCAG 2.5.8).
 * @cssprop --ar-pagination-transition-duration - Durée de la transition (fond/couleur) au survol/pressé/focus de prev/next/page.
 *
 * @event {CustomEvent<{from: number, to: number}>} ar-pagination-page-change - Émis à chaque changement de page. Contient `from` et `to`.
 */
export class ArPagination extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, styles];

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

    private _defaultPrevIcon(): TemplateResult {
        return html`<svg
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"></path>
        </svg>`;
    }

    private _defaultNextIcon(): TemplateResult {
        return html`<svg
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
        >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"></path>
        </svg>`;
    }

    override render(): TemplateResult {
        // Garde défensive : total/current invalides sont déjà signalés par warn() dans
        // updated(), mais render() doit rester fonctionnel — sans ce clamp, un total
        // négatif produit des numéros de page négatifs affichés (previousPageNumber/
        // nextPageNumber) et une liste de pages vide, sans qu'aucune erreur ne le
        // signale à l'exécution.
        const total = Math.max(this.total, 1);
        const current = _clamp(this.current, 1, total);
        const isNextDisabled = current >= total;
        const isPreviousDisabled = current <= 1;
        const previousPageNumber = _clamp(current - 1, 1, total > 1 ? total - 1 : 1);
        const nextPageNumber = _clamp(current + 1, 1, total);

        return html` <nav part="nav" role="navigation" aria-labelledby="ar-pagination">
            <p id="ar-pagination" class="sr-only">Pagination</p>
            <ul part="list" @click=${this._onPageChange}>
                <li part="item">
                    <a
                        part="prev nav-btn${isPreviousDisabled ? ' nav-btn--disabled' : ''}"
                        href="javascript:;"
                        aria-disabled=${isPreviousDisabled}
                        @click=${this._onPreviousPage}
                    >
                        <slot name="prev-icon">${this._defaultPrevIcon()}</slot>
                        <span class="sr-only">Page précédente (page ${previousPageNumber})</span>
                    </a>
                </li>

                ${repeat(
                    _calculatePages(current, total),
                    (page) => page,
                    (page) => {
                        // -1 et -2 sont des sentinelles représentant les ellipses
                        return page === -1 || page === -2
                            ? html` <li part="item" aria-hidden="true">
                                  <span part="ellipsis">...</span>
                              </li>`
                            : this.renderPage(page, page === current);
                    },
                )}

                <li part="item">
                    <a
                        part="next nav-btn${isNextDisabled ? ' nav-btn--disabled' : ''}"
                        href="javascript:;"
                        aria-disabled=${isNextDisabled}
                        @click=${this._onNextPage}
                    >
                        <slot name="next-icon">${this._defaultNextIcon()}</slot>
                        <span class="sr-only">Page suivante (page ${nextPageNumber})</span>
                    </a>
                </li>
            </ul>
        </nav>`;
    }

    /** Génère le `<li>` d'une page. Surcharger en sous-classe si besoin. */
    protected renderPage(page: number, active: boolean): TemplateResult {
        return html` <li part="item${active ? ' item--current' : ''}">
            ${this.renderPageLink(page, active)}
        </li>`;
    }

    /** Génère le lien ou le span (si page active) d'une page */
    protected renderPageLink(page: number, active: boolean): TemplateResult {
        if (active) {
            return html` <span part="current" aria-current="true" data-ar-pagination-page="${page}">
                ${this.renderPageLabel(page)}
            </span>`;
        }
        return html` <a part="link" data-ar-pagination-page="${page}" href="javascript:;">
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
                detail,
            }),
        );
    }

    private _announcePageChange(): void {
        announceA11y(`Page ${this.current} sur ${this.total}`, 'polite');
    }
}
