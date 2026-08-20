import { LitElement, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import styles from './table-sort.styles.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { warn } from '../../utils/warn.js';
import { LocalizeController } from '../../controllers/localize.controller.js';
// fr avant en : la première traduction enregistrée devient le repli de la lib pour les langues non reconnues.
import '../../translations/fr.js';
import '../../translations/en.js';
import '../tooltip/index.js';

export type TableSortType = 'alpha' | 'numeric' | 'date';
export type TableSortOrder = 'none' | 'asc' | 'desc';

const CYCLE: TableSortOrder[] = ['none', 'asc', 'desc'];

function nextOrder(current: TableSortOrder): TableSortOrder {
    return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
}

/**
 * @summary Entête de colonne triable accessible, avec indicateur visuel de la direction de tri.
 * @display demo
 * @localized
 *
 * Placer à l'intérieur d'un `<th>`. Le composant met à jour `aria-sort` et `scope="col"` sur
 * le `<th>` ancêtre. Appeler `confirm()` après un tri réussi, ou `reject()` en cas d'échec.
 *
 * @slot - Libellé de la colonne.
 *
 * @csspart sort-button    - Le bouton déclencheur.
 * @csspart sort-button--pending - Le bouton pendant l'attente de confirmation (variante d'état de `sort-button`).
 * @csspart action-button - Porté par `sort-button` : bouton qui déclenche une action ponctuelle.
 * @csspart indicator - L'icône de direction de tri.
 *
 * @cssprop --ar-table-sort-indicator-size - Taille de l'icône indicateur asc / desc.
 * @cssprop --ar-table-sort-indicator-color - Couleur état neutre.
 * @cssprop --ar-table-sort-indicator-active-color - Couleur état actif (asc/desc).
 * @cssprop --ar-table-sort-indicator-pending-color - Couleur état pending.
 *
 * @event {CustomEvent<{ type: TableSortType; currentOrder: TableSortOrder; requestedOrder: TableSortOrder; columnLabel: string }>} ar-table-sort-change - Émis au clic quand pending est false.
 */
export class ArTableSort extends LitElement {
    static override styles = [styles];

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
    private readonly localize = new LocalizeController(this);

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
        announceA11y(this.localize.term('sortApplied', this._getColumnLabel(), newOrder));
    }

    /** Remet le tri à "none" et annonce le reset aux lecteurs d'écran. Sans effet si déjà "none". */
    reset(): void {
        if (this.order === 'none') return;
        this.order = 'none';
        announceA11y(this.localize.term('sortApplied', this._getColumnLabel(), 'none'));
    }

    /**
     * Annule le pending order. Sans effet si pending est false.
     * @param reason Message annoncé aux lecteurs d'écran. Par défaut : "échec du tri".
     */
    reject(reason?: string): void {
        if (!this._pendingOrder) return;
        this._pendingOrder = null;
        this.pending = false;
        announceA11y(reason ?? this.localize.term('sortFailed', this._getColumnLabel()));
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
            announceA11y(this.localize.term('sortInProgress'));
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

    private _getActionLabel(): string {
        if (this.pending) return this.localize.term('sortPending');
        if (this.order === 'none') return this.localize.term('sortAscending', this.type);
        if (this.order === 'asc') return this.localize.term('sortDescending', this.type);
        return this.localize.term('sortReset', this.type);
    }

    override render() {
        const label = this._getActionLabel();
        return html`
            <button
                part="sort-button action-button${this.pending ? ' sort-button--pending' : ''}"
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
