import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';
import { tabGroupContext, type TabGroupRegistry } from '../../context/tabs.context.js';
import type { ArTab } from '../tab/tab.js';
import type { ArTabPanel } from '../tab-panel/tab-panel.js';
import { warn } from '../../utils/warn.js';
import styles from './tab-group.styles.js';

/**
 * @summary Groupe d'onglets accessibles — pattern WAI-ARIA Tabs complet.
 * @display demo
 *
 * @slot - ar-tab et ar-tab-panel enfants.
 *
 * @csspart tab-group - Conteneur racine.
 * @csspart nav       - Zone scrollable (overflow-x: auto).
 * @csspart tabs      - div[role="tablist"].
 *
 * Les classes `has-overflow-start` et `has-overflow-end` sont ajoutées automatiquement sur l'hôte
 * quand le contenu de la tablist déborde à gauche ou à droite.
 *
 * @cssprop --ar-tab-group-border-top-width - Épaisseur du trait séparateur en haut de la la tablist. Mettre à 1px pour l'activer.
 * @cssprop --ar-tab-group-border-bottom-width - Épaisseur du trait séparateur sous la tablist. Mettre à 1px pour l'activer.
 * @cssprop --ar-tab-group-border-color - Couleur du trait séparateur sous la tablist.
 *
 * @event {CustomEvent<{ active: string }>} ar-tab-group-change - Émis quand l'onglet actif change.
 */
export class ArTabGroup extends LitElement {
    static override styles = [styles];

    /** Nom de l'onglet actif. Si absent, le premier onglet non-disabled s'active. */
    @property({ reflect: true }) active = '';

    /** aria-label sur le tablist — recommandé si plusieurs ar-tab-group sur la page. */
    @property({ reflect: true }) label = '';

    /** Active le mode manuel : les flèches déplacent le focus sans activer l'onglet. */
    @property({ attribute: 'manual-activation', reflect: true, type: Boolean })
    manualActivation = false;

    private _tabs: ArTab[] = [];
    private _panels: ArTabPanel[] = [];
    private readonly _prefix = Math.random().toString(36).slice(2, 9);
    private _initialized = false;
    private _resizeObserver?: ResizeObserver | undefined;
    private _scrollHintsUnlisten?: (() => void) | undefined;

    private readonly _registry: TabGroupRegistry = {
        registerTab: (tab: ArTab) => {
            if (!this._tabs.includes(tab)) {
                this._tabs.push(tab);
                this._tabs.sort((a, b) =>
                    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
                );
            }
            tab.setAttribute('slot', 'tab');
            this._syncAll();
        },
        unregisterTab: (tab: ArTab) => {
            const wasActive = tab.panel === this.active;
            this._tabs = this._tabs.filter((t) => t !== tab);
            this._syncAll();
            if (wasActive) {
                const newActive = this._effectiveActive;
                this.active = newActive;
                this._emit('ar-tab-group-change', { active: newActive });
            }
        },
        notifyTabChanged: (tab: ArTab) => {
            const wasActive = tab.panel === this.active;
            this._syncAll();
            if (wasActive && tab.disabled) {
                const newActive = this._effectiveActive;
                if (newActive !== this.active) {
                    this.active = newActive;
                    this._emit('ar-tab-group-change', { active: newActive });
                }
            }
        },
        registerPanel: (panel: ArTabPanel) => {
            if (!this._panels.includes(panel)) {
                this._panels.push(panel);
            }
            this._syncAll();
        },
        unregisterPanel: (panel: ArTabPanel) => {
            this._panels = this._panels.filter((p) => p !== panel);
            this._syncAll();
        },
        activate: (name: string) => {
            if (this.active === name) return;
            this.active = name;
            this._syncAll();
            this._scrollActiveTabIntoView();
            this._emit('ar-tab-group-change', { active: name });
        },
    };

