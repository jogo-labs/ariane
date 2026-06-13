import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { CalendarController } from './calendar.controller.js';
import { HasSlotController } from '../../controllers/has-slot.controller.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';
import { classMap } from 'lit/directives/class-map.js';
import { parse, format } from './date-parser.js';
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

    private _renderCalendar(locale: string): TemplateResult {
        const viewDate = this._calendar.currentViewMonth;
        const monthLabel = new Intl.DateTimeFormat(locale, {
            month: 'long',
            year: 'numeric',
        }).format(viewDate);

        const dayNames = this._getDayNames(locale);
        const weeks = this._calendar.getGridWeeks();

        return html`
            <div part="header">
                <button
                    type="button"
                    aria-label="Année précédente"
                    @click=${() => {
                        this._calendar.previousYear();
                        this._focusFocusedDay();
                    }}
                >
                    «
                </button>
                <button
                    type="button"
                    aria-label="Mois précédent"
                    @click=${() => {
                        this._calendar.previousMonth();
                        this._focusFocusedDay();
                    }}
                >
                    ‹
                </button>
                <span aria-live="polite">${monthLabel}</span>
                <button
                    type="button"
                    aria-label="Mois suivant"
                    @click=${() => {
                        this._calendar.nextMonth();
                        this._focusFocusedDay();
                    }}
                >
                    ›
                </button>
                <button
                    type="button"
                    aria-label="Année suivante"
                    @click=${() => {
                        this._calendar.nextYear();
                        this._focusFocusedDay();
                    }}
                >
                    »
                </button>
            </div>

            <table role="grid" aria-label=${monthLabel} part="grid">
                <thead>
                    <tr>
                        ${dayNames.map(
                            ({ abbr, full }) => html`<th abbr=${full} scope="col">${abbr}</th>`,
                        )}
                    </tr>
                </thead>
                <tbody>
                    ${weeks.map(
                        (week) => html`
                            <tr>
                                ${week.map((day) => this._renderDay(day, locale))}
                            </tr>
                        `,
                    )}
                </tbody>
            </table>

            <div part="footer">
                <button type="button" @click=${this._handleTodayClick}>Aujourd'hui</button>
                <button type="button" @click=${this._handleCloseClick}>Fermer</button>
            </div>
        `;
    }

    private _renderDay(day: Date, locale: string): TemplateResult {
        const focused = this._isSameDay(day, this._calendar.focusedDate);
        const selected = this._calendar.selectedDate
            ? this._isSameDay(day, this._calendar.selectedDate)
            : false;
        const today = this._calendar.isToday(day);
        const disabled = this._calendar.isDisabled(day);
        const otherMonth = !this._calendar.isSameMonth(day);

        const ariaLabel = new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(day);

        return html`
            <td role="gridcell">
                <button
                    type="button"
                    part="day"
                    tabindex=${focused ? '0' : '-1'}
                    aria-selected=${selected ? 'true' : 'false'}
                    aria-label=${ariaLabel}
                    aria-current=${today ? 'date' : nothing}
                    aria-disabled=${disabled ? 'true' : nothing}
                    class=${classMap({ 'other-month': otherMonth, today, selected, disabled })}
                    @click=${() => !disabled && this._selectDay(day)}
                >
                    ${day.getDate()}
                </button>
            </td>
        `;
    }

    private _getDayNames(locale: string): Array<{ abbr: string; full: string }> {
        const monday = new Date(2024, 0, 1);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return {
                abbr: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d),
                full: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d),
            };
        });
    }

    private _selectDay(day: Date): void {
        this._calendar.selectedDate = day;
        this._calendar.focusedDate = day;

        const isoValue = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        this.value = isoValue;

        const formatted = format(day, this.format);
        if (this._input) this._input.value = formatted;

        this._syncFormValue();
        this._emitChange();
        this.open = false;
    }

    private _handleTodayClick(): void {
        const today = new Date();
        if (!this._calendar.isDisabled(today)) {
            this._selectDay(today);
        }
    }

    private _handleCloseClick(): void {
        this.open = false;
        this._trigger?.focus();
    }

    private _isSameDay(a: Date, b: Date): boolean {
        return (
            a.getDate() === b.getDate() &&
            a.getMonth() === b.getMonth() &&
            a.getFullYear() === b.getFullYear()
        );
    }

    private _emitChange(_date?: Date | null, _valid?: boolean): void {
        /* Task 8 */
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
    private _handlePanelKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.open = false;
            this._trigger?.focus();
            return;
        }

        if (e.key === 'Tab') {
            this._handleTabInPanel(e);
            return;
        }

        if (this._isFocusInGrid()) {
            this._handleGridKeyDown(e);
        }
    }

    private _isFocusInGrid(): boolean {
        const grid = this.shadowRoot?.querySelector('[part="grid"]');
        const active = this.shadowRoot?.activeElement;
        return Boolean(grid?.contains(active ?? null));
    }

    private _handleTabInPanel(e: KeyboardEvent): void {
        const tabbable = Array.from(
            this._panel?.querySelectorAll<HTMLElement>(
                'button:not([disabled]):not([aria-disabled="true"]), [tabindex="0"]',
            ) ?? [],
        ).filter((el) => el.tabIndex >= 0);

        if (!tabbable.length) return;

        const active = this.shadowRoot?.activeElement;
        const first = tabbable[0];
        const last = tabbable[tabbable.length - 1];

        if (e.shiftKey && active === first) {
            e.preventDefault();
            this.open = false;
            this._trigger?.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            this.open = false;
            this._trigger?.focus();
        }
    }

    private _handleGridKeyDown(e: KeyboardEvent): void {
        let dayDelta = 0;

        switch (e.key) {
            case 'ArrowLeft':
                dayDelta = -1;
                break;
            case 'ArrowRight':
                dayDelta = 1;
                break;
            case 'ArrowUp':
                dayDelta = -7;
                break;
            case 'ArrowDown':
                dayDelta = 7;
                break;
            case 'Home': {
                const dow = this._calendar.focusedDate.getDay();
                dayDelta = -(dow === 0 ? 6 : dow - 1);
                break;
            }
            case 'End': {
                const dow = this._calendar.focusedDate.getDay();
                dayDelta = dow === 0 ? 0 : 7 - dow;
                break;
            }
            case 'PageUp':
                e.preventDefault();
                if (e.shiftKey) this._calendar.previousYear();
                else this._calendar.previousMonth();
                this._keepFocusedDayInView();
                return;
            case 'PageDown':
                e.preventDefault();
                if (e.shiftKey) this._calendar.nextYear();
                else this._calendar.nextMonth();
                this._keepFocusedDayInView();
                return;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (!this._calendar.isDisabled(this._calendar.focusedDate)) {
                    this._selectDay(this._calendar.focusedDate);
                }
                return;
            default:
                return;
        }

        e.preventDefault();

        const next = new Date(this._calendar.focusedDate);
        next.setDate(next.getDate() + dayDelta);

        if (
            next.getMonth() !== this._calendar.currentViewMonth.getMonth() ||
            next.getFullYear() !== this._calendar.currentViewMonth.getFullYear()
        ) {
            this._calendar.currentViewMonth = new Date(next.getFullYear(), next.getMonth(), 1);
        }

        this._calendar.focusedDate = next;
        this.requestUpdate();
        void this.updateComplete.then(() => this._focusFocusedDay());
    }

    private _keepFocusedDayInView(): void {
        const v = this._calendar.currentViewMonth;
        const day = Math.min(
            this._calendar.focusedDate.getDate(),
            new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate(),
        );
        this._calendar.focusedDate = new Date(v.getFullYear(), v.getMonth(), day);
        void this.updateComplete.then(() => this._focusFocusedDay());
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
