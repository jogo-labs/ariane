import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';
import { tabGroupContext, type TabGroupRegistry } from '../../context/tabs.context.js';
import styles from './tab-panel.styles.js';

/**
 * @summary Panneau de contenu pour ar-tab-group.
 * @parent ar-tab-group
 * @display docs
 *
 * @slot - Contenu du panel.
 *
 * @csspart tab-panel - Racine du composant.
 */
export class ArTabPanel extends LitElement {
    static override styles = [styles];

    /** Nom correspondant à l'attribut `panel` du ar-tab associé. Requis. */
    @property({ reflect: true }) name = '';

    private _registry?: TabGroupRegistry | undefined;

    protected readonly _consumer = new ContextConsumer(this, {
        context: tabGroupContext,
        subscribe: true,
        callback: (registry) => this._setRegistry(registry),
    });

    private _setRegistry(registry: TabGroupRegistry): void {
        if (this._registry) {
            this._registry.unregisterPanel(this);
        }
        this._registry = registry;
        registry.registerPanel(this);
    }

    override disconnectedCallback(): void {
        this._registry?.unregisterPanel(this);
        this._registry = undefined;
        super.disconnectedCallback();
    }

    override render() {
        return html`<div part="tab-panel"><slot></slot></div>`;
    }
}
