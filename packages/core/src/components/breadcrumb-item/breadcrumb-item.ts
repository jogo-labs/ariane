import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ContextConsumer } from '@lit/context';

import { breadcrumbContext, type BreadcrumbRegistry } from '../../context/breadcrumb.context.js';

/**
 * @summary Élément enfant de ar-breadcrumb.
 * @parent ar-breadcrumb
 * @display docs
 */
@customElement('ar-breadcrumb-item')
export class ArBreadcrumbItem extends LitElement {
    @property({ type: String }) label = '';
    @property({ type: String }) href?: string;

    private _registry: BreadcrumbRegistry | undefined = undefined;

    protected readonly _consumer = new ContextConsumer(this, {
        context: breadcrumbContext,
        subscribe: true,
        callback: (registry) => this.setRegistry(registry),
    });

    setRegistry(registry: BreadcrumbRegistry) {
        if (this._registry) this._registry.unregisterItem(this);
        this._registry = registry;
        registry.registerItem(this);
    }

    override disconnectedCallback() {
        this._registry?.unregisterItem(this);
        this._registry = undefined;
        super.disconnectedCallback();
    }

    override updated(changed: Map<string, unknown>) {
        changed.forEach((oldValue, prop) => {
            if (oldValue === undefined) return;
            if (prop === 'label' || prop === 'href') {
                this._registry?.notifyItemChanged(this);
            }
        });
    }

    override createRenderRoot() {
        return this;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-breadcrumb-item': ArBreadcrumbItem;
    }
}
