import { LitElement, html, type TemplateResult, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';
import { ArDropdownItem } from '../dropdown-item/dropdown-item.js';
import { warn } from '../../utils/warn.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import styles from './dropdown.styles.js';

export type ArDropdownPlacement =
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'right'
    | 'right-start'
    | 'right-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'left'
    | 'left-start'
    | 'left-end';

/**
 * @summary Mécanisme de disclosure accessible basé sur l'API popover native.
 * @display demo
 *
 * @slot trigger  - Le bouton déclencheur (ignoré si `for` est défini).
 * @slot          - Contenu du panel (libre ou ar-dropdown-item pour le mode menu).
 *
 * @csspart panel - Le panel flottant.
 *
 * @cssprop [--ar-dropdown-min-width=10rem] - Largeur minimale du panel.
 * @cssprop [--ar-dropdown-color=var(--ar-panel-text)] - Couleur du texte (cascade vers --ar-panel-text).
 * @cssprop [--ar-dropdown-max-width=var(--ar-panel-max-width)] - Largeur maximale (cascade vers --ar-panel-max-width).
 * @cssprop [--ar-dropdown-padding=var(--ar-panel-padding)] - Marge interne (cascade vers --ar-panel-padding).
 * @cssprop [--ar-dropdown-bg=var(--ar-panel-bg)] - Fond du panel (cascade vers --ar-panel-bg).
 * @cssprop [--ar-dropdown-border-color=var(--ar-panel-border-color)] - Bordure (cascade vers --ar-panel-border-color).
 * @cssprop [--ar-dropdown-border-radius=var(--ar-panel-radius)] - Arrondi (cascade vers --ar-panel-radius).
 * @cssprop [--ar-dropdown-shadow=var(--ar-panel-shadow)] - Ombre (cascade vers --ar-panel-shadow).
 * @cssprop [--ar-dropdown-distance=var(--ar-anchor-distance)] - Espacement entre le trigger et le panel (axe principal).
 * @cssprop [--ar-dropdown-offset=var(--ar-anchor-offset)] - Décalage latéral du panel (axe transversal).
 *
 * @event {CustomEvent} ar-dropdown-show    - Émis avant l'ouverture (annulable).
 * @event {CustomEvent} ar-dropdown-shown   - Émis après l'ouverture.
 * @event {CustomEvent} ar-dropdown-hide    - Émis avant la fermeture (annulable).
 * @event {CustomEvent} ar-dropdown-hidden  - Émis après la fermeture.
 */
export class ArDropdown extends LitElement {
    static override styles = [panelStyles, styles];

    /** Ouvre ou ferme le panel. */
    @property({ reflect: true, type: Boolean }) open = false;

    /** Placement du panel par rapport au trigger (Floating UI). */
    @property({ reflect: true }) placement: ArDropdownPlacement = 'bottom-start';

    /** Désactive le composant — le trigger ne répond plus aux clics. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    /**
     * Désactive le verrouillage du scroll des conteneurs ancêtres à l'ouverture.
     * Par défaut, le scroll est bloqué comme le fait le `<select>` natif.
     * À activer uniquement si le jitter de positionnement est acceptable.
     */
    @property({ attribute: 'no-scroll-lock', reflect: true, type: Boolean }) noScrollLock = false;

    /**
     * ID d'un élément déclencheur externe (light DOM). Quand défini, le slot
     * `trigger` est ignoré.
     */
    @property({ reflect: true }) for = '';

    @query('[part="panel"]') private _panel!: HTMLElement;

    private readonly _popover = new AnchoredController(this, {
        cssVarPrefix: 'dropdown',
        onExternalClose: () => {
            this.open = false;
        },
    });

    private _menuItems: ArDropdownItem[] = [];
    private _menuMode = false;
    private _activeIndex = -1;
    private _externalTrigger: HTMLElement | null = null;
    private readonly _uniqueId = Math.random().toString(36).slice(2, 9);

    override firstUpdated(): void {
        if (this.for) {
            const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
            if (slot?.assignedElements({ flatten: true }).length) {
                warn(
                    'ar-dropdown',
                    'for et slot="trigger" sont tous les deux définis — for prend la priorité.',
                );
            }
        }
        const trigger = this._resolvedTrigger;
        if (trigger && this._panel) {
            this._popover.attach(trigger, this._panel);
            if (this.for) {
                trigger.addEventListener('click', this._handleTriggerClick);
                this._externalTrigger = trigger;
            }
        }
        if (this.open) this._show();
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('placement')) {
            this._popover.setPlacement(this.placement);
        }
        if (changed.has('noScrollLock')) {
            this._popover.setLockScroll(!this.noScrollLock);
        }
        if (changed.has('for')) {
            this._externalTrigger?.removeEventListener('click', this._handleTriggerClick);
            this._externalTrigger = null;
            const newTrigger = this._resolvedTrigger;
            if (this.for && !newTrigger) {
                warn('ar-dropdown', `Aucun élément trouvé avec l'id "${this.for}".`);
            }
            if (newTrigger && this._panel) {
                this._popover.attach(newTrigger, this._panel);
                if (this.for) {
                    newTrigger.addEventListener('click', this._handleTriggerClick);
                    this._externalTrigger = newTrigger;
                }
            }
        }
        if (changed.has('open')) {
            if (this.open) this._show();
            else this._hide();
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this._externalTrigger?.removeEventListener('click', this._handleTriggerClick);
        this._panel?.removeEventListener('keydown', this._handlePanelKeyDown);
        this._removeMenuListeners();
    }

    override render(): TemplateResult {
        return html`
            <slot name="trigger" @slotchange=${this._handleTriggerSlotChange}></slot>
            <div part="panel" popover="auto" id="ar-dp-panel-${this._uniqueId}">
                <slot @slotchange=${this._handleDefaultSlotChange}></slot>
            </div>
        `;
    }

    private get _resolvedTrigger(): HTMLElement | null {
        if (this.for) {
            const root = this.getRootNode() as Document | ShadowRoot;
            return root.getElementById(this.for);
        }
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
        return (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? null;
    }

    private _handleTriggerSlotChange(): void {
        if (this.for) {
            const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]');
            if (slot?.assignedElements({ flatten: true }).length) {
                warn(
                    'ar-dropdown',
                    'for et slot="trigger" sont tous les deux définis — for prend la priorité.',
                );
            }
            return;
        }
        const trigger = this._resolvedTrigger;
        if (!trigger || !this._panel) return;
        this._popover.attach(trigger, this._panel);
        trigger.addEventListener('click', this._handleTriggerClick);
    }

    private _handleDefaultSlotChange(): void {
        this._detectMenuMode();
    }

    private _detectMenuMode(): void {
        this._menuItems = [...this.querySelectorAll('*')].filter(
            (el): el is ArDropdownItem => el instanceof ArDropdownItem,
        );
        this._menuMode = this._menuItems.length > 0;
        if (this._panel) {
            if (this._menuMode) {
                this._panel.setAttribute('role', 'menu');
                this.querySelectorAll('hr').forEach((hr) => hr.setAttribute('role', 'separator'));
            } else {
                this._panel.removeAttribute('role');
            }
        }
    }

    private _handleTriggerClick = (): void => {
        if (this.disabled) return;
        this.open = !this.open;
    };

    private _show(): void {
        const showEv = this._emit('ar-dropdown-show');
        if (showEv.defaultPrevented) {
            this.open = false;
            return;
        }
        this._detectMenuMode();
        this._panel?.addEventListener('keydown', this._handlePanelKeyDown);
        if (this._menuMode) this._activateMenuListeners();
        void this._popover.show().then(() => {
            if (this._menuMode) this._focusMenuItem(0);
            this._emit('ar-dropdown-shown');
        });
    }

    private _hide(): void {
        const hideEv = this._emit('ar-dropdown-hide');
        if (hideEv.defaultPrevented) {
            this.open = true;
            return;
        }
        this._panel?.removeEventListener('keydown', this._handlePanelKeyDown);
        this._removeMenuListeners();
        this._activeIndex = -1;
        this._popover.hide();
        this._resolvedTrigger?.focus();
        this._emit('ar-dropdown-hidden');
    }

    private _emit(name: string): CustomEvent {
        const e = new CustomEvent(name, {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail: { id: this.id || undefined },
        });
        this.dispatchEvent(e);
        return e;
    }

    private _activateMenuListeners(): void {
        this._panel?.addEventListener('keydown', this._handleMenuKeyDown);
    }

    private _removeMenuListeners(): void {
        this._panel?.removeEventListener('keydown', this._handleMenuKeyDown);
    }

    private _handlePanelKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' || e.key === 'Tab') this.open = false;
    };

    private _handleMenuKeyDown = (e: KeyboardEvent): void => {
        const items = this._focusableMenuItems();
        if (!items.length) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this._focusMenuItem(Math.min(this._activeIndex + 1, items.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                this._focusMenuItem(Math.max(this._activeIndex - 1, 0));
                break;
            case 'Home':
                e.preventDefault();
                this._focusMenuItem(0);
                break;
            case 'End':
                e.preventDefault();
                this._focusMenuItem(items.length - 1);
                break;
        }
    };

    private _focusableMenuItems(): HTMLElement[] {
        return this._menuItems
            .map((item) => {
                const slot = item.shadowRoot?.querySelector('slot') as HTMLSlotElement | null;
                return slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined;
            })
            .filter((el): el is HTMLElement => el != null);
    }

    private _focusMenuItem(index: number): void {
        const items = this._focusableMenuItems();
        if (!items.length) return;
        const clamped = Math.max(0, Math.min(index, items.length - 1));
        items.forEach((el, i) => {
            el.tabIndex = i === clamped ? 0 : -1;
        });
        this._activeIndex = clamped;
        items[clamped].focus({ preventScroll: true });
    }
}
