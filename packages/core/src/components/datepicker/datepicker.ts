import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { CalendarController } from './calendar.controller.js';
import { HasSlotController } from '../../controllers/has-slot.controller.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';
import { parse } from './date-parser.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import styles from './datepicker.styles.js';

/**
 * @summary Champ de saisie de date avec calendrier popover accessible.
 *
 * @slot label       - Contenu riche du label (remplace le prop `label`).
 * @slot after-label - Éléments après le label (bouton d'aide, tooltip…).
 * @slot hint        - Texte d'aide persistant (format attendu). Lié via aria-describedby.
 * @slot error       - Message d'erreur. Déclenche has-error sur le host.
 *
 * @csspart input   - Le champ texte.
 * @csspart trigger - Le bouton d'ouverture du calendrier.
 * @csspart panel   - Le popover flottant.
 * @csspart header  - En-tête du calendrier (navigation).
 * @csspart grid    - La grille calendrier.
 * @csspart day     - Les boutons jours.
 * @csspart footer  - Pied du calendrier (boutons Aujourd'hui / Fermer).
 *
 * @cssprop [--ar-datepicker-panel-width=20rem] - Largeur du popover.
 * @cssprop [--ar-datepicker-day-size=2.25rem]  - Taille des cellules jour.
 * @cssprop [--ar-datepicker-day-today-bg]      - Fond du jour actuel.
 * @cssprop [--ar-datepicker-day-today-color]   - Couleur texte du jour actuel.
 * @cssprop [--ar-datepicker-day-selected-bg]   - Fond du jour sélectionné.
 * @cssprop [--ar-datepicker-day-selected-color]- Couleur texte du jour sélectionné.
 * @cssprop [--ar-datepicker-input-error-border-color] - Bordure input en état d'erreur.
 *
 * @event {CustomEvent} ar-datepicker-input-change   - Valeur commitée (blur ou sélection calendrier).
 * @event {CustomEvent} ar-datepicker-input-complete - Saisie texte complète (valide ou non).
 * @event {CustomEvent} ar-datepicker-show           - Avant ouverture du popover.
 * @event {CustomEvent} ar-datepicker-shown          - Après ouverture.
 * @event {CustomEvent} ar-datepicker-hide           - Avant fermeture.
 * @event {CustomEvent} ar-datepicker-hidden         - Après fermeture.
 */
@customElement('ar-datepicker')
export class ArDatepicker extends LitElement {
    static override styles = [panelStyles, styles];
    static formAssociated = true;

    private _internals: ElementInternals | undefined;
    private readonly _uid = Math.random().toString(36).slice(2, 9);

    private readonly _calendar = new CalendarController(this);
    private readonly _hasSlot = new HasSlotController(
        this,
        'label',
        'after-label',
        'hint',
        'error',
    );
    private readonly _anchored = new AnchoredController(this, {
        popupMode: 'dialog',
        placement: 'bottom-start',
        onExternalClose: () => {
            this.open = false;
        },
    });

    @property({ reflect: true }) value = '';
    @property() format = 'dd/MM/yyyy';
    @property() locale = '';
    @property() min = '';
    @property() max = '';
    @property({ attribute: false }) isDateDisabled?: (date: Date) => boolean;
    @property() placeholder = '';
    @property() autocomplete = '';
    @property() label = '';
    @property({ reflect: true, type: Boolean }) disabled = false;
    @property({ reflect: true, type: Boolean }) readonly = false;
    @property({ reflect: true, type: Boolean }) required = false;
    @property() name = '';
    @property({ reflect: true, type: Boolean }) open = false;

    @query('[part="input"]') private _input!: HTMLInputElement;
    @query('[part="panel"]') private _panel!: HTMLElement;
    @query('[part="trigger"]') private _trigger!: HTMLButtonElement;

    get inputElement(): HTMLInputElement {
        return this._input;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        // attachInternals() doit être appelé avant le premier render mais après
        // la définition de l'élément. On initialise ici pour la compatibilité
        // avec les environnements de test qui ne supportent pas l'initialisation
        // au niveau du champ de classe.
        this._internals ??= this.attachInternals?.();
    }

    override firstUpdated(): void {
        this._anchored.attach(this._trigger, this._panel);
        this._syncFormValue();
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('min') || changed.has('max') || changed.has('isDateDisabled')) {
            this._calendar.update({
                min: this.min,
                max: this.max,
                isDateDisabled: this.isDateDisabled,
            });
        }

