import { LitElement, type TemplateResult, type CSSResultGroup, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import resetStyles from '../../styles/components/reset.styles.js';
import styles from './pagination.styles.js';
import { _calculatePages, _clamp } from './pagination.utils.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { focusAfterUpdate } from '../../a11y/focus-after-update.js';
import { warn } from '../../utils/warn.js';
import { LocalizeController } from '../../controllers/localize.controller.js';
// fr avant en : la première traduction enregistrée devient le repli de la lib pour les langues non reconnues.
import '../../translations/fr.js';
import '../../translations/en.js';

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
 * @localized
 *
 * Les pages intermédiaires sont calculées automatiquement selon le nombre total.
 * Des ellipses (`...`) sont insérées quand le nombre de pages dépasse le seuil d'affichage.
 *
 * @csspart pagination - Racine du composant.
 * @csspart list     - L'élément `<ul>` de la liste des pages.
 * @csspart item     - Chaque `<li>` de la liste. Porte aussi le part d'état `item--current` sur le `<li>` de la page active.
 * @csspart item--current - Le `<li>` de la page courante (variante d'état de `item`).
 * @csspart link     - Les `<a>` cliquables de chaque page. Personnalisable via `::part(link)` (fond, couleur, bordure, survol/pressé/focus).
 * @csspart control - Porté par `link` et `current` : élément interactif générique.
 * @csspart current  - Le `<span>` de la page courante (non cliquable). Personnalisable via `::part(current)` (fond, couleur, bordure, épaisseur de trait).
 * @csspart prev     - Le bouton "Page précédente". Porte aussi le part combiné `nav-button`, partagé avec `next`.
 * @csspart next     - Le bouton "Page suivante". Porte aussi le part combiné `nav-button`, partagé avec `prev`.
 * @csspart action-button - Porté par `prev` et `next` : bouton qui déclenche une action ponctuelle.
 * @csspart nav-button  - Part combiné sur `prev`/`next`, pour cibler les deux boutons de navigation ensemble (ex. `::part(nav-button)` pour un style commun distinct des numéros de page).
 * @csspart nav-button--disabled - Variante d'état de `nav-button` posée sur `prev`/`next` quand désactivé (page 1 ou dernière page).
 * @csspart ellipsis - Le `<span>` d'ellipse (`...`) entre deux groupes de pages, non interactif.
 * @csspart page-select - Le `<li>` englobant le `<select>` de saut de page, affiché à la place
 *   de la liste de pages quand l'espace disponible ne permet plus d'afficher de numéros (palier
 *   minimal).
 * @csspart select - L'élément `<select>` de saut de page. Personnalisable via `::part(select)`
 *   (apparence). Conserve l'apparence native du navigateur (flèche incluse) par défaut.
 * @csspart field - Porté par `select` : élément qui reçoit une saisie. Sous-rôle standard de
 *   `field` (avec `input`, cf. ar-datepicker), réutilisable par tout futur composant avec une
 *   liste déroulante.
 * @csspart page-label - Le `<li>` englobant le label de position en mode compact (`compact`),
 *   affiché à la place de la liste de pages. Sur le modèle de `page-select`.
 * @csspart label - Le `<span>` du label de position en mode compact ("Page X / Y"), non
 *   cliquable et masqué aux lecteurs d'écran (`aria-hidden`, l'information équivalente est déjà
 *   portée par le landmark et le texte accessible (sr-only) de prev/next). Personnalisable via
 *   `::part(label)`.
 *
 * @slot prev-icon - Icône du bouton "Page précédente". Remplace le chevron SVG par défaut.
 * @slot next-icon - Icône du bouton "Page suivante". Remplace le chevron SVG par défaut.
 *
 * @cssprop --ar-pagination-button-size - Hauteur et largeur minimales des boutons/pages (repli interne `2.5rem`, WCAG 2.5.8).
 * @cssprop --ar-pagination-transition-duration - Durée de la transition (fond/couleur) au survol/pressé/focus de prev/next/page.
 *
 * @event {CustomEvent<{from: number, to: number}>} ar-pagination-page-change - Émis avant le
 *   changement de page, à chaque interaction (clic page, précédent, suivant, sélection dans le
 *   `<select>` mobile). Annulable via `preventDefault()` : bloque l'interaction, `current` ne
 *   change pas. Contient `from` et `to`. @cancelable
 * @event {CustomEvent<{from: number, to: number}>} ar-pagination-page-changed - Émis quand
 *   `current` a réellement changé (réassignation externe suite à la confirmation du
 *   consommateur, ou set programmatique indépendant). Non annulable. Contient `from` et `to`.
 */
export class ArPagination extends LitElement {
    static override styles: CSSResultGroup = [utilitiesStyles, resetStyles, styles];

    private readonly localize = new LocalizeController(this);

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

    /**
     * Mode compact : uniquement les boutons précédent/suivant et un label de position
     * ("Page X / Y"), navigation strictement séquentielle (pas de saut direct à une page).
     * Rendu identique quelle que soit la largeur du conteneur (pas de repli en `<select>`).
     * @attr compact
     * @default false
     */
    @property({ reflect: true, type: Boolean })
    compact: boolean = false;

    @state() private _budget?: number;
    private _resizeObserver?: ResizeObserver | undefined;
    private _itemWidth = 0;
    private _initialized = false;
    private _prevTotalDigits = 0;
    // Une remesure est due (changement d'ordre de grandeur de `total`, `fonts.ready`) mais ne
    // peut être effectuée que si au moins un item numérique est actuellement rendu. Au palier
    // texte, aucun item n'est disponible : `_itemWidth` doit alors être conservé tel quel (voir
    // `_recalculateBudget`) plutôt que d'être remis à 0, sous peine de bloquer définitivement le
    // composant en palier texte (plus aucune mesure exploitable pour recalculer `_budget`).
    private _needsRemeasure = false;
    // Distingue le tout premier cycle updated() (où `current` "change" par rapport à sa
    // valeur pré-upgrade non définie) des transitions réelles ultérieures — sans ce flag,
    // ar-pagination-page-changed/l'annonce/le focus se déclencheraient au montage initial.
    private _hasRenderedOnce = false;
    // Cible du transfert de focus après confirmation — posé uniquement par _onPageChange
    // (clic sur un numéro de page), jamais par prev/next/select : reproduit le
    // comportement d'avant #161, où seul ce chemin déplaçait le focus. Consommé au
    // prochain updated() si current le confirme, sinon expire (fenêtre d'un seul cycle).
    private _pendingFocusPage: number | undefined;

    override connectedCallback(): void {
        super.connectedCallback();
        // `_initialized` reste faux ici au tout premier montage (le shadow DOM n'existe pas
        // encore, `_setupResizeObserver` ne trouverait pas `[part="pagination"]`) — ce n'est donc PAS un
        // doublon avec l'appel dans `firstUpdated()` ci-dessous, qui gère ce premier montage une
        // fois le rendu initial fait. Cet appel-ci ne joue que lors d'une reconnexion ultérieure
        // (élément déplacé/réinséré dans le DOM après un premier montage), pour réattacher
        // l'observer que `disconnectedCallback` a démonté à la déconnexion précédente.
        if (this._initialized && !this.compact) this._setupResizeObserver();
    }

    override firstUpdated(): void {
        this._initialized = true;
        // Mode compact : pas de repli automatique en <select>, donc aucun besoin de mesurer la
        // largeur disponible — le ResizeObserver et la remesure liée aux polices web seraient un
        // travail pur perte, court-circuités entièrement ici.
        if (this.compact) return;
        this._setupAdaptiveMeasurement();
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._resizeObserver?.disconnect();
    }

    private _setupResizeObserver(): void {
        this._resizeObserver?.disconnect();
        const nav = this.shadowRoot?.querySelector<HTMLElement>('[part="pagination"]');
        if (!nav) return;
        this._resizeObserver = new ResizeObserver(() => this._recalculateBudget());
        this._resizeObserver.observe(nav);
    }

    /**
     * Monte le `ResizeObserver` et arme la remesure liée aux polices web — les deux points
     * d'entrée du mode adaptatif (montage initial non compact, et retour à l'adaptatif après
     * un passage par le mode compact) doivent réarmer les deux, pas seulement l'observer :
     * sans ce regroupement, un montage compact suivi d'un passage tardif en adaptatif se
     * retrouvait sans le hook `fonts.ready`, jamais installé au premier montage court-circuité.
     */
    private _setupAdaptiveMeasurement(): void {
        this._setupResizeObserver();
        // Une police web chargée après le premier paint peut changer la largeur mesurée des
        // items (ex. police variable, chargement asynchrone) : force une remesure une fois
        // les polices prêtes. `document.fonts` est absent de certains environnements de test
        // (happy-dom) — garde défensive.
        if (document.fonts) {
            void document.fonts.ready.then(() => {
                this._needsRemeasure = true;
                this._recalculateBudget();
            });
        }
    }

    private _recalculateBudget(): void {
        const nav = this.shadowRoot?.querySelector<HTMLElement>('[part="pagination"]');
        const list = this.shadowRoot?.querySelector<HTMLElement>('[part="list"]');
        const prev = this.shadowRoot?.querySelector<HTMLElement>('[part~="prev"]');
        const next = this.shadowRoot?.querySelector<HTMLElement>('[part~="next"]');
        const items = this.shadowRoot?.querySelectorAll<HTMLElement>(
            '[part~="link"], [part~="current"]',
        );
        if (!nav || !list || !prev || !next) return;

        if ((this._needsRemeasure || !this._itemWidth) && items && items.length > 0) {
            // Le plus large des items actuellement rendus, pas le premier : un item à 2-3
            // chiffres est plus large qu'un item à 1 chiffre, et figer la mesure sur le
            // premier item rendu sous-estime systématiquement la largeur réelle.
            this._itemWidth = Math.max(
                ...Array.from(items).map((el) => el.getBoundingClientRect().width),
            );
            this._needsRemeasure = false;
        }
        // Si une remesure est due mais qu'aucun item numérique n'est actuellement rendu (palier
        // texte), on continue avec la dernière valeur connue de `_itemWidth` plutôt que de
        // bloquer : le composant doit rester réactif au resize, la remesure aura lieu dès qu'un
        // item numérique redevient disponible (voir commentaire sur `_needsRemeasure`).
        if (!this._itemWidth) return;

        // `column-gap` posé par le thème sur [part='list'] n'est pas inclus dans la largeur
        // des items ni de nav/prev/next : chaque slot numérique coûte `itemWidth + gap`, et un
        // gap de marge est retranché pour la jonction avec prev/next.
        const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
        const available =
            nav.getBoundingClientRect().width -
            prev.getBoundingClientRect().width -
            next.getBoundingClientRect().width -
            gap;
        const budget = Math.floor(available / (this._itemWidth + gap));
        // Marge de sécurité d'un slot pour absorber les imprécisions de mesure résiduelles
        // (arrondis sous-pixel, variations de police) — filet de sécurité peu coûteux contre
        // un débordement horizontal.
        this._budget = Math.max(budget - 1, 0);
    }

    override updated(changed: Map<string, unknown>): void {
        // `_hasRenderedOnce` (posé false→true seulement en fin de cycle, cf. plus bas) exclut le
        // tout premier `updated()` : `compact` n'a pas de `useDefault`, donc `changed.has('compact')`
        // est déjà vrai à ce premier cycle même si l'attribut n'a jamais été posé/modifié — sans
        // cette garde, un montage non compact appellerait `_setupAdaptiveMeasurement()` deux fois
        // de suite (une fois via `firstUpdated()`, une fois ici), créant un `ResizeObserver`
        // jetable à chaque montage.
        if (this._hasRenderedOnce && changed.has('compact')) {
            if (this.compact) {
                this._resizeObserver?.disconnect();
                this._resizeObserver = undefined;
            } else if (this._initialized) {
                this._setupAdaptiveMeasurement();
            }
        }
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
        if (changed.has('total')) {
            const digits = String(Math.max(this.total, 1)).length;
            if (this._prevTotalDigits && digits !== this._prevTotalDigits) {
                // Le nombre de chiffres du total a changé (ex. 9 → 10, 99 → 100) : la largeur
                // d'item mesurée précédemment (figée sur l'ancien total) n'est plus fiable —
                // marque une remesure comme due avant le prochain calcul de budget. La remesure
                // effective n'a lieu que si un item numérique est rendu (cf. `_needsRemeasure`) ;
                // sinon la dernière valeur connue de `_itemWidth` reste utilisée pour ne pas
                // bloquer le composant au palier texte. Le flag est posé même en mode compact
                // (où aucun recalcul n'a lieu ici) pour que la remesure soit bien effectuée si le
                // composant repasse en mode non compact avec ce total.
                this._needsRemeasure = true;
                if (!this.compact) this._recalculateBudget();
            }
            this._prevTotalDigits = digits;
        }
        const select = this.shadowRoot?.querySelector<HTMLSelectElement>('[part~="select"]');
        if (select) {
            const value = String(_clamp(this.current, 1, Math.max(this.total, 1)));
            if (select.value !== value) select.value = value;
        }
        if (this._hasRenderedOnce && changed.has('current')) {
            const from = changed.get('current') as number;
            const to = this.current;
            if (from !== to) {
                this._emitChanged({ from, to });
                this._announcePageChange();
                if (this.current === this._pendingFocusPage) {
                    // Qualifié par balise (`span[part~=...]`) : sous happy-dom (Vitest), `~=`
                    // scinde aussi sur les tirets et matcherait à tort le `<li
                    // part="item item--current">` englobant avant le `<span part="current">`
                    // réel (mise en garde dans test-utils.ts). Sans effet en navigateur réel
                    // (spec-conforme), où seul le `<span>` matche de toute façon.
                    void focusAfterUpdate(this, 'span[part~="current"]');
                }
            }
        }
        this._hasRenderedOnce = true;
        this._pendingFocusPage = undefined;
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

        return html` <nav part="pagination" role="navigation" aria-labelledby="ar-pagination">
            <p id="ar-pagination" class="sr-only">
                ${this.localize.term('paginationLandmark', current, total)}
            </p>
            <ul part="list" @click=${this._onPageChange}>
                ${this.compact ? this.renderCompactLabel(current, total) : nothing}

                <li part="item">
                    <a
                        part="prev nav-button action-button${isPreviousDisabled
                            ? ' nav-button--disabled'
                            : ''}"
                        href="javascript:;"
                        aria-disabled=${isPreviousDisabled}
                        @click=${this._onPreviousPage}
                    >
                        <slot name="prev-icon">${this._defaultPrevIcon()}</slot>
                        <span class="sr-only"
                            >${this.localize.term('previousPage', previousPageNumber, total)}</span
                        >
                    </a>
                </li>

                ${this.compact ? nothing : this.renderPageContent(current, total)}

                <li part="item">
                    <a
                        part="next nav-button action-button${isNextDisabled
                            ? ' nav-button--disabled'
                            : ''}"
                        href="javascript:;"
                        aria-disabled=${isNextDisabled}
                        @click=${this._onNextPage}
                    >
                        <slot name="next-icon">${this._defaultNextIcon()}</slot>
                        <span class="sr-only"
                            >${this.localize.term('nextPage', nextPageNumber, total)}</span
                        >
                    </a>
                </li>
            </ul>
        </nav>`;
    }

    /**
     * Génère le contenu de la liste de pages en mode adaptatif : numéros de page (avec
     * ellipses) ou `<select>` de saut de page selon `_budget`. N'est jamais appelée en mode
     * compact (`compact`) — `render()` bifurque directement vers `renderCompactLabel` dans ce
     * cas, donc aucune garde `!this.compact` n'est nécessaire ici.
     */
    protected renderPageContent(current: number, total: number): TemplateResult {
        // Plancher uniforme (5, le plus grand des deux planchers algorithmiques de
        // `_calculatePages`) plutôt que 3 en bord de liste / 5 sinon : sinon, à largeur égale,
        // la bascule vers le select dépendrait de la position de `current` (une page en bord
        // resterait en boutons plus longtemps qu'une page intermédiaire) — incohérent du point
        // de vue de l'utilisateur, qui ne doit pas voir un mode différent selon la page active
        // sans changement de largeur. 5 est sûr : c'est déjà le plancher réel en position non-bord,
        // donc aucun risque de débordement (contrairement à forcer 3, qui ferait tenter un rendu
        // à 5 items dans un budget de 3-4 slots).
        const floorSlots = 5;
        const pages = _calculatePages(current, total, this._budget);
        // Cas particulier : à budget=5 exactement (position non-bord, loin des deux extrémités),
        // `_calculatePages` retombe sur sa fenêtre minimale [1, -1, current, -2, total] — 5 slots
        // dont 2 ellipses purement décoratives, pour seulement 3 pages réellement cliquables.
        // Le select offre alors plus de valeur pour le même espace (jusqu'à 9 pages réelles,
        // cf. `renderPageSelect`) : basculer vers lui même si le budget brut suffirait
        // techniquement à afficher cette fenêtre. Repli strictement plus sûr que les boutons
        // qu'il remplace (un `<select>` fermé est plus étroit que la fenêtre à 5 slots qu'il
        // aurait fallu rendre), donc aucun risque de débordement supplémentaire.
        const isMinimalWindowWithDoubleEllipsis =
            pages.length === 5 && pages.includes(-1) && pages.includes(-2);
        const useSelectMode =
            this._budget !== undefined &&
            (this._budget < floorSlots || isMinimalWindowWithDoubleEllipsis);

        return html`${useSelectMode
            ? this.renderPageSelect(current, total)
            : repeat(
                  pages,
                  (page) => page,
                  (page) => {
                      // -1 et -2 sont des sentinelles représentant les ellipses
                      return page === -1 || page === -2
                          ? html` <li part="item" aria-hidden="true">
                                <span part="ellipsis">...</span>
                            </li>`
                          : this.renderPage(page, page === current, total);
                  },
              )}`;
    }

    /** Génère le `<li>` d'une page. Surcharger en sous-classe si besoin. */
    protected renderPage(page: number, active: boolean, total: number): TemplateResult {
        return html` <li part="item${active ? ' item--current' : ''}">
            ${this.renderPageLink(page, active, total)}
        </li>`;
    }

    /** Génère le lien ou le span (si page active) d'une page */
    protected renderPageLink(page: number, active: boolean, total: number): TemplateResult {
        if (active) {
            return html` <span
                part="current control"
                tabindex="-1"
                aria-current="page"
                data-ar-pagination-page="${page}"
            >
                ${this.renderPageLabel(page, total)}
            </span>`;
        }
        return html` <a part="link control" data-ar-pagination-page="${page}" href="javascript:;">
            ${this.renderPageLabel(page, total)}
        </a>`;
    }

    /**
     * Génère le label d'une page : texte complet ("Page X sur Y") lu par les lecteurs d'écran,
     * numéro seul affiché — les deux `<span>` doivent rester adjacents sans texte/espace entre
     * eux (voir garde globale sur les bindings adjacents dans un conteneur flex).
     */
    protected renderPageLabel(page: number, total: number): TemplateResult {
        return html`<span class="sr-only">${this.localize.term('pageStatus', page, total)}</span
            ><span aria-hidden="true">${page}</span>`;
    }

    /**
     * Génère le `<li>` du select de saut de page, affiché à la place de la liste de pages au
     * palier minimal (largeur insuffisante pour la fenêtre de boutons la plus réduite).
     *
     * Peuplé sans le `_budget` courant (donc avec le plancher de largeur confortable de
     * `_calculatePages`, jusqu'à 9 slots) plutôt qu'avec la fenêtre déjà réduite par la largeur
     * réelle : contrairement aux boutons, le `<select>` reste compact quel que soit le nombre
     * d'options qu'il contient une fois fermé — rien n'empêche de lui donner accès au même choix
     * de pages qu'à largeur confortable. Le mobile n'est ainsi jamais moins capable que le
     * desktop, seulement rendu différemment.
     */
    protected renderPageSelect(current: number, total: number): TemplateResult {
        return html`<li part="item page-select">
            <span class="sr-only" id="ar-pagination-select-label"
                >${this.localize.term('goToPage')}</span
            >
            <select
                part="select field"
                aria-labelledby="ar-pagination-select-label"
                @change=${this._onSelectChange}
            >
                ${_calculatePages(current, total).map((page) =>
                    page === -1 || page === -2
                        ? html`<option disabled value="">…</option>`
                        : html`<option value=${page} ?selected=${page === current}>
                              ${this.localize.term('pageStatus', page, total)}
                          </option>`,
                )}
            </select>
        </li>`;
    }

    /**
     * Génère le `<li>` du label de position en mode compact ("Page X / Y"), affiché avant
     * prev/next. `aria-hidden` sur le `<li>` : le `<p>` sr-only du landmark et le texte
     * accessible (sr-only) de prev/next portent déjà l'information équivalente pour le lecteur
     * d'écran — sans ce marquage, le texte serait annoncé deux fois (et un `<li>` sans contenu
     * accessible serait sinon exposé vide dans l'arbre d'accessibilité).
     */
    protected renderCompactLabel(current: number, total: number): TemplateResult {
        return html`<li part="item page-label" aria-hidden="true">
            <span part="label">${this.localize.term('compactPageStatus', current, total)}</span>
        </li>`;
    }

    private _onSelectChange(event: Event): void {
        const select = event.target as HTMLSelectElement;
        const page = parseInt(select.value, 10);
        if (Number.isNaN(page) || page === this.current) return;
        if (!this._requestPageChange(page)) {
            // Annulé : le <select> a déjà muté nativement sa .value avant que ce handler ne
            // s'exécute. Puisque current ne change pas, aucun cycle de rendu ne
            // redéclenchera le sync existant dans updated() — revert explicite nécessaire ici.
            select.value = String(_clamp(this.current, 1, Math.max(this.total, 1)));
        }
    }

    private _onPreviousPage(): void {
        if (this.current <= 1) return;
        this._requestPageChange(this.current - 1);
    }

    private _onNextPage(): void {
        if (this.current >= this.total) return;
        this._requestPageChange(this.current + 1);
    }

    private _onPageChange(event: MouseEvent): void {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
            'a[data-ar-pagination-page]',
        );
        const page = link?.dataset['arPaginationPage'];
        if (!link || !page) return;
        const to = parseInt(page);
        this._pendingFocusPage = to;
        this._requestPageChange(to);
    }

    /**
     * Dispatch l'intention de changement de page, sans muter `current` : c'est au
     * consommateur de le réassigner en réponse à cet event pour que le changement
     * prenne effet (modèle contrôlé, cf. ar-stepper.currentPath).
     * @returns `false` si `preventDefault()` a été appelé sur l'event (valeur native de
     *   `dispatchEvent` pour un event cancelable).
     */
    private _requestPageChange(to: number): boolean {
        const from = this.current;
        return this.dispatchEvent(
            new CustomEvent<ArPaginationPageChangeDetail>('ar-pagination-page-change', {
                bubbles: true,
                composed: true,
                cancelable: true,
                detail: { from, to },
            }),
        );
    }

    private _emitChanged(detail: ArPaginationPageChangeDetail): void {
        this.dispatchEvent(
            new CustomEvent<ArPaginationPageChangeDetail>('ar-pagination-page-changed', {
                bubbles: true,
                composed: true,
                detail,
            }),
        );
    }

    private _announcePageChange(): void {
        announceA11y(this.localize.term('pageStatus', this.current, this.total), 'polite');
    }
}
