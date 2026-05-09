import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
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
 * @cssprop [--ar-tab-color=inherit] - Couleur du texte (état par défaut).
 * @cssprop [--ar-tab-bg=transparent] - Fond (état par défaut).
 * @cssprop [--ar-tab-padding-x=1rem] - Padding horizontal.
 * @cssprop [--ar-tab-padding-y=0.5rem] - Padding vertical.
 * @cssprop [--ar-tab-border-radius=0] - Rayon de bordure (utile pour le style pill).
 * @cssprop [--ar-tab-font-weight=inherit] - Graisse du texte.
 * @cssprop [--ar-tab-hover-color=inherit] - Couleur du texte au survol.
 * @cssprop [--ar-tab-hover-bg=transparent] - Fond au survol.
 * @cssprop [--ar-tab-active-color=inherit] - Couleur du texte quand l'onglet est actif.
 * @cssprop [--ar-tab-active-bg=transparent] - Fond quand l'onglet est actif.
 * @cssprop [--ar-tab-active-shadow=none] - box-shadow complet sur part="base" quand actif. Le thème par défaut le compose depuis --ar-tab-indicator-color et --ar-tab-indicator-width.
 * @cssprop [--ar-tab-indicator-color=currentColor] - Couleur de l'indicateur actif (utilisé par le thème pour composer --ar-tab-active-shadow).
 * @cssprop [--ar-tab-indicator-width=2px] - Épaisseur de l'indicateur actif (utilisé par le thème pour composer --ar-tab-active-shadow).
 * @cssprop [--ar-tab-disabled-opacity=0.5] - Opacité de l'onglet désactivé.
 */
@customElement('ar-tab')
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

declare global {
    interface HTMLElementTagNameMap {
        'ar-tab': ArTab;
    }
}
