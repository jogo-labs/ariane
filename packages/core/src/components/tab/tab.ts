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
 * @csspart base - Wrapper du slot.
 */
@customElement('ar-tab')
export class ArTab extends LitElement {
    static override styles = [styles];

    /** Nom du ar-tab-panel associé. Requis. */
    @property({ reflect: true }) panel = '';

    /** Désactive l'onglet — non sélectionnable, ignoré au clavier. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    _registry?: TabGroupRegistry;

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
