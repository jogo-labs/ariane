import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './table-sort.styles.js';
import utilitiesStyles from '../../styles/utilities.styles.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { warn } from '../../utils/warn.js';

export type TableSortType = 'alpha' | 'numeric' | 'date';
export type TableSortOrder = 'none' | 'asc' | 'desc';

const CYCLE: TableSortOrder[] = ['none', 'asc', 'desc'];

function nextOrder(current: TableSortOrder): TableSortOrder {
    return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
}

const ACTION_LABELS: Record<TableSortType, Record<'asc' | 'desc' | 'reset', string>> = {
    alpha: {
        asc: 'Trier de A à Z',
        desc: 'Trier de Z à A',
        reset: 'Supprimer le tri alphabétique',
    },
    numeric: {
        asc: 'Trier par ordre croissant',
        desc: 'Trier par ordre décroissant',
        reset: 'Supprimer le tri numérique',
    },
    date: {
        asc: 'Trier du plus ancien au plus récent',
        desc: 'Trier du plus récent au plus ancien',
        reset: 'Supprimer le tri chronologique',
    },
};

const APPLIED_LABELS: Record<TableSortOrder, string> = {
    none: 'tri supprimé',
    asc: 'tri croissant appliqué',
    desc: 'tri décroissant appliqué',
};

function getActionLabel(type: TableSortType, order: TableSortOrder, pending: boolean): string {
    if (pending) return 'Tri en cours…';
    if (order === 'none') return ACTION_LABELS[type].asc;
    if (order === 'asc') return ACTION_LABELS[type].desc;
    return ACTION_LABELS[type].reset;
}

/**
 * @summary Entête de colonne triable accessible — indicateur visuel ↑↓ et aria-sort automatique.
 * @display demo
 *
 * Placer à l'intérieur d'un `<th>`. Le composant met à jour `aria-sort` et `scope="col"` sur
 * le `<th>` ancêtre. Le consommateur appelle `confirm()` après un tri réussi ou `reject()` en
 * cas d'échec.
 *
 * @slot - Libellé de la colonne.
 *
 * @csspart button    - Le bouton déclencheur.
 * @csspart indicator - L'icône de direction de tri.
 *
 * @cssprop --ar-table-sort-gap                     - Espacement label / indicateur.
 * @cssprop --ar-table-sort-indicator-gap           - Espacement entre les icônes indicateurs asc / desc.
 * @cssprop --ar-table-sort-indicator-size          - Taille de l'icône indicateur asc / desc.
 * @cssprop --ar-table-sort-indicator-color         - Couleur état neutre.
 * @cssprop --ar-table-sort-indicator-active-color  - Couleur état actif (asc/desc).
 * @cssprop --ar-table-sort-indicator-pending-color - Couleur état pending.
 *
 * @event {CustomEvent<{ type: TableSortType; currentOrder: TableSortOrder; requestedOrder: TableSortOrder; columnLabel: string }>} ar-table-sort-change - Émis au clic quand pending est false.
 */
export class ArTableSort extends LitElement {
    static override styles = [utilitiesStyles, styles];

    /** Type de tri — influe sur les labels accessibles. */
    @property({ reflect: true }) type: TableSortType = 'alpha';

    /** Ordre actuel. Ne pas modifier directement — utiliser confirm() ou reject(). */
    @property({ reflect: true }) order: TableSortOrder = 'none';

    /**
     * Vrai quand un tri a été demandé et attend confirmation.
     * @readonly Piloté par le composant — ne pas modifier directement.
     */
    @property({ reflect: true, type: Boolean }) pending = false;

    private _pendingOrder: TableSortOrder | null = null;
    private readonly _buttonId = `ar-ts-btn-${crypto.randomUUID().slice(0, 8)}`;

    override connectedCallback(): void {
        super.connectedCallback();
        this._syncParentTh();
    }

    override updated(changed: Map<string, unknown>): void {
        if (changed.has('order')) this._syncParentTh();
    }

    /** Applique le pending order et avance le cycle. Sans effet si pending est false. */
    confirm(): void {
        if (!this._pendingOrder) return;
        const newOrder = this._pendingOrder;
        this._pendingOrder = null;
        this.pending = false;
        this.order = newOrder;
        announceA11y(`${this._getColumnLabel()} : ${APPLIED_LABELS[newOrder]}`);
    }

    /** Remet le tri à "none" et annonce le reset aux lecteurs d'écran. Sans effet si déjà "none". */
    reset(): void {
        if (this.order === 'none') return;
        this.order = 'none';
        announceA11y(`${this._getColumnLabel()} : ${APPLIED_LABELS.none}`);
    }

    /**
     * Annule le pending order. Sans effet si pending est false.
     * @param reason Message annoncé aux lecteurs d'écran. Par défaut : "échec du tri".
     */
    reject(reason?: string): void {
        if (!this._pendingOrder) return;
        this._pendingOrder = null;
        this.pending = false;
        announceA11y(reason ?? `${this._getColumnLabel()} : échec du tri.`);
    }

    private _syncParentTh(): void {
        const th = this.closest('th');
        if (!th) {
            warn(
                'ar-table-sort',
                'ar-table-sort doit être placé dans un <th> — aria-sort ne sera pas posé.',
            );
            return;
        }
        const ariaSort = ({ none: 'none', asc: 'ascending', desc: 'descending' } as const)[
            this.order
        ];
        th.setAttribute('aria-sort', ariaSort);
        if (!th.hasAttribute('scope')) th.setAttribute('scope', 'col');
    }

    private _getColumnLabel(): string {
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
        if (!slot) return '';
        return slot
            .assignedNodes({ flatten: true })
            .map((n) => n.textContent ?? '')
            .join('')
            .trim();
    }

    private _handleClick(): void {
        if (this.pending) {
            announceA11y('Tri en cours, veuillez patienter.');
            return;
        }
        const requestedOrder = nextOrder(this.order);
        this._pendingOrder = requestedOrder;
        this.pending = true;
        this.dispatchEvent(
            new CustomEvent('ar-table-sort-change', {
                bubbles: true,
                composed: true,
                detail: {
                    type: this.type,
                    currentOrder: this.order,
                    requestedOrder,
                    columnLabel: this._getColumnLabel(),
                },
            }),
        );
    }

    override render() {
        const label = getActionLabel(this.type, this.order, this.pending);
        return html`
            <button
                part="button"
                type="button"
                aria-disabled=${this.pending ? 'true' : nothing}
                @click=${this._handleClick}
                id=${this._buttonId}
            >
                <slot></slot>
                <span part="indicator" aria-hidden="true"></span>
            </button>
            <ar-tooltip for=${this._buttonId}>${label}</ar-tooltip>
        `;
    }
}
