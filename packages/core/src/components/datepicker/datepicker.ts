import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { CalendarController, type CalendarControllerOptions } from './calendar.controller.js';
import { HasSlotController } from '../../controllers/has-slot.controller.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';
import { parse, format } from './date-parser.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import styles from './datepicker.styles.js';
import { warn } from '../../utils/warn.js';

/**
 * @summary Champ de saisie de date avec calendrier popover accessible.
 *
 * @slot label       - Contenu riche du label (remplace le prop `label`).
 * @slot after-label - Éléments après le label (bouton d'aide, tooltip…).
 * @slot hint        - Texte d'aide persistant (format attendu, plage min/max si définie). Lié
 *                     via aria-describedby. Un contenu personnalisé remplace entièrement le
 *                     texte par défaut, y compris la mention de la plage — à répéter manuellement
 *                     si nécessaire.
 * @slot error       - Message d'erreur. Déclenche has-error sur le host.
 * @slot today-label - Contenu riche du bouton « Aujourd'hui » (icône + texte, remplace le prop
 *                     `todayLabel`).
 * @slot close-label - Contenu riche du bouton « Fermer » (icône + texte, remplace le prop
 *                     `closeLabel`).
 *
 * @csspart input      - Le champ texte.
 * @csspart trigger    - Le bouton d'ouverture du calendrier.
 * @csspart panel      - Le popover flottant.
 * @csspart header     - En-tête du calendrier (navigation).
 * @csspart nav-btn    - Tous les boutons de navigation (ciblage groupé).
 * @csspart prev-year  - Bouton année précédente.
 * @csspart prev-month - Bouton mois précédent.
 * @csspart next-month - Bouton mois suivant.
 * @csspart next-year  - Bouton année suivante.
 * @csspart grid       - La grille calendrier.
 * @csspart weekday    - Les cellules d'en-tête de colonne (abréviations de jours).
 * @csspart label      - L'élément label.
 * @csspart hint       - Le texte d'aide sous l'input.
 * @csspart error      - Le message d'erreur sous l'input.
 * @csspart day        - Les boutons jours.
 * @csspart footer     - Pied du calendrier.
 * @csspart footer-btn - Tous les boutons du footer (ciblage groupé).
 * @csspart today-btn  - Bouton « Aujourd'hui ».
 * @csspart close-btn  - Bouton « Fermer ».
 *
 * @cssprop --ar-datepicker-gap - Espacement vertical entre le label, le champ et l'indice.
 * @cssprop --ar-datepicker-error-color - Couleur du message d'erreur.
 * @cssprop --ar-datepicker-panel-max-width - Largeur maximale du popover (valeur propre, non cascadée depuis --ar-panel-max-width ; repli `25rem` si aucun thème n'est chargé, évite que la grille de ~35 jours s'étale sur toute la largeur de la page).
 * @cssprop --ar-datepicker-distance - Espacement entre le trigger et le panel.
 * @cssprop --ar-datepicker-offset - Décalage latéral du panel.
 * @cssprop --ar-datepicker-nav-btn-border-color - Couleur de bordure des boutons nav.
 * @cssprop --ar-datepicker-footer-btn-border-color - Couleur de bordure des boutons footer.
 * @cssprop --ar-datepicker-day-size - Taille des cellules jour (repli `2.5rem` si aucun thème n'est chargé — cible tactile WCAG 2.5.8 Target Size Minimum, la grille utilisant border-collapse: collapse qui supprime l'espacement natif du <table>).
 * @cssprop --ar-datepicker-day-border-color - Couleur de bordure par défaut des cellules jour. Repli `transparent` si aucun thème n'est chargé (préserve l'absence de bordure voulue par défaut ; sans ce repli, une propriété longhand `border-color` isolée dégraderait vers `currentcolor`, une bordure non désirée sur chaque cellule).
 * @cssprop --ar-datepicker-day-other-month-color - Couleur des jours hors du mois affiché. Repli `GrayText` si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-day-today-bg - Fond du jour actuel.
 * @cssprop --ar-datepicker-day-today-color - Couleur texte du jour actuel.
 * @cssprop --ar-datepicker-day-today-border - Couleur de bordure du jour actuel. Repli `GrayText` si aucun thème n'est chargé (garde une distinction visible du reste de la grille).
 * @cssprop --ar-datepicker-day-hover-bg - Fond au survol d'un jour. Repli `ButtonFace` si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-day-hover-color - Couleur texte au survol d'un jour. Repli `ButtonText` si aucun thème n'est chargé (pairé avec le repli de --ar-datepicker-day-hover-bg pour garantir le contraste).
 * @cssprop --ar-datepicker-day-focus-ring-color - Couleur du focus ring des jours. Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 * @cssprop --ar-datepicker-day-focus-ring-width - Épaisseur du focus ring des jours.
 * @cssprop --ar-datepicker-day-focus-ring-offset - Décalage du focus ring des jours.
 * @cssprop --ar-datepicker-day-selected-bg - Fond du jour sélectionné. Repli `Highlight` si aucun thème n'est chargé (sinon indiscernable des jours non sélectionnés).
 * @cssprop --ar-datepicker-day-selected-color - Couleur texte du jour sélectionné. Repli `HighlightText` si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-input-error-border-color - Bordure input en état d'erreur.
 * @cssprop --ar-datepicker-nav-btn-focus-ring-color - Couleur de l'anneau de focus des boutons de navigation (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 * @cssprop --ar-datepicker-footer-btn-focus-ring-color - Couleur de l'anneau de focus des boutons du footer (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 * @cssprop --ar-panel-bg - Couleur de bordure de la cellule jour focusée dans la grille (contraste avec l'anneau de focus). Le popover pilote son fond réel via ce token (panelStyles) ; référencer --ar-color-bg directement casserait ce cutout pour un consommateur ne surchargeant que --ar-panel-bg.
 *
 * @event {CustomEvent} ar-datepicker-input-change   - Valeur commitée (blur ou sélection calendrier).
 * @event {CustomEvent} ar-datepicker-input-complete - Saisie texte complète (valide ou non).
 * @event {CustomEvent} ar-datepicker-show           - Avant ouverture du popover. @cancelable
 * @event {CustomEvent} ar-datepicker-shown          - Après ouverture.
 * @event {CustomEvent} ar-datepicker-hide           - Avant fermeture. @cancelable
 * @event {CustomEvent} ar-datepicker-hidden         - Après fermeture.
 */
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
    private _dayNamesCache = new Map<string, Array<{ abbr: string; full: string }>>();
    private _formatterCache = new Map<string, Intl.DateTimeFormat>();

    private readonly _anchored = new AnchoredController(this, {
        popupMode: 'dialog',
        placement: 'bottom-start',
        cssVarPrefix: 'datepicker',
        onExternalClose: () => {
            this.open = false;
            if (!document.activeElement || document.activeElement === document.body) {
                this._trigger?.focus();
            }
        },
    });

    /** Valeur ISO `yyyy-MM-dd` de la date sélectionnée. */
    @property({ reflect: true }) value = '';
    /** Format de saisie/affichage (tokens `dd`, `MM`, `yyyy`). Défaut : `dd/MM/yyyy`. */
    @property() format = 'dd/MM/yyyy';
    /** Locale BCP 47 pour les noms de jours et mois. Défaut : `navigator.language`. */
    @property() locale = '';
    /** Date minimale sélectionnable (ISO `yyyy-MM-dd`). */
    @property() min = '';
    /** Date maximale sélectionnable (ISO `yyyy-MM-dd`). */
    @property() max = '';
    /** Callback de désactivation arbitraire — retourne `true` pour désactiver un jour. */
    @property({ attribute: false }) isDateDisabled?: (date: Date) => boolean;
    /** Texte placeholder de l'input. */
    @property() placeholder = '';
    /** Valeur `autocomplete` de l'input natif. */
    @property() autocomplete = '';
    /** Label du champ (alternative au slot `label`). */
    @property() label = '';
    /** Libellé du bouton « Aujourd'hui » (alternative au slot `today-label`). */
    @property({ attribute: 'today-label' }) todayLabel = "Aujourd'hui";
    /** Libellé du bouton « Fermer » (alternative au slot `close-label`). */
    @property({ attribute: 'close-label' }) closeLabel = 'Fermer';
    /** Désactive le champ et exclut sa valeur du formulaire. */
    @property({ reflect: true, type: Boolean }) disabled = false;
    /** Bloque la saisie tout en soumettant la valeur au formulaire. */
    @property({ reflect: true, type: Boolean }) readonly = false;
    /** Active la contrainte de validation native `required`. */
    @property({ reflect: true, type: Boolean }) required = false;
    /** Identifie le champ dans `FormData`. */
    @property() name = '';
    /** Ouvre ou ferme le popover calendrier. */
    @property({ reflect: true, type: Boolean }) open = false;

    /** Ignore le prochain `updated()` open/close quand un event annulé re-set `open`. */
    private _skipNextOpenChange = false;
    /** Élément à focus une fois la fermeture confirmée (non annulée par ar-datepicker-hide). */
    private _focusTargetAfterHide: HTMLElement | null = null;

    @query('[part="input"]') private _input!: HTMLInputElement;
    @query('[part="panel"]') private _panel!: HTMLElement;
    @query('[part="trigger"]') private _trigger!: HTMLButtonElement;
    @query('.input-wrapper') private _inputWrapper!: HTMLDivElement;

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
        this._anchored.attach(this._trigger, this._panel, this._inputWrapper);
        this._syncFormValue();
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('min') || changed.has('max') || changed.has('isDateDisabled')) {
            const opts: CalendarControllerOptions = { min: this.min, max: this.max };
            if (this.isDateDisabled !== undefined) opts.isDateDisabled = this.isDateDisabled;
            this._calendar.update(opts);
        }

        this.toggleAttribute('has-error', this._hasSlot.test('error'));

        if (changed.has('open')) {
            if (this._skipNextOpenChange) {
                this._skipNextOpenChange = false;
            } else {
                // Différé après la fin du cycle courant : _show()/_hide() déclenchent
                // AnchoredController.show()/hide(), qui appelle host.requestUpdate() — un appel
                // synchrone ici déclencherait l'avertissement dev Lit "change-in-update".
                void this.updateComplete.then(() => {
                    if (this.open) {
                        void this._show().catch((e: unknown) => {
                            warn('ar-datepicker', String(e));
                        });
                    } else {
                        this._hide();
                    }
                });
            }
        }

        if (changed.has('value') || changed.has('format')) {
            this._syncInputFromValue();
        }

        if (changed.has('value') || changed.has('required') || changed.has('disabled')) {
            this._syncFormValue();
        }
    }

    override render(): TemplateResult {
        const locale = this.locale || navigator.language;
        const exampleDate = new Date(new Date().getFullYear(), 11, 31);
        const formatLine = `Format attendu : ${this.format} (ex. ${format(exampleDate, this.format)})`;
        const rangeText = this._rangeText(locale);
        const defaultHint = rangeText
            ? html`${formatLine}<br />
                  Dates disponibles : ${rangeText}`
            : formatLine;

        return html`
            <label part="label" id="dp-label-${this._uid}" for="dp-input-${this._uid}">
                <slot name="label">${this.label}</slot>
            </label>
            <slot name="after-label"></slot>

            <div class="input-wrapper">
                <input
                    part="input"
                    id="dp-input-${this._uid}"
                    type="text"
                    ?disabled=${this.disabled}
                    ?readonly=${this.readonly}
                    aria-required=${this.required ? 'true' : nothing}
                    autocomplete=${this.autocomplete || nothing}
                    placeholder=${this.placeholder || nothing}
                    aria-labelledby="dp-label-${this._uid}"
                    aria-describedby=${`dp-hint-${this._uid}${this._hasSlot.test('error') ? ` dp-error-${this._uid}` : ''}`}
                    @input=${this._handleInput}
                    @blur=${this._handleBlur}
                />
                <button
                    part="trigger"
                    type="button"
                    ?disabled=${this.disabled || this.readonly}
                    aria-label="Ouvrir le calendrier"
                    aria-haspopup="dialog"
                    aria-expanded=${this.open}
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

            <p part="hint" id="dp-hint-${this._uid}">
                <slot name="hint">${defaultHint}</slot>
            </p>
            <p
                part="error"
                id="dp-error-${this._uid}"
                role=${this._hasSlot.test('error') ? 'alert' : nothing}
            >
                <slot name="error"></slot>
            </p>

            <div
                part="panel"
                popover="auto"
                role="dialog"
                aria-modal="true"
                aria-label="Sélectionner une date"
                aria-labelledby=${this.open ? `dp-month-${this._uid}` : nothing}
                id="ar-dp-panel-${this._uid}"
                @keydown=${this._handlePanelKeyDown}
            >
                ${this.open ? this._renderCalendar(locale) : nothing}
            </div>
        `;
    }

    private _renderCalendar(locale: string): TemplateResult {
        const viewDate = this._calendar.currentViewMonth;
        const monthLabel = this._getFormatter(locale, 'month-year', {
            month: 'long',
            year: 'numeric',
        }).format(viewDate);

        const dayNames = this._getDayNames(locale);
        const weeks = this._calendar.getGridWeeks();
        const dayLabelFormat = this._getFormatter(locale, 'day-month-year', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

        return html`
            <div part="header">
                <button
                    part="nav-btn prev-year"
                    type="button"
                    aria-label="Année précédente"
                    @click=${() => this._nav(() => this._calendar.previousYear())}
                >
                    «
                </button>
                <button
                    part="nav-btn prev-month"
                    type="button"
                    aria-label="Mois précédent"
                    @click=${() => this._nav(() => this._calendar.previousMonth())}
                >
                    ‹
                </button>
                <span id="dp-month-${this._uid}" aria-live="polite">${monthLabel}</span>
                <button
                    part="nav-btn next-month"
                    type="button"
                    aria-label="Mois suivant"
                    @click=${() => this._nav(() => this._calendar.nextMonth())}
                >
                    ›
                </button>
                <button
                    part="nav-btn next-year"
                    type="button"
                    aria-label="Année suivante"
                    @click=${() => this._nav(() => this._calendar.nextYear())}
                >
                    »
                </button>
            </div>

            <table role="grid" aria-label=${monthLabel} part="grid">
                <thead>
                    <tr>
                        ${dayNames.map(
                            ({ abbr, full }) =>
                                html`<th part="weekday" aria-label=${full} scope="col">
                                    ${abbr}
                                </th>`,
                        )}
                    </tr>
                </thead>
                <tbody>
                    ${weeks.map(
                        (week) => html`
                            <tr>
                                ${week.map((day) => this._renderDay(day, dayLabelFormat))}
                            </tr>
                        `,
                    )}
                </tbody>
            </table>

            <div part="footer">
                <button
                    part="footer-btn today-btn"
                    type="button"
                    aria-label=${this.todayLabel}
                    @click=${this._handleTodayClick}
                >
                    <slot name="today-label">${this.todayLabel}</slot>
                </button>
                <button
                    part="footer-btn close-btn"
                    type="button"
                    aria-label=${this.closeLabel}
                    @click=${this._handleCloseClick}
                >
                    <slot name="close-label">${this.closeLabel}</slot>
                </button>
            </div>
        `;
    }

    private _renderDay(day: Date, dayLabelFormat: Intl.DateTimeFormat): TemplateResult {
        const focused = this._calendar.isSameDay(day, this._calendar.focusedDate);
        const selected = this._calendar.selectedDate
            ? this._calendar.isSameDay(day, this._calendar.selectedDate)
            : false;
        const today = this._calendar.isToday(day);
        const disabled = this._calendar.isDisabled(day);
        const otherMonth = !this._calendar.isSameMonth(day);

        const ariaLabel = selected
            ? `${dayLabelFormat.format(day)}, sélectionné`
            : dayLabelFormat.format(day);

        const classes = [
            otherMonth && 'other-month',
            today && 'today',
            selected && 'selected',
            disabled && 'disabled',
        ]
            .filter(Boolean)
            .join(' ');

        return html`
            <td role="gridcell" aria-selected=${selected ? 'true' : 'false'}>
                <button
                    type="button"
                    part="day"
                    tabindex=${focused ? '0' : '-1'}
                    aria-label=${ariaLabel}
                    aria-current=${today ? 'date' : nothing}
                    aria-disabled=${disabled ? 'true' : nothing}
                    class=${classes || nothing}
                    @click=${() => !disabled && this._selectDay(day)}
                >
                    ${day.getDate()}
                </button>
            </td>
        `;
    }

    private _getDayNames(locale: string): Array<{ abbr: string; full: string }> {
        const cached = this._dayNamesCache.get(locale);
        if (cached) return cached;

        const monday = new Date(2024, 0, 1);
        const shortFormat = new Intl.DateTimeFormat(locale, { weekday: 'short' });
        const longFormat = new Intl.DateTimeFormat(locale, { weekday: 'long' });
        const result = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return {
                abbr: shortFormat.format(d),
                full: longFormat.format(d),
            };
        });
        this._dayNamesCache.set(locale, result);
        return result;
    }

    private _selectDay(day: Date): void {
        this._calendar.selectedDate = day;
        this._calendar.focusedDate = day;

        this.value = this._toIso(day);

        const formatted = format(day, this.format);
        if (this._input) this._input.value = formatted;

        this._emitChange();
        this._focusTargetAfterHide = this._input ?? null;
        this.open = false;
    }

    private _handleTodayClick(): void {
        const today = new Date();
        if (!this._calendar.isDisabled(today)) {
            this._selectDay(today);
        }
    }

    private _handleCloseClick(): void {
        this._focusTargetAfterHide = this._trigger ?? null;
        this.open = false;
    }

    private _emitChange(date?: Date | null, valid?: boolean): void {
        const emitDate = date ?? (this.value ? parse(this.value, 'yyyy-MM-dd').date : null);
        const emitValid = valid ?? emitDate !== null;
        const emitValue = emitDate ? this._toIso(emitDate) : null;

        this.dispatchEvent(
            new CustomEvent('ar-datepicker-input-change', {
                bubbles: true,
                composed: true,
                detail: {
                    value: emitValue,
                    valueAsDate: emitDate,
                    valid: emitValid,
                },
            }),
        );
    }

    private _toIso(date: Date): string {
        return format(date, 'yyyy-MM-dd');
    }

    private _rangeText(locale: string): string {
        const minDate = this.min ? parse(this.min, 'yyyy-MM-dd').date : null;
        const maxDate = this.max ? parse(this.max, 'yyyy-MM-dd').date : null;
        if (!minDate && !maxDate) return '';

        if (minDate && maxDate) {
            return `entre le ${this._formatOrdinalDate(minDate, locale)} et le ${this._formatOrdinalDate(maxDate, locale)}`;
        }
        if (minDate) return `à partir du ${this._formatOrdinalDate(minDate, locale)}`;
        return `jusqu'au ${this._formatOrdinalDate(maxDate as Date, locale)}`;
    }

    /** Formate une date longue en respectant l'ordinal du 1er du mois en français ("1er janvier 2026"). */
    private _formatOrdinalDate(date: Date, locale: string): string {
        if (locale.toLowerCase().startsWith('fr') && date.getDate() === 1) {
            const monthYear = this._getFormatter(locale, 'month-year', {
                month: 'long',
                year: 'numeric',
            }).format(date);
            return `1er ${monthYear}`;
        }
        return this._getFormatter(locale, 'day-month-year', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date);
    }

    /** Cache des Intl.DateTimeFormat par locale — évite de reconstruire un formatter à chaque render. */
    private _getFormatter(
        locale: string,
        key: string,
        options: Intl.DateTimeFormatOptions,
    ): Intl.DateTimeFormat {
        const cacheKey = `${locale}|${key}`;
        let formatter = this._formatterCache.get(cacheKey);
        if (!formatter) {
            formatter = new Intl.DateTimeFormat(locale, options);
            this._formatterCache.set(cacheKey, formatter);
        }
        return formatter;
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
            this._skipNextOpenChange = true;
            this.open = false;
            return;
        }

        if (this.value) {
            const result = parse(this.value, 'yyyy-MM-dd');
            if (result.valid && result.date) {
                const previousSelected = this._calendar.selectedDate;
                this._calendar.selectedDate = result.date;
                // Ne naviguer vers la date que si la valeur a changé depuis le dernier open —
                // préserve la position de navigation entre les ouvertures successives.
                if (!previousSelected || !this._calendar.isSameDay(previousSelected, result.date)) {
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
            }
        } else {
            this._calendar.selectedDate = null;
            // currentViewMonth et focusedDate conservés — mémorisent la navigation entre les ouvertures
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
            this._skipNextOpenChange = true;
            this.open = true;
            this._focusTargetAfterHide = null;
            return;
        }

        this._anchored.hide();
        this._focusTargetAfterHide?.focus();
        this._focusTargetAfterHide = null;

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
    private _handleInput(e: Event): void {
        const input = e.target as HTMLInputElement;
        const result = parse(input.value, this.format);

        if (result.complete) {
            this.dispatchEvent(
                new CustomEvent('ar-datepicker-input-complete', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        value: result.valid && result.date ? this._toIso(result.date) : null,
                        valueAsDate: result.date,
                        valid: result.valid,
                    },
                }),
            );

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
                this.requestUpdate();
            }
        }
    }

    private _handleBlur(): void {
        const raw = this._input?.value ?? '';
        const result = parse(raw, this.format);

        const isoValue = result.valid && result.date ? this._toIso(result.date) : null;
        this.value = isoValue ?? '';

        this._emitChange(result.date, result.valid);
    }
    private _handlePanelKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            e.preventDefault();
            this._focusTargetAfterHide = this._trigger ?? null;
            this.open = false;
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
            this._focusTargetAfterHide = this._trigger ?? null;
            this.open = false;
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            this._focusTargetAfterHide = this._trigger ?? null;
            this.open = false;
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
                this._keepFocusedDayInView(true);
                return;
            case 'PageDown':
                e.preventDefault();
                if (e.shiftKey) this._calendar.nextYear();
                else this._calendar.nextMonth();
                this._keepFocusedDayInView(true);
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

    /** Exécute une action de navigation du calendrier (clic souris) et garde le curseur dans le mois affiché. */
    private _nav(action: () => void): void {
        action();
        this._keepFocusedDayInView();
    }

    private _keepFocusedDayInView(moveFocus = false): void {
        const v = this._calendar.currentViewMonth;
        const day = Math.min(
            this._calendar.focusedDate.getDate(),
            new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate(),
        );
        this._calendar.focusedDate = new Date(v.getFullYear(), v.getMonth(), day);
        if (moveFocus) {
            void this.updateComplete.then(() => this._focusFocusedDay());
        }
    }
    private _syncInputFromValue(): void {
        if (!this._input) return;
        if (!this.value) {
            this._input.value = '';
            return;
        }
        const isoResult = parse(this.value, 'yyyy-MM-dd');
        if (isoResult.valid && isoResult.date) {
            this._input.value = format(isoResult.date, this.format);
        }
    }
    private _syncFormValue(): void {
        if (this.disabled) {
            this._internals?.setFormValue(null);
            this._internals?.setValidity({});
            return;
        }
        this._internals?.setFormValue(this.value || null, this.value || null);
        if (this.required && !this.value) {
            const anchor = this._input ?? undefined;
            this._internals?.setValidity(
                { valueMissing: true },
                'Veuillez sélectionner une date.',
                anchor,
            );
        } else {
            this._internals?.setValidity({});
        }
    }
}
