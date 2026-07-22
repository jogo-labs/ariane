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
 * @csspart base - Wrapper du slot — couleur, fond, padding, box-shadow actif.
 *
 * @cssprop --ar-tab-color - Couleur du texte (état par défaut).
 * @cssprop --ar-tab-bg - Fond (état par défaut).
 * @cssprop --ar-tab-padding-x - Padding horizontal.
 * @cssprop --ar-tab-padding-y - Padding vertical.
 * @cssprop --ar-tab-border-radius - Rayon de bordure (utile pour le style pill).
 * @cssprop --ar-tab-font-weight - Graisse du texte.
 * @cssprop --ar-tab-hover-color - Couleur du texte au survol.
 * @cssprop --ar-tab-hover-bg - Fond au survol.
 * @cssprop --ar-tab-active-color - Couleur du texte quand l'onglet est actif.
 * @cssprop --ar-tab-active-bg - Fond quand l'onglet est actif.
 * @cssprop --ar-tab-active-shadow - box-shadow complet sur part="base" quand actif. Le thème par défaut le compose depuis --ar-tab-indicator-color et --ar-tab-indicator-width.
 * @cssprop --ar-tab-indicator-color - Couleur de l'indicateur actif (utilisé par le thème pour composer --ar-tab-active-shadow).
 * @cssprop --ar-tab-indicator-width - Épaisseur de l'indicateur actif (utilisé par le thème pour composer --ar-tab-active-shadow).
 * @cssprop --ar-tab-disabled-opacity - Opacité de l'onglet désactivé.
 * @cssprop --ar-tab-focus-ring-offset - Décalage de la bague de focus. Valeur négative = inset (non coupée par le conteneur overflow du tab-group). Surcharge le token global --ar-focus-ring-offset pour ce composant.
 *
 * Note d'implémentation : la mise en page de [part='base'] compense la bordure de son parent
 * ar-tab-group via les tokens --ar-tab-group-border-top-width / --ar-tab-group-border-bottom-width
 * (déclarés et documentés sur ar-tab-group, cf. tab-group.ts) — pas des tokens propres à ar-tab.
 * Le fallback 0px est structurel (évite un décalage visuel si ar-tab est utilisé hors d'un
 * ar-tab-group) et reste volontaire.
 */
export class ArTab extends LitElement {
    static override styles = [styles];

    /** Nom du ar-tab-panel associé. Requis. */
    @property({ reflect: true }) panel = '';

    /** Désactive l'onglet — non sélectionnable, ignoré au clavier. */
    @property({ reflect: true, type: Boolean }) disabled = false;

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
        return html`<div part="base"><slot></slot></div>`;
    }
}
