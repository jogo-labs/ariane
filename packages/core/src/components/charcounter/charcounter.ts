import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { warn } from '../../utils/warn.js';
import { announceA11y, clearA11yRegion } from '../../a11y/announce-a11y.js';
import styles from './charcounter.styles.js';

export type CharcounterState = 'normal' | 'warning' | 'error';

function pluralize(count: number, label: string): string {
    if (!label.includes('|')) return label;
    const [singular, plural] = label.split('|');
    return Math.abs(count) === 1 ? singular : plural;
}

/**
 * @summary Compteur de caractères restants pour un champ texte accessible.
 *
 * Observe un `<textarea>` ou `<input>` via `for="id"` et affiche le décompte.
 * Passe en état `warning` puis `error` quand la limite approche ou est dépassée.
 * Utiliser `aria-describedby` sur le champ pour lier le counter aux lecteurs d'écran.
 *
 * @slot icon-warning - Icône affichée en état warning.
 * @slot icon-error   - Icône affichée en état error.
 *
 * @csspart container - L'élément racine.
 * @csspart count     - Le bloc chiffre + label.
 * @csspart remaining - Le chiffre des caractères restants.
 * @csspart label     - Le texte après le chiffre (ex: "restants").
 *
 * @cssprop --ar-charcounter-color         - Couleur état normal.
 * @cssprop --ar-charcounter-warning-color - Couleur état warning.
 * @cssprop --ar-charcounter-error-color   - Couleur état error.
 */
export class ArCharcounter extends LitElement {
    static override styles = [styles];
    static readonly NAME = 'ArCharcounter';
    private static _idCounter = 0;

    /** ID du champ observé. Requis. */
    @property({ reflect: true }) for: string | undefined;

    /** Limite de caractères. Requis. */
    @property({ type: Number }) max: number | undefined;

    /** Nombre de caractères restants déclenchant l'état warning. */
    @property({ attribute: 'warn-threshold', reflect: true, type: Number }) warnThreshold = 20;

    /** Texte affiché après le chiffre. Accepte "singulier|pluriel". */
    @property({ reflect: true }) label = 'caractère restant|caractères restants';

    private _count = 0;
    private _state: CharcounterState = 'normal';
    private _errorAnnounceTimer: ReturnType<typeof setTimeout> | undefined;

    private _field: (HTMLInputElement | HTMLTextAreaElement) | null = null;

    /** État courant. Readonly — piloté par le composant. */
    get state(): CharcounterState {
        return this._state;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        if (!this.for) {
            warn('ar-charcounter', "l'attribut for est requis.");
        }
        if (this.max === undefined) {
            warn('ar-charcounter', "l'attribut max est requis.");
        }
        if (this.warnThreshold <= 0) {
            warn('ar-charcounter', 'warn-threshold doit être supérieur à 0.');
        }
        // Attach to the field before the first render so that render() can read
        // the initial field value without needing a second update cycle.
        this._attachField();
    }

    override updated(changed: PropertyValues<this>): void {
        if (changed.has('for')) {
            this._detachField();
            // Defer to next microtask so that requestUpdate() (called in _attachField)
            // runs after _$didUpdate() finishes its change-in-update check.
            queueMicrotask(() => {
                if (!this.isConnected) return;
                this._attachField();
            });
        }
        if (changed.has('max') || changed.has('warnThreshold')) {
            this._computeState();
        }
        if (this._state !== this.getAttribute('state')) {
            this.setAttribute('state', this._state);
        }
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        clearTimeout(this._errorAnnounceTimer);
        this._detachField();
    }

    private _attachField(): void {
        if (!this.for) return;
        const root = this.getRootNode();
        const field = (root as Document | ShadowRoot).getElementById(this.for) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | null;
        if (!field) {
            warn('ar-charcounter', `Aucun élément trouvé avec l'id "${this.for}".`);
            return;
        }
        this._field = field;
        this._count = field.value.length;
        this._computeState();
        this._addAriaDescribedby(field);
        this.requestUpdate();
        field.addEventListener('input', this._handleInput);
    }