    protected readonly _provider = new ContextProvider(this, {
        context: tabGroupContext,
        initialValue: this._registry,
    });

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('active')) {
            this._syncAll();
            this._scrollActiveTabIntoView();
        }
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener('keydown', this._handleKeyDown);
        if (this._initialized) this._setupScrollHints();
    }

    override firstUpdated(): void {
        this._initialized = true;
        this._setupScrollHints();
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.removeEventListener('keydown', this._handleKeyDown);
        this._resizeObserver?.disconnect();
        this._scrollHintsUnlisten?.();
    }

    override render() {
        return html`
            <div part="tab-group">
                <div part="nav">
                    <div part="tabs" role="tablist" aria-label=${this.label || nothing}>
                        <slot name="tab"></slot>
                    </div>
                </div>
                <slot></slot>
            </div>
        `;
    }

    private get _effectiveActive(): string {
        const found = this._tabs.find((t) => t.panel === this.active && !t.disabled);
        if (found) return this.active;
        return this._tabs.find((t) => !t.disabled)?.panel ?? '';
    }

    private _syncAll(): void {
        const active = this._effectiveActive;
        const pfx = this._prefix;

        this._tabs.forEach((tab) => {
            const isActive = tab.panel === active;
            tab.setAttribute('role', 'tab');
            tab.id = `${pfx}-tab-${tab.panel}`;
            tab.setAttribute('aria-controls', `${pfx}-panel-${tab.panel}`);
            tab.setAttribute('aria-selected', String(isActive));
            tab.active = isActive;
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
            if (tab.disabled) {
                tab.setAttribute('aria-disabled', 'true');
            } else {
                tab.removeAttribute('aria-disabled');
            }
            if (tab.panel && !this._panels.find((p) => p.name === tab.panel)) {
                if (this._initialized) {
                    warn('ar-tab-group', `Aucun ar-tab-panel avec name="${tab.panel}" trouvé.`);
                }
            }
        });

        this._panels.forEach((panel) => {
            const isActive = panel.name === active;
            panel.setAttribute('role', 'tabpanel');
            panel.id = `${pfx}-panel-${panel.name}`;
            panel.setAttribute('aria-labelledby', `${pfx}-tab-${panel.name}`);
            panel.setAttribute('tabindex', '0');
            if (isActive) {
                panel.removeAttribute('hidden');
            } else {
                panel.setAttribute('hidden', '');
            }
        });
    }

    /** Scrolle la zone de navigation d'un certain nombre de pixels vers `'start'` ou `'end'`. */
    scrollNav(direction: 'start' | 'end', amount = 200): void {
        const nav = this.shadowRoot?.querySelector<HTMLElement>('[part="nav"]');
        nav?.scrollBy({ left: direction === 'end' ? amount : -amount, behavior: 'smooth' });
    }

    private _scrollActiveTabIntoView(): void {
        const active = this._effectiveActive;
        const tab = this._tabs.find((t) => t.panel === active);
        tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    private _emit(name: string, detail: unknown): void {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    private _handleKeyDown = (e: KeyboardEvent): void => {
        const target = e.composedPath()[0] as Element;
        if (!this._tabs.some((t) => t === target)) return;

        const enabledTabs = this._tabs.filter((t) => !t.disabled);
        if (enabledTabs.length === 0) return;

        const currentIdx = enabledTabs.findIndex((t) => t === target);

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowRight': {
                e.preventDefault();
                const dir = e.key === 'ArrowLeft' ? -1 : 1;
                const newIdx =
                    currentIdx === -1
                        ? dir === 1
                            ? 0
                            : enabledTabs.length - 1
                        : (currentIdx + dir + enabledTabs.length) % enabledTabs.length;
                this._moveFocusTo(enabledTabs[newIdx]);
                if (!this.manualActivation) {
                    this._registry.activate(enabledTabs[newIdx].panel);
                }
                break;
            }
            case 'Home':
                e.preventDefault();
                this._moveFocusTo(enabledTabs[0]);
                if (!this.manualActivation) this._registry.activate(enabledTabs[0].panel);
                break;
            case 'End':
                e.preventDefault();
                this._moveFocusTo(enabledTabs[enabledTabs.length - 1]);
                if (!this.manualActivation)
                    this._registry.activate(enabledTabs[enabledTabs.length - 1].panel);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (this.manualActivation) {
                    const tab = this._tabs.find((t) => t === target);
                    if (tab) this._registry.activate(tab.panel);
                }
                break;
        }
    };

    private _moveFocusTo(tab: ArTab): void {
        this._tabs.forEach((t) => t.setAttribute('tabindex', '-1'));
        tab.setAttribute('tabindex', '0');
        tab.focus();
    }

    private _setupScrollHints(): void {
        this._resizeObserver?.disconnect();
        this._scrollHintsUnlisten?.();
        this._scrollHintsUnlisten = undefined;

        const nav = this.shadowRoot?.querySelector<HTMLElement>('[part="nav"]');
        if (!nav) return;

        const update = () => {
            const scrollLeft = Math.abs(nav.scrollLeft);
            this.classList.toggle('has-overflow-start', scrollLeft > 0);
            this.classList.toggle(
                'has-overflow-end',
                Math.ceil(scrollLeft + nav.clientWidth) < nav.scrollWidth,
            );
        };

        this._resizeObserver = new ResizeObserver(update);
        this._resizeObserver.observe(nav);
        nav.addEventListener('scroll', update, { passive: true });
        this._scrollHintsUnlisten = () => nav.removeEventListener('scroll', update);
        update();
    }
}
