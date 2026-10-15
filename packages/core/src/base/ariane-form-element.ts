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
 * @internal
 */
export class ArianeFormElement extends ArianeElement {
    static formAssociated = true;

    /** Identifie le champ dans `FormData`. */
    @property({ reflect: true }) name = '';

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

    /** `disabled` explicite ou hérité d'un `<fieldset disabled>` ancêtre. */
    protected get effectiveDisabled(): boolean {
        return this.disabled || this._formDisabled;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        // `internals` n'existe qu'à partir d'ici : applique ce qui a été posé avant la connexion.
        this._applyValidity();
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
        this.formReset();
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
        return this.internals?.checkValidity() ?? true;
    }

    /** Comme `checkValidity()`, et affiche le message de validation du navigateur. */
    reportValidity(): boolean {
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
    }

    /**
     * Signale la validité propre au composant (par exemple `{ valueMissing: true }` avec son message).
     * Fusionné avec l'erreur personnalisée éventuelle. `{}` signifie valide.
     */
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
    }
}