    private _detachField(): void {
        if (!this._field) return;
        this._field.removeEventListener('input', this._handleInput);
        this._removeAriaDescribedby(this._field);
        this._clearLinkedAttributes();
        this._field = null;
    }

    private _ensureId(): string {
        if (!this.id) {
            this.id = `ar-charcounter-${++ArCharcounter._idCounter}`;
        }
        return this.id;
    }

    private _addAriaDescribedby(field: HTMLInputElement | HTMLTextAreaElement): void {
        const id = this._ensureId();
        const current = field.getAttribute('aria-describedby') ?? '';
        const ids = current.split(/\s+/).filter(Boolean);
        if (!ids.includes(id)) {
            ids.push(id);
            field.setAttribute('aria-describedby', ids.join(' '));
        }
    }

    private _removeAriaDescribedby(field: HTMLInputElement | HTMLTextAreaElement): void {
        const id = this.id;
        if (!id) return;
        const current = field.getAttribute('aria-describedby') ?? '';
        const ids = current.split(/\s+/).filter((i) => i !== id);
        if (ids.length > 0) {
            field.setAttribute('aria-describedby', ids.join(' '));
        } else {
            field.removeAttribute('aria-describedby');
        }
    }

    private readonly _handleInput = (): void => {
        if (!this._field) return;
        this._count = this._field.value.length;
        this._computeState();
        this.requestUpdate();
    };

    private _computeState(): void {
        if (this.max === undefined) return;
        const remaining = this.max - this._count;
        const warnLimit = this.warnThreshold;
        const prevState = this._state;

        let nextState: CharcounterState;
        if (remaining < 0) {
            nextState = 'error';
        } else if (remaining <= warnLimit) {
            nextState = 'warning';
        } else {
            nextState = 'normal';
        }

        if (nextState !== prevState) {
            this._state = nextState;
            this._announceTransition(nextState, remaining);
            if (nextState === 'normal') {
                this._clearLinkedAttributes();
            } else {
                this._setLinkedAttributes(nextState);
            }
        } else if (nextState === 'error') {
            clearTimeout(this._errorAnnounceTimer);
            this._errorAnnounceTimer = setTimeout(() => {
                this._announceTransition(nextState, remaining);
            }, 300);
        }
    }

    private _announceTransition(state: CharcounterState, remaining: number): void {
        if (state === 'warning') {
            clearA11yRegion('assertive');
            announceA11y(`${remaining} ${pluralize(remaining, this.label)}`, 'polite');
        } else if (state === 'error') {
            const excess = Math.abs(remaining);
            announceA11y(
                `Limite dépassée de ${excess} ${pluralize(excess, 'caractère|caractères')}`,
                'assertive',
            );
        } else {
            clearA11yRegion('assertive');
            clearA11yRegion('polite');
        }
    }

    private _setLinkedAttributes(state: CharcounterState): void {
        if (!this._field) return;
        this._field.setAttribute('data-ar-char-state', state);
        for (const lbl of Array.from((this._field as HTMLInputElement).labels ?? [])) {
            lbl.setAttribute('data-ar-char-state', state);
        }
    }

    private _clearLinkedAttributes(): void {
        if (!this._field) return;
        this._field.removeAttribute('data-ar-char-state');
        for (const lbl of Array.from((this._field as HTMLInputElement).labels ?? [])) {
            lbl.removeAttribute('data-ar-char-state');
        }
    }

    override render(): TemplateResult | typeof nothing {
        if (this.max === undefined) return nothing;
        const remaining = this.max - this._count;
        return html`
            <span part="container">
                <slot name="icon-warning"></slot>
                <slot name="icon-error"></slot>
                <span part="count">
                    <span part="remaining">${remaining}</span>
                    <span part="label"> ${pluralize(remaining, this.label)}</span>
                </span>
            </span>
        `;
    }
}
