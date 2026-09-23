import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { toggleState } from '../utils/internals-state.js';

/**
 * Reactive controller qui centralise `attachInternals()` + la pose d'états `:state()`
 * cumulés à un attribut/propriété déjà reflétée (cf. #246/#251) — évite de répéter le champ
 * `_internals` et l'appel `attachInternals()` dans `connectedCallback()` sur chaque composant
 * qui expose des `:state()`.
 */
export class InternalsStatesController implements ReactiveController {
    private host: ReactiveControllerHost & HTMLElement;
    private _internals: ElementInternals | undefined;

    constructor(host: ReactiveControllerHost & HTMLElement) {
        (this.host = host).addController(this);
    }

    hostConnected(): void {
        // `??=` : attachInternals() ne peut être appelé qu'une seule fois par instance —
        // hostConnected() peut se répéter (déconnexion/reconnexion du host).
        this._internals ??= this.host.attachInternals?.();
    }

    /**
     * Pose ou retire un `:state()`. Tolère `internals`/`internals.states` absents : jsdom
     * (Vitest) implémente `attachInternals()` sans `CustomStateSet`, contrairement à un vrai
     * navigateur — cf. les tests `*.browser.test.ts` des composants pour la couverture réelle.
     */
    toggle(name: string, active: boolean): void {
        toggleState(this._internals, name, active);
    }

    /**
     * L'instance `ElementInternals` sous-jacente, pour un composant `formAssociated` qui a
     * aussi besoin de `setFormValue()`/`setValidity()` (ex. ar-datepicker) — évite un second
     * `attachInternals()`, impossible (une seule instance par élément, quel que soit l'appelant).
     */
    get internals(): ElementInternals | undefined {
        return this._internals;
    }
}
