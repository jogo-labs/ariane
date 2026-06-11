import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { warn } from '../../utils/warn.js';
import { announceA11y } from '../../a11y/announce-a11y.js';
import styles from './charcounter.styles.js';

export type CharcounterState = 'normal' | 'warning' | 'error';

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
@customElement('ar-charcounter')
export class ArCharcounter extends LitElement {
    static override styles = [styles];
    static readonly NAME = 'ArCharcounter';

    /** ID du champ observé. Requis. */
    @property({ reflect: true }) for = '';

    /** Limite de caractères. Requis — warn dev et rendu vide si absent. */
    @property({ type: Number }) max?: number | undefined;

    /** Pourcentage restant déclenchant l'état warning (défaut : 20). */
    @property({ attribute: 'warn-threshold', reflect: true, type: Number }) warnThreshold = 20;

    /** Texte affiché après le chiffre (défaut : "restants"). */
    @property({ reflect: true }) label = 'restants';

    private _count = 0;
    private _state: CharcounterState = 'normal';

    private _field: (HTMLInputElement | HTMLTextAreaElement) | null = null;

    /** État courant. Readonly — piloté par le composant. */
    get state(): CharcounterState {
        return this._state;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        if (this.max === undefined) {
            warn('ar-charcounter', "l'attribut max est requis.");
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
            queueMicrotask(() => this._attachField());
        }
        if (changed.has('max') || changed.has('warnThreshold')) {
            this._computeState();
        }
        this.setAttribute('state', this._state);
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
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
        this.requestUpdate();
        field.addEventListener('input', this._handleInput);
    }

    private _detachField(): void {
        if (!this._field) return;
        this._field.removeEventListener('input', this._handleInput);
        this._clearLinkedAttributes();
        this._field = null;
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
        const warnLimit = Math.floor((this.max * this.warnThreshold) / 100);
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
        }
    }

    private _announceTransition(state: CharcounterState, remaining: number): void {
        if (state === 'warning') {
            announceA11y(`${remaining} ${this.label}`, 'polite');
        } else if (state === 'error') {
            announceA11y('Limite dépassée', 'assertive');
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
                    <span part="label"> ${this.label}</span>
                </span>
            </span>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ar-charcounter': ArCharcounter;
    }
}
