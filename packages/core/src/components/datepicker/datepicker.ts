import { html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { CalendarController, type CalendarControllerOptions } from './calendar.controller.js';
import { HasSlotController } from '../../controllers/has-slot.controller.js';
import { AnchoredController } from '../../controllers/anchored.controller.js';
import { LocalizeController } from '../../controllers/localize.controller.js';
import { ArianeFormElement } from '../../base/ariane-form-element.js';
import { parse, format } from './date-parser.js';
import panelStyles from '../../styles/shared/panel.styles.js';
import styles from './datepicker.styles.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import { warn } from '../../utils/warn.js';
import { emitEvent, type ArEventDetail } from '../../utils/emit-event.js';

/** Détail de l'événement `ar-datepicker-view-change` */
export interface ArDatepickerViewChangeDetail extends ArEventDetail {
    /** Année du mois affiché */
    year: number;
    /** Mois affiché, de 1 (janvier) à 12 (décembre) */
    month: number;
}

/** Détail des événements `ar-datepicker-input-change` et `ar-datepicker-input-complete` */
export interface ArDatepickerInputDetail extends ArEventDetail {
    /** Date saisie au format ISO `yyyy-MM-dd`, `null` si absente ou invalide */
    value: string | null;
    /** Date saisie, `null` si absente ou invalide */
    valueAsDate: Date | null;
    /** `false` si la saisie n'est pas une date valide */
    valid: boolean;
}

/**
 * @summary Affiche un champ de saisie de date synchronisé avec un calendrier popover, pour combiner saisie libre au clavier et sélection visuelle.
 * @display demo
 * @localized
 *
 * @slot label       - Contenu riche du label (remplace le prop `label`).
 * @slot after-label - Éléments après le label (bouton d'aide, tooltip…).
 * @slot hint        - Texte d'aide persistant (format attendu, plage min/max si définie). Lié
 *                     via aria-describedby. Un contenu personnalisé remplace entièrement le
 *                     texte par défaut, y compris la mention de la plage — à répéter manuellement
 *                     si nécessaire.
 * @slot error       - Message d'erreur. Déclenche has-error sur le host.
 * @slot today-label - Contenu riche du bouton « Aujourd'hui » (icône + texte, remplace le texte
 *                     traduit par défaut).
 * @slot close-label - Contenu riche du bouton « Fermer » (icône + texte, remplace le texte
 *                     traduit par défaut).
 *
 * @csspart datepicker - Racine du composant.
 * @csspart input      - Le champ texte.
 * @csspart field      - Porté par `input` : élément qui reçoit une saisie. Sous-rôle standard de
 *   `field` (avec `select`, cf. ar-pagination), réutilisable par tout futur composant avec un
 *   champ texte.
 * @csspart trigger    - Le bouton d'ouverture du calendrier.
 * @csspart panel      - Le popover flottant.
 * @csspart header     - En-tête du calendrier (navigation).
 * @csspart nav-button    - Tous les boutons de navigation (ciblage groupé).
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
 * @csspart control - Porté par `day` : élément interactif générique.
 * @csspart footer     - Pied du calendrier.
 * @csspart footer-button - Tous les boutons du footer (ciblage groupé).
 * @csspart today-button  - Bouton « Aujourd'hui ».
 * @csspart close-button  - Bouton « Fermer ».
 * @csspart action-button - Porté par les 4 boutons de navigation (`nav-button`) et les 2 boutons
 *   du footer (`footer-button`) : bouton qui déclenche une action ponctuelle.
 *
 * @cssprop --ar-datepicker-error-color - Couleur du message d'erreur.
 * @cssprop --ar-datepicker-input-max-width - Largeur maximale du champ de saisie. Par défaut,
 *   une valeur calculée à partir de la longueur de `format`.
 * @cssprop --ar-datepicker-panel-max-width - Largeur maximale du popover (valeur propre, non cascadée depuis --ar-panel-max-width ; repli `25rem` si aucun thème n'est chargé, évite que la grille de ~35 jours s'étale sur toute la largeur de la page).
 * @cssprop --ar-datepicker-distance - Espacement entre le trigger et le panel.
 * @cssprop --ar-datepicker-offset - Décalage latéral du panel.
 * @cssprop --ar-datepicker-nav-button-border-color - Couleur de bordure des boutons nav.
 * @cssprop --ar-datepicker-footer-button-border-color - Couleur de bordure des boutons footer.
 * @cssprop --ar-datepicker-day-size - Taille des cellules jour (repli `2.5rem` si aucun thème n'est chargé — cible tactile WCAG 2.5.8 Target Size Minimum, la grille utilisant border-collapse: collapse qui supprime l'espacement natif du <table>).
 * @cssprop --ar-datepicker-day-border-color - Couleur de bordure par défaut des cellules jour. Repli `transparent` si aucun thème n'est chargé (aucune bordure par défaut).
 * @cssprop --ar-datepicker-day-color - Couleur du texte des cellules jour (cascade vers --ar-color-text).
 * @cssprop --ar-datepicker-day-bg - Fond des cellules jour.
 * @cssprop --ar-datepicker-day-other-month-color - Couleur des jours hors du mois affiché. Repli `GrayText` si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-day-today-bg - Fond du jour actuel.
 * @cssprop --ar-datepicker-day-today-color - Couleur texte du jour actuel.
 * @cssprop --ar-datepicker-day-today-border - Couleur de bordure du jour actuel. Repli `GrayText` si aucun thème n'est chargé (garde une distinction visible du reste de la grille).
 * @cssprop --ar-datepicker-day-hover-bg - Fond au survol d'un jour. Repli `ButtonFace` si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-day-hover-color - Couleur texte au survol d'un jour. Repli `ButtonText` si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-day-focus-ring-color - Couleur du focus ring des jours. Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 * @cssprop --ar-datepicker-day-focus-ring-width - Épaisseur du focus ring des jours.
 * @cssprop --ar-datepicker-day-focus-ring-offset - Décalage du focus ring des jours.
 * @cssprop --ar-datepicker-day-focus-border-color - Couleur de bordure de la cellule jour en focus (roving tabindex). Purement cosmétique : l'indicateur de focus WCAG 2.4.7 est garanti indépendamment par --ar-datepicker-day-focus-ring-color/-width/-offset. Repli transparent si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-day-selected-bg - Fond du jour sélectionné. Repli `Highlight` si aucun thème n'est chargé (sinon indiscernable des jours non sélectionnés).
 * @cssprop --ar-datepicker-day-selected-color - Couleur texte du jour sélectionné. Repli `HighlightText` si aucun thème n'est chargé.
 * @cssprop --ar-datepicker-input-error-border-color - Bordure input en état d'erreur.
 * @cssprop --ar-datepicker-nav-button-focus-ring-color - Couleur de l'anneau de focus des boutons de navigation (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 * @cssprop --ar-datepicker-footer-button-focus-ring-color - Couleur de l'anneau de focus des boutons du footer (cascade vers --ar-focus-ring-color). Repli `ButtonText` si aucun thème n'est chargé (WCAG 2.4.7).
 * @cssprop --ar-panel-bg - Fond du panel partagé. Repli système `Canvas` si aucun thème n'est chargé.
 * @cssprop --ar-panel-text - Couleur du texte du panel partagé. Repli système `CanvasText` si aucun thème n'est chargé.
 * @cssprop --ar-panel-border-color - Couleur de bordure du panel partagé. Repli système `ButtonBorder` si aucun thème n'est chargé.
 * @cssprop --ar-panel-radius - Rayon de bordure du panel partagé.
 * @cssprop --ar-panel-shadow - Ombre portée du panel partagé.
 * @cssprop --ar-panel-padding - Espacement interne du panel partagé.
 * @cssprop --ar-panel-min-width - Largeur minimale du panel partagé.
 * @cssprop --ar-panel-max-width - Largeur maximale du panel partagé.
 * @cssprop --ar-panel-show-duration - Durée de l'animation d'ouverture du panel partagé (respecte `prefers-reduced-motion`).
 *
 * @cssState open      - Le calendrier est ouvert.
 * @cssState disabled  - Le composant est désactivé.
 * @cssState readonly  - Le composant est en lecture seule.
 * @cssState has-error - Un message d'erreur est affiché (slot `error`).
 * @cssState pending   - L'application a posé l'attribut `pending` : une réponse est attendue.
 *
 * @event {CustomEvent<{ id: string | undefined, value: string | null, valueAsDate: Date | null, valid: boolean }>} ar-datepicker-input-change   - Valeur commitée (blur ou sélection calendrier).
 * @event {CustomEvent<{ id: string | undefined, value: string | null, valueAsDate: Date | null, valid: boolean }>} ar-datepicker-input-complete - Saisie texte complète (valide ou non).
 * @event {Event} input  - Natif, sur l'hôte, une fois `value` mise à jour par l'utilisateur (sélection calendrier ou validation de la saisie).
 * @event {Event} change - Natif, juste après `input`.
 * @event {CustomEvent<{ id: string | undefined }>} ar-datepicker-show           - Avant ouverture du popover. @cancelable
 * @event {CustomEvent<{ id: string | undefined }>} ar-datepicker-shown          - Après ouverture.
 * @event {CustomEvent<{ id: string | undefined }>} ar-datepicker-hide           - Avant fermeture. @cancelable
 * @event {CustomEvent<{ id: string | undefined }>} ar-datepicker-hidden         - Après fermeture.
 * @event {CustomEvent<{ id: string | undefined, year: number, month: number }>} ar-datepicker-view-change - Le mois affiché change (navigation) ou le calendrier s'ouvre ; `month` va de 1 à 12.
 *
 * @tagname ar-datepicker
 */
export class ArDatepicker extends ArianeFormElement {
    static override styles = [panelStyles, styles];
    // formAssociated = true est hérité de ArianeFormElement — pas besoin de le redéclarer ici.

    private readonly _uid = Math.random().toString(36).slice(2, 9);

    /** Valeur au premier rendu : celle que `form.reset()` restaure. */
    private _defaultValue = '';

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

    private readonly localize = new LocalizeController(this);

    /** Valeur ISO `yyyy-MM-dd` de la date sélectionnée. */
    @property({ reflect: true, useDefault: true }) value = '';
    /** Format de saisie/affichage (tokens `dd`, `MM`, `yyyy`). Défaut : `dd/MM/yyyy`. */
    @property({ reflect: true, useDefault: true }) format = 'dd/MM/yyyy';
    /** Date minimale sélectionnable (ISO `yyyy-MM-dd`). */
    @property({ reflect: true, useDefault: true }) min = '';
    /** Date maximale sélectionnable (ISO `yyyy-MM-dd`). */
    @property({ reflect: true, useDefault: true }) max = '';
    /** Callback de désactivation arbitraire — retourne `true` pour désactiver un jour. */
    @property({ attribute: false }) isDateDisabled?: (date: Date) => boolean;
    /** Texte placeholder de l'input. */
    @property({ reflect: true, useDefault: true }) placeholder = '';
    /** Valeur `autocomplete` de l'input natif. */
    @property({ reflect: true, useDefault: true }) autocomplete = '';
    /** Label du champ (alternative au slot `label`). */
    @property({ reflect: true, useDefault: true }) label = '';
    /** Bloque la saisie tout en soumettant la valeur au formulaire. */
    @property({ reflect: true, type: Boolean }) readonly = false;
    /** Ouvre ou ferme le popover calendrier. */
    @property({ reflect: true, type: Boolean }) open = false;
    /**
     * Attente d'une réponse, pilotée par l'application (par exemple les jours désactivés du mois
     * affiché, à charger après `ar-datepicker-view-change`). Le composant ne le pose ni ne le
     * retire jamais. Non bloquant : le calendrier reste utilisable. Pose `aria-busy="true"` sur le
     * panneau, l'état `:state(pending)` et annonce l'attente au passage `false → true`.
     */
    @property({ reflect: true, type: Boolean }) pending = false;

    /** Ignore le prochain `updated()` open/close quand un event annulé re-set `open`. */
    private _skipNextOpenChange = false;
    /** Élément à focus une fois la fermeture confirmée (non annulée par ar-datepicker-hide). */
    private _focusTargetAfterHide: HTMLElement | null = null;
    /** Dernier mois annoncé par `ar-datepicker-view-change` (année × 12 + mois), pendant l'ouverture. */
    private _emittedViewKey = -1;

    @query('[part~="input"]') private _input!: HTMLInputElement;
    @query('[part="panel"]') private _panel!: HTMLElement;
    @query('[part="trigger"]') private _trigger!: HTMLButtonElement;
    @query('.input-wrapper') private _inputWrapper!: HTMLDivElement;

    get inputElement(): HTMLInputElement {
        return this._input;
    }

    /** Retour à la valeur initiale : valeur, texte de saisie, sélection du calendrier, panneau. */
    protected override formReset(): void {
        // Avant le premier rendu, `_defaultValue` n'est pas encore capturé : la valeur courante EST
        // la valeur initiale, et la restaurer à '' la perdrait.
        if (!this.hasUpdated) return;
        const date = this._defaultValue ? parse(this._defaultValue, 'yyyy-MM-dd').date : null;
        this._calendar.selectedDate = date;
        if (date) {
            this._calendar.currentViewMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            this._calendar.focusedDate = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
            );
        }
        this.value = this._defaultValue;
        this._syncInputFromValue();
        this.open = false;
        this.requestUpdate();
    }

    override firstUpdated(): void {
        this._anchored.attach(this._trigger, this._panel, this._inputWrapper);
        this._defaultValue = this.value;
        this._syncFormValue();
    }

    // Avant le rendu : les options du calendrier doivent être à jour pour ce rendu-ci, sinon la
    // grille ouverte garde les anciens jours désactivés jusqu'à la prochaine ouverture.
    override willUpdate(changed: PropertyValues<this>): void {
        if (changed.has('min') || changed.has('max') || changed.has('isDateDisabled')) {
            const opts: CalendarControllerOptions = { min: this.min, max: this.max };
            if (this.isDateDisabled !== undefined) opts.isDateDisabled = this.isDateDisabled;
            this._calendar.update(opts);
        }
    }

    override updated(changed: PropertyValues<this>): void {
        const hasError = this._hasSlot.test('error');
        this.toggleAttribute('has-error', hasError);
        this.toggleState('has-error', hasError);

        // `open` initial à false : pas de transition, donc ni hide ni hidden au montage.
        if (changed.has('open') && (this.open || changed.get('open') !== undefined)) {
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

        if (changed.has('pending')) {
            this.toggleState('pending', this.pending);
            // `get` indéfini au montage : pas d'annonce pour un `pending` posé dès le départ.
            if (this.pending && changed.get('pending') !== undefined) {
                announceA11y(this.localize.term('datepickerPending'), 'polite');
            }
        }

        this._emitViewChangeOnNavigation();

        if (changed.has('value') || changed.has('format')) {
            this._syncInputFromValue();
        }

        if (
            changed.has('value') ||
            changed.has('min') ||
            changed.has('max') ||
            changed.has('required') ||
            changed.has('disabled') ||
            (changed as Map<PropertyKey, unknown>).has('_formDisabled') ||
            // Le message de validité est localisé : un changement de lang (mise à jour sans
            // propriété modifiée) doit le recalculer tant que le champ est obligatoire et vide.
            (this.required && !this.value)
        ) {
            this._syncFormValue();
        }

        // États :state() cumulés aux attributs/propriétés reflétés existants (pilote #246) —
        // n'introduisent rien de nouveau côté API publique, juste une surface CSS
        // supplémentaire pour le thème (::part(x):state(y)), cohérente avec le pattern
        // WebAwesome. `disabled` reflète l'état effectif (cascade fieldset incluse), comme le
        // ferait :disabled natif sur un <input>.
        if (
            changed.has('disabled') ||
            (changed as Map<PropertyKey, unknown>).has('_formDisabled')
        ) {
            this.toggleState('disabled', this.effectiveDisabled);
        }
        if (changed.has('readonly')) {
            this.toggleState('readonly', this.readonly);
        }
        if (changed.has('open')) {
            this.toggleState('open', this.open);
        }
    }

    override render(): TemplateResult {
        // Une seule source de vérité pour la langue : this.localize.lang() (this.lang ||
        // <html lang> || navigator.language). Pas de prop locale séparée — un Intl.DateTimeFormat
        // dont la locale diverge de la langue des libellés produirait un composant à moitié
        // traduit (ex. boutons en français, noms de mois en anglais). Un consommateur voulant un
        // format de date régional différent sans changer la langue affichée peut poser un lang
        // avec région (ex. lang="en-GB") : Intl.DateTimeFormat le respecte nativement, et
        // LocalizeController retombe sur la traduction de base (en) si aucune variante
        // régionale n'est enregistrée.
        const locale = this.localize.lang();
        const todayLabel = this.localize.term('today');
        const closeLabel = this.localize.term('close');
        const closeAriaLabel = this.localize.term('closeCalendar');
        const exampleDate = new Date(new Date().getFullYear(), 11, 31);
        const formattedExample = format(exampleDate, this.format);
        const formatLine = this.localize.term('expectedFormat', this.format, formattedExample);
        const rangeText = this._rangeText(locale);
        const defaultHint = rangeText
            ? html`${formatLine}<br />
                  ${this.localize.term('availableDates', rangeText)}`
            : formatLine;
        // Largeur fonctionnelle par défaut de l'input, dérivée de la longueur de la date
        // formatée (+ marge pour curseur/padding) — indépendante de la largeur du hint, qui peut
        // rester plus large sans agrandir l'input (cf. #191). Surchargeable via
        // --ar-datepicker-input-max-width.
        const inputComputedMaxWidth = `${formattedExample.length + 2}ch`;

        return html`
            <div part="datepicker">
                <label part="label" id="dp-label-${this._uid}" for="dp-input-${this._uid}">
                    <slot name="label">${this.label}</slot>
                </label>
                <slot name="after-label"></slot>

                <div class="input-wrapper">
                    <input
                        part="input field"
                        id="dp-input-${this._uid}"
                        type="text"
                        style=${styleMap({ '--input-computed-width': inputComputedMaxWidth })}
                        ?disabled=${this.effectiveDisabled}
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
                        ?disabled=${this.effectiveDisabled || this.readonly}
                        aria-label=${this.localize.term('openCalendar')}
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
                    aria-label=${this.localize.term('selectDate')}
                    aria-labelledby=${this.open ? `dp-month-${this._uid}` : nothing}
                    aria-busy=${this.pending ? 'true' : nothing}
                    id="ar-dp-panel-${this._uid}"
                    @keydown=${this._handlePanelKeyDown}
                >
                    ${
                        this.open
                            ? this._renderCalendar(locale, todayLabel, closeLabel, closeAriaLabel)
                            : nothing
                    }
                </div>
            </div>
        `;
    }

    private _renderCalendar(
        locale: string,
        todayLabel: string,
        closeLabel: string,
        closeAriaLabel: string,
    ): TemplateResult {
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
                    part="nav-button prev-year action-button"
                    type="button"
                    aria-label=${this.localize.term('previousYear')}
                    @click=${() => this._nav(() => this._calendar.previousYear())}
                >
                    «
                </button>
                <button
                    part="nav-button prev-month action-button"
                    type="button"
                    aria-label=${this.localize.term('previousMonth')}
                    @click=${() => this._nav(() => this._calendar.previousMonth())}
                >
                    ‹
                </button>
                <span id="dp-month-${this._uid}" aria-live="polite">${monthLabel}</span>
                <button
                    part="nav-button next-month action-button"
                    type="button"
                    aria-label=${this.localize.term('nextMonth')}
                    @click=${() => this._nav(() => this._calendar.nextMonth())}
                >
                    ›
                </button>
                <button
                    part="nav-button next-year action-button"
                    type="button"
                    aria-label=${this.localize.term('nextYear')}
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
                    part="footer-button today-button action-button"
                    type="button"
                    aria-label=${todayLabel}
                    @click=${this._handleTodayClick}
                >
                    <slot name="today-label">${todayLabel}</slot>
                </button>
                <button
                    part="footer-button close-button action-button"
                    type="button"
                    aria-label=${closeAriaLabel}
                    @click=${this._handleCloseClick}
                >
                    <slot name="close-label">${closeLabel}</slot>
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
            ? this.localize.term('daySelected', dayLabelFormat.format(day))
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
                    part="day control"
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

        const previous = this.value;
        this.value = this._toIso(day);

        const formatted = format(day, this.format);
        if (this._input) this._input.value = formatted;

        this._emitChange();
        this._emitNative(previous);
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

    /** Pendant l'ouverture, un mois affiché qui diffère du dernier annoncé est une navigation. */
    private _emitViewChangeOnNavigation(): void {
        if (!this.open) {
            this._emittedViewKey = -1;
            return;
        }
        // -1 : `_show()` n'a pas encore calé le mois d'ouverture, c'est lui qui l'annonce.
        if (this._emittedViewKey !== -1 && this._viewKey() !== this._emittedViewKey) {
            this._emitViewChange();
        }
    }

    private _viewKey(): number {
        const view = this._calendar.currentViewMonth;
        return view.getFullYear() * 12 + view.getMonth();
    }

    private _emitViewChange(): void {
        const view = this._calendar.currentViewMonth;
        this._emittedViewKey = this._viewKey();
        emitEvent<Omit<ArDatepickerViewChangeDetail, 'id'>>(this, 'ar-datepicker-view-change', {
            detail: { year: view.getFullYear(), month: view.getMonth() + 1 },
        });
    }

    private _emitChange(date?: Date | null, valid?: boolean): void {
        const emitDate = date ?? (this.value ? parse(this.value, 'yyyy-MM-dd').date : null);
        const emitValid = valid ?? emitDate !== null;
        const emitValue = emitDate ? this._toIso(emitDate) : null;

        emitEvent<Omit<ArDatepickerInputDetail, 'id'>>(this, 'ar-datepicker-input-change', {
            detail: { value: emitValue, valueAsDate: emitDate, valid: emitValid },
        });
    }

    /**
     * `input` puis `change` natifs sur l'hôte, une fois `value` à jour : c'est ce que `ngModel`,
     * `v-model` ou `onChange` écoutent. Émis seulement si la valeur a changé, jamais pour une
     * valeur posée par l'application.
     */
    private _emitNative(previous: string): void {
        if (this.value === previous) return;
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        this.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /** Vrai si la date sort de `min`/`max` ; faux sans bornes. */
    private _rangeFlag(date: Date | null): 'rangeUnderflow' | 'rangeOverflow' | null {
        if (!date) return null;
        const minDate = this.min ? parse(this.min, 'yyyy-MM-dd').date : null;
        const maxDate = this.max ? parse(this.max, 'yyyy-MM-dd').date : null;
        if (minDate && this._toIso(date) < this._toIso(minDate)) return 'rangeUnderflow';
        if (maxDate && this._toIso(date) > this._toIso(maxDate)) return 'rangeOverflow';
        return null;
    }

    private _toIso(date: Date): string {
        return format(date, 'yyyy-MM-dd');
    }

    private _rangeText(locale: string): string {
        const minDate = this.min ? parse(this.min, 'yyyy-MM-dd').date : null;
        const maxDate = this.max ? parse(this.max, 'yyyy-MM-dd').date : null;
        if (!minDate && !maxDate) return '';

        if (minDate && maxDate) {
            return this.localize.term(
                'dateRangeBetween',
                this._formatOrdinalDate(minDate, locale),
                this._formatOrdinalDate(maxDate, locale),
            );
        }
        if (minDate)
            return this.localize.term('dateRangeFrom', this._formatOrdinalDate(minDate, locale));
        return this.localize.term(
            'dateRangeUntil',
            this._formatOrdinalDate(maxDate as Date, locale),
        );
    }

    /**
     * Formate une date longue, en laissant le terme `formatOrdinalDate` décider d'un marqueur
     * ordinal (ex. « 1er janvier 2026 » en français) — les deux formats Intl (mois/année,
     * jour/mois/année) sont locale-aware et calculés ici, le terme choisit lequel utiliser.
     */
    private _formatOrdinalDate(date: Date, locale: string): string {
        const monthYearText = this._getFormatter(locale, 'month-year', {
            month: 'long',
            year: 'numeric',
        }).format(date);
        const fullDateText = this._getFormatter(locale, 'day-month-year', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date);
        return this.localize.term('formatOrdinalDate', date, monthYearText, fullDateText);
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
        if (this.effectiveDisabled || this.readonly) return;

        const allowed = !emitEvent(this, 'ar-datepicker-show', { cancelable: true })
            .defaultPrevented;
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

        // Après le calage du mois sur la valeur : c'est le mois réellement affiché à l'ouverture.
        this._emitViewChange();

        await this._anchored.show();
        await this.updateComplete;
        this._focusFocusedDay();

        emitEvent(this, 'ar-datepicker-shown');
    }

    private _hide(): void {
        const allowed = !emitEvent(this, 'ar-datepicker-hide', { cancelable: true })
            .defaultPrevented;
        if (!allowed) {
            this._skipNextOpenChange = true;
            this.open = true;
            this._focusTargetAfterHide = null;
            return;
        }

        this._anchored.hide();
        this._focusTargetAfterHide?.focus();
        this._focusTargetAfterHide = null;

        emitEvent(this, 'ar-datepicker-hidden');
    }

    private _handleTriggerClick(): void {
        if (this.effectiveDisabled || this.readonly) return;
        this.open = !this.open;
    }

    private _focusFocusedDay(): void {
        const grid = this.shadowRoot?.querySelector('[part="grid"]');
        const btn = grid?.querySelector<HTMLButtonElement>('[tabindex="0"]');
        btn?.focus();
    }
    private _handleInput(e: Event): void {
        // L'`input` natif de l'<input> interne est composé : il atteindrait l'hôte avec `value`
        // pas encore à jour. L'hôte émet le sien à la validation (_emitNative).
        e.stopPropagation();
        const input = e.target as HTMLInputElement;
        const result = parse(input.value, this.format);

        if (result.complete) {
            emitEvent<Omit<ArDatepickerInputDetail, 'id'>>(this, 'ar-datepicker-input-complete', {
                detail: {
                    value: result.valid && result.date ? this._toIso(result.date) : null,
                    valueAsDate: result.date,
                    valid: result.valid && this._rangeFlag(result.date) === null,
                },
            });

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
        const previous = this.value;
        // Valeur inchangée (typiquement après une sélection calendrier déjà notifiée) : rien à
        // émettre, sauf un texte non vide invalide, dont le consommateur doit être informé.
        if ((isoValue ?? '') === previous && (isoValue !== null || raw === '')) return;
        this.value = isoValue ?? '';

        this._emitChange(result.date, result.valid && this._rangeFlag(result.date) === null);
        this._emitNative(previous);
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
        if (this.effectiveDisabled) {
            this.internals?.setFormValue(null);
            this.setComponentValidity({});
            return;
        }
        this.internals?.setFormValue(this.value || null, this.value || null);
        if (this.required && !this.value) {
            this.setComponentValidity(
                { valueMissing: true },
                this.localize.term('validationValueMissing'),
                this._input ?? undefined,
            );
        } else {
            const date = this.value ? parse(this.value, 'yyyy-MM-dd').date : null;
            const flag = this._rangeFlag(date);
            if (date && flag) {
                const locale = this.localize.lang();
                const bound = this._formatOrdinalDate(
                    parse(flag === 'rangeUnderflow' ? this.min : this.max, 'yyyy-MM-dd')
                        .date as Date,
                    locale,
                );
                const term =
                    flag === 'rangeUnderflow'
                        ? this.localize.term('validationRangeUnderflow', bound)
                        : this.localize.term('validationRangeOverflow', bound);
                this.setComponentValidity({ [flag]: true }, term, this._input ?? undefined);
            } else {
                this.setComponentValidity({});
            }
        }
    }
}
