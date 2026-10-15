import { html, nothing, type PropertyValues } from 'lit';
import { ArianeElement } from '../../base/ariane-element.js';
import { property } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';
import { tabGroupContext, type TabGroupRegistry } from '../../context/tabs.context.js';
import { ArTab } from '../tab/tab.js';
import { ArTabPanel } from '../tab-panel/tab-panel.js';
import { warn } from '../../utils/warn.js';
import { emitEvent } from '../../utils/emit-event.js';
import styles from './tab-group.styles.js';
import { reflectWhenNotEmpty } from '../../internal/reflect-when-not-empty.js';

/**
 * @summary Organise du contenu associé dans un même conteneur qui affiche un panneau à la fois, avec des onglets pour naviguer entre eux.
 * @display demo
 *
 * @slot - ar-tab et ar-tab-panel enfants.
 *
 * @csspart tab-group - Racine du composant.
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
 * @event {CustomEvent<{ id: string | undefined, active: string }>} ar-tab-group-change - Émis quand l'onglet actif change.
 *
 * @tagname ar-tab-group
 */
export class ArTabGroup extends ArianeElement {
    static override styles = [styles];

    /** Nom de l'onglet actif. Si absent, le premier onglet non-disabled s'active. */
    @property({ reflect: true, converter: reflectWhenNotEmpty }) active = '';

    /** aria-label sur le tablist — recommandé si plusieurs ar-tab-group sur la page. */
    @property({ reflect: true, converter: reflectWhenNotEmpty }) label = '';

    /** Active le mode manuel : les flèches déplacent le focus sans activer l'onglet. */
    @property({ attribute: 'manual-activation', reflect: true, type: Boolean })
    manualActivation = false;

    private _tabs: ArTab[] = [];
    private _panels: ArTabPanel[] = [];
    private readonly _prefix = Math.random().toString(36).slice(2, 9);
    private _initialized = false;
    private _hasUpdatedOnce = false;
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
                emitEvent(this, 'ar-tab-group-change', { detail: { active: newActive } });
            }
        },
        notifyTabChanged: (tab: ArTab) => {
            const wasActive = tab.panel === this.active;
            this._syncAll();
            if (wasActive && tab.disabled) {
                const newActive = this._effectiveActive;
                if (newActive !== this.active) {
                    this.active = newActive;
                    emitEvent(this, 'ar-tab-group-change', { detail: { active: newActive } });
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
            emitEvent(this, 'ar-tab-group-change', { detail: { active: name } });
        },
    };

    protected readonly _provider = new ContextProvider(this, {
        context: tabGroupContext,
        initialValue: this._registry,
    });

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('active')) {
            this._syncAll();
            // Ne pas scroller au tout premier rendu : `changed.has('active')` est déjà vrai
            // dès ce cycle si l'attribut initial diffère de la valeur par défaut.
            if (this._hasUpdatedOnce) {
                this._scrollActiveTabIntoView();
            }
        }
        this._hasUpdatedOnce = true;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.addEventListener('keydown', this._handleKeyDown);
        this._collectExistingItems();
        if (this._initialized) this._setupScrollHints();
    }

    /**
     * Rattache les onglets et panneaux déjà définis avant le groupe (ordre de chargement d'un
     * framework, de l'autoloader ou d'imports par composant) : ils ont demandé leur registre par
     * contexte avant que le groupe existe et n'ont reçu aucune réponse. Un élément n'appartient à
     * ce groupe que si son groupe le plus proche est celui-ci (groupes imbriqués).
     */
    private _collectExistingItems(): void {
        for (const el of this.querySelectorAll('*')) {
            if (el.parentElement?.closest(this.localName) !== this) continue;
            if (el instanceof ArTab && !this._tabs.includes(el)) el.setRegistry(this._registry);
            else if (el instanceof ArTabPanel && !this._panels.includes(el)) {
                el.setRegistry(this._registry);
            }
        }
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

    /** `id` générés par le composant : seuls ceux-là sont régénérés, jamais un `id` de l'application. */
    private readonly _generatedIds = new WeakMap<Element, string>();

    private _ensureId(el: HTMLElement, wanted: string): void {
        if (!el.id || el.id === this._generatedIds.get(el)) {
            el.id = wanted;
            this._generatedIds.set(el, wanted);
        }
    }

    private _syncAll(): void {
        const active = this._effectiveActive;
        const pfx = this._prefix;

        // Les `id` d'abord (panneaux et onglets) : l'ARIA se câble sur les `id` réels.
        this._panels.forEach((panel) => this._ensureId(panel, `${pfx}-panel-${panel.name}`));
        this._tabs.forEach((tab) => this._ensureId(tab, `${pfx}-tab-${tab.panel}`));

        this._tabs.forEach((tab) => {
            const isActive = tab.panel === active;
            const panel = this._panels.find((p) => p.name === tab.panel);
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-controls', panel?.id ?? `${pfx}-panel-${tab.panel}`);
            tab.setAttribute('aria-selected', String(isActive));
            tab.active = isActive;
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
            if (tab.disabled) {
                tab.setAttribute('aria-disabled', 'true');
            } else {
                tab.removeAttribute('aria-disabled');
            }
            if (tab.panel && !panel) {
                if (this._initialized) {
                    warn('ar-tab-group', `Aucun ar-tab-panel avec name="${tab.panel}" trouvé.`);
                }
            }
        });

        this._panels.forEach((panel) => {
            const isActive = panel.name === active;
            const tab = this._tabs.find((t) => t.panel === panel.name);
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', tab?.id ?? `${pfx}-tab-${panel.name}`);
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