        this.toggleAttribute('has-error', this._hasSlot.test('error'));

        if (changed.has('open')) {
            if (this.open) this._show();
            else this._hide();
        }

        if (changed.has('value')) {
            this._syncInputFromValue();
            this._syncFormValue();
        }
    }

    override render(): TemplateResult {
        const locale = this.locale || navigator.language;
        const defaultHint = `Format attendu : ${this.format}`;

        return html`
            <label part="label">
                <slot name="label">${this.label}</slot>
            </label>
            <slot name="after-label"></slot>

            <div class="input-wrapper">
                <input
                    part="input"
                    type="text"
                    ?disabled=${this.disabled}
                    ?readonly=${this.readonly}
                    ?required=${this.required}
                    autocomplete=${this.autocomplete || nothing}
                    placeholder=${this.placeholder || nothing}
                    aria-describedby="dp-hint-${this._uid} dp-error-${this._uid}"
                    @input=${this._handleInput}
                    @blur=${this._handleBlur}
                />
                <button
                    part="trigger"
                    type="button"
                    ?disabled=${this.disabled || this.readonly}
                    aria-label="Ouvrir le calendrier"
                    aria-haspopup="dialog"
                    @click=${this._handleTriggerClick}
                >
                    <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </button>
            </div>

            <p id="dp-hint-${this._uid}">
                <slot name="hint">${defaultHint}</slot>
            </p>
            <p id="dp-error-${this._uid}" role="alert">
                <slot name="error"></slot>
            </p>

            <div
                part="panel"
                popover="auto"
                role="dialog"
                aria-modal="true"
                aria-label="Sélectionner une date"
                id="ar-dp-panel-${this._uid}"
                @keydown=${this._handlePanelKeyDown}
            >
                ${this.open ? this._renderCalendar(locale) : nothing}
            </div>
        `;
    }

    private _renderCalendar(_locale: string): TemplateResult {
        return html`<!-- calendrier : Task 6 -->`;
    }

    private async _show(): Promise<void> {
        if (this.disabled || this.readonly) return;

        const allowed = this.dispatchEvent(
            new CustomEvent('ar-datepicker-show', {
                bubbles: true,
                composed: true,
                cancelable: true,
            }),
        );
        if (!allowed) {
            this.open = false;
            return;
        }

        const today = new Date();
        if (this.value) {
            const result = parse(this.value, 'yyyy-MM-dd');
            if (result.valid && result.date) {
                this._calendar.selectedDate = result.date;
                this._calendar.currentViewMonth = new Date(
                    result.date.getFullYear(),
                    result.date.getMonth(),
                    1,
                );
                this._calendar.focusedDate = new Date(
                    result.date.getFullYear(),
                    result.date.getMonth(),
                    result.date.getDate(),
                );
            }
        } else {
            this._calendar.selectedDate = null;
            this._calendar.currentViewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            this._calendar.focusedDate = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
            );
        }

        await this._anchored.show();
        await this.updateComplete;
        this._focusFocusedDay();

        this.dispatchEvent(
            new CustomEvent('ar-datepicker-shown', { bubbles: true, composed: true }),
        );
    }

    private _hide(): void {
        const allowed = this.dispatchEvent(
            new CustomEvent('ar-datepicker-hide', {
                bubbles: true,
                composed: true,
                cancelable: true,
            }),
        );
        if (!allowed) {
            this.open = true;
            return;
        }

        this._anchored.hide();

        this.dispatchEvent(
            new CustomEvent('ar-datepicker-hidden', { bubbles: true, composed: true }),
        );
    }

    private _handleTriggerClick(): void {
        if (this.disabled || this.readonly) return;
        this.open = !this.open;
    }

    private _focusFocusedDay(): void {
        const grid = this.shadowRoot?.querySelector('[part="grid"]');
        const btn = grid?.querySelector<HTMLButtonElement>('[tabindex="0"]');
        btn?.focus();
    }
    private _handleInput(_e: Event): void {
        /* Task 8 */
    }
    private _handleBlur(): void {
        /* Task 8 */
    }
    private _handlePanelKeyDown(_e: KeyboardEvent): void {
        /* Task 7 */
    }
    private _syncInputFromValue(): void {
        /* Task 8 */
    }
    private _syncFormValue(): void {
        /* Task 10 */
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-datepicker': ArDatepicker;
    }
}
