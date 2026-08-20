import { LitElement, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { tabGroupContext, type TabGroupRegistry } from '../../context/tabs.context.js';
import styles from './tab.styles.js';

/**
 * @summary Onglet déclencheur pour ar-tab-group.
 * @parent ar-tab-group
 * @display docs
 *
 * @slot - Libellé de l'onglet.
 *
 * @csspart tab - Racine du composant.
 * @csspart tab--selected - Wrapper du slot quand l'onglet est actif (variante d'état de `tab`, propriété `active` pilotée par ar-tab-group).
 *
 * @cssprop --ar-tab-padding-x - Padding horizontal.
 * @cssprop --ar-tab-padding-y - Padding vertical.
 * @cssprop --ar-tab-active-shadow - box-shadow complet sur part="tab--selected" quand actif. Repli `inset 0 -2px 0 Highlight` si aucun thème n'est chargé — sans lui, l'onglet actif est visuellement indiscernable des autres.
 * @cssprop --ar-tab-focus-ring-offset - Décalage de la bague de focus. Valeur négative = inset (non coupée par le conteneur overflow du tab-group). Repli `-2px` si aucun thème n'est chargé — sans lui, l'anneau de focus peut être rogné par le conteneur `overflow-x: auto` du tab-group. Surcharge le token global --ar-focus-ring-offset pour ce composant.
 * @cssprop --ar-tab-focus-ring-color - Couleur de la bague de focus de l'onglet (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 */
export class ArTab extends LitElement {
    static override styles = [styles];

    /** Nom du ar-tab-panel associé. Requis. */
    @property({ reflect: true }) panel = '';

    /** Désactive l'onglet — non sélectionnable, ignoré au clavier. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    /**
     * Vrai quand l'onglet est actif (sélectionné).
     * @readonly Piloté par ar-tab-group — ne pas modifier directement.
     */
    @property({ reflect: true, type: Boolean }) active = false;

    _registry?: TabGroupRegistry | undefined;

    protected readonly _consumer = new ContextConsumer(this, {
        context: tabGroupContext,
        subscribe: true,
        callback: (registry) => this._setRegistry(registry),
    });

    private _setRegistry(registry: TabGroupRegistry): void {
        if (this._registry) {
            this._registry.unregisterTab(this);
        }
        this._registry = registry;
        registry.registerTab(this);
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('disabled') && changed.get('disabled') !== undefined) {
            this._registry?.notifyTabChanged(this);
        }
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener('click', this._handleClick);
    }

    override disconnectedCallback(): void {
        this._registry?.unregisterTab(this);
        this._registry = undefined;
        this.removeEventListener('click', this._handleClick);
        super.disconnectedCallback();
    }

    private _handleClick = (): void => {
        if (!this.disabled) {
            this._registry?.activate(this.panel);
        }
    };

    override render() {
        return html`<div part="tab${this.active ? ' tab--selected' : ''}"><slot></slot></div>`;
    }
}
