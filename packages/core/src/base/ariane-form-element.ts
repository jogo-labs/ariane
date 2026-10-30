import type { PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ArianeElement } from './ariane-element.js';

/** `validity` de repli quand `ElementInternals` n'existe pas (happy-dom, avant la connexion). */
const VALID_STATE = Object.freeze({
    badInput: false,
    customError: false,
    patternMismatch: false,
    rangeOverflow: false,
    rangeUnderflow: false,
    stepMismatch: false,
    tooLong: false,
    tooShort: false,
    typeMismatch: false,
    valid: true,
    valueMissing: false,
}) as ValidityState;

/**
 * Base pour un composant participant à un `<form>` natif (ex. `ar-datepicker`). Pose
 * `formAssociated = true`, porte `name`, `disabled` et `required` (réfléchis en attributs, comme un
 * contrôle natif : un contrôle associé n'entre dans `FormData` que par son attribut `name`), la
 * cascade `<fieldset disabled>`, l'API de validation standard déléguée à `ElementInternals`, et la
 * réinitialisation par `form.reset()`.
 *
 * Un composant dérivé signale sa validité avec `setComponentValidity()` (jamais directement avec
 * `internals.setValidity()`, qui écraserait une erreur posée par `setCustomValidity()`), et surcharge
 * `formReset()` pour revenir à sa valeur initiale.
 *
 * Pose `:state(required)` et `:state(optional)` (selon `required`), `:state(user-invalid)` et
 * `:state(user-valid)`, que la plateforme n'applique pas à un élément associé à un formulaire. Les
 * deux derniers suivent la validité une fois le champ « touché » : un appel de
 * `markInteracted()` par le composant dérivé quand l'utilisateur valide une valeur (jamais pour
 * une valeur posée par l'application), une tentative de soumission (événement `invalid`) ou
 * `reportValidity()`. `form.reset()` retire l'interaction.
 *
 * @internal
 */
export class ArianeFormElement extends ArianeElement {
    static formAssociated = true;

    /** Identifie le champ dans `FormData`. */
    @property({ reflect: true, useDefault: true }) name = '';

    /** Désactive le champ et exclut sa valeur du formulaire. */
    @property({ reflect: true, type: Boolean }) disabled = false;

    /** Active la contrainte de validation native `required`. */
    @property({ reflect: true, type: Boolean }) required = false;

    /**
     * Désactivé par cascade d'un `<fieldset disabled>` ancêtre (`formDisabledCallback`), distinct de
     * `disabled` (posé explicitement par le consommateur) pour ne pas refléter cet état sur
     * l'attribut HTML `disabled` de l'hôte et ne pas perdre l'origine si les deux divergent.
     */
    @state() protected _formDisabled = false;

    private _componentFlags: ValidityStateFlags = {};
    private _componentMessage: string | undefined;
    private _componentAnchor: HTMLElement | undefined;
    private _customMessage = '';
    private _interacted = false;
    private _silentCheck = false;

    constructor() {
        super();
        // Tentative de soumission : le navigateur émet `invalid` sur chaque champ invalide. Un
        // `checkValidity()` programmatique en émet aussi, mais n'est pas une interaction.
        this.addEventListener('invalid', () => {
            if (!this._silentCheck) this.markInteracted();
        });
    }

    /** `disabled` explicite ou hérité d'un `<fieldset disabled>` ancêtre. */
    protected get effectiveDisabled(): boolean {
        return this.disabled || this._formDisabled;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        // `internals` n'existe qu'à partir d'ici : applique ce qui a été posé avant la connexion.
        this._applyValidity();
    }

    override updated(changed: PropertyValues<this>): void {
        super.updated(changed);
        this.toggleState('required', this.required);
        this.toggleState('optional', !this.required);
        this._syncValidationStates();
    }

    /**
     * Appelé par le navigateur quand un `<fieldset disabled>` ancêtre change d'état.
     * @internal
     */
    formDisabledCallback(disabled: boolean): void {
        this._formDisabled = disabled;
    }

    /**
     * Appelé par le navigateur sur `form.reset()`.
     * @internal
     */
    formResetCallback(): void {
        this._interacted = false;
        this._syncValidationStates();
        this.requestUpdate();
        this.formReset();
    }

    /**
     * Marque le champ comme touché par l'utilisateur : `:state(user-invalid)` et
     * `:state(user-valid)` suivent alors sa validité. À appeler quand l'utilisateur a modifié le
     * champ en validant une valeur, ou l'a modifié puis quitté sans que la valeur change.
     */
    protected markInteracted(): void {
        if (this._interacted) return;
        this._interacted = true;
        this._syncValidationStates();
        this.requestUpdate();
    }

    /** Vrai une fois le champ « touché » (voir `markInteracted()`), faux après `form.reset()`. */
    protected get interacted(): boolean {
        return this._interacted;
    }

    /** Message posé par `setCustomValidity()`, vide si aucune erreur personnalisée. */
    protected get customValidityMessage(): string {
        return this._customMessage;
    }

    /** Remet le champ à sa valeur initiale. Sans effet par défaut : à surcharger. */
    protected formReset(): void {}

    // ── API de validation standard (déléguée à ElementInternals) ────────────

    /** État de validité du champ (`ValidityState`). */
    get validity(): ValidityState {
        return this.internals?.validity ?? VALID_STATE;
    }

    /** Message de validité courant, vide si le champ est valide. */
    get validationMessage(): string {
        return this.internals?.validationMessage ?? '';
    }

    /** Vrai si le champ est soumis à la validation (faux s'il est désactivé). */
    get willValidate(): boolean {
        return this.internals?.willValidate ?? false;
    }

    /** Le formulaire propriétaire, ou `null`. */
    get form(): HTMLFormElement | null {
        return this.internals?.form ?? null;
    }

    /** Les `<label>` associés au champ. */
    get labels(): NodeList {
        return this.internals?.labels ?? document.createDocumentFragment().childNodes;
    }

    /** Renvoie `true` si le champ est valide ; émet `invalid` sinon. */
    checkValidity(): boolean {
        this._silentCheck = true;
        try {
            return this.internals?.checkValidity() ?? true;
        } finally {
            this._silentCheck = false;
        }
    }

    /** Comme `checkValidity()`, et affiche le message de validation du navigateur. */
    reportValidity(): boolean {
        this.markInteracted();
        return this.internals?.reportValidity() ?? true;
    }

    /**
     * Pose une erreur de validation personnalisée (par exemple une erreur de serveur). Elle persiste,
     * comme sur un `<input>` natif, jusqu'à `setCustomValidity('')`, y compris après `form.reset()`
     * et après une nouvelle saisie.
     */
    setCustomValidity(message: string): void {
        this._customMessage = message;
        this._applyValidity();
        this.requestUpdate();
    }

    /**
     * Signale la validité propre au composant. Fusionné avec l'erreur personnalisée éventuelle.
     * `{}` signifie valide ; un drapeau vrai exige un message non vide (sinon `setValidity` lève).
     */
    protected setComponentValidity(flags: Record<never, never>): void;
    protected setComponentValidity(
        flags: ValidityStateFlags,
        message: string,
        anchor?: HTMLElement,
    ): void;
    protected setComponentValidity(
        flags: ValidityStateFlags,
        message?: string,
        anchor?: HTMLElement,
    ): void {
        this._componentFlags = flags;
        this._componentMessage = message;
        this._componentAnchor = anchor;
        this._applyValidity();
    }

    private _applyValidity(): void {
        const internals = this.internals;
        if (!internals) return;
        if (this._customMessage) {
            internals.setValidity(
                { ...this._componentFlags, customError: true },
                this._customMessage,
                this._componentAnchor,
            );
        } else {
            internals.setValidity(
                this._componentFlags,
                this._componentMessage,
                this._componentAnchor,
            );
        }
        this._syncValidationStates();
    }

    /** Comme le natif, un champ désactivé n'est ni valide ni invalide (`willValidate` faux). */
    private _syncValidationStates(): void {
        const internals = this.internals;
        const active = this._interacted && internals?.willValidate === true;
        const valid = internals?.validity?.valid ?? true;
        this.toggleState('user-invalid', active && !valid);
        this.toggleState('user-valid', active && valid);
    }
}
