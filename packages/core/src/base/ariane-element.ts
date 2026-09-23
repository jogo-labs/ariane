import { LitElement } from 'lit';
import { toggleState } from '../utils/internals-state.js';

/**
 * Base commune à tous les composants `ar-*`. Attache `ElementInternals` en
 * `connectedCallback()` et expose `this.internals`/`this.toggleState()` sans indirection.
 *
 * @internal
 */
export class ArianeElement extends LitElement {
    protected internals: ElementInternals | undefined;

    override connectedCallback(): void {
        super.connectedCallback();
        // `??=` : attachInternals() ne peut être appelé qu'une seule fois par instance —
        // connectedCallback() peut se répéter (déconnexion/reconnexion de l'élément).
        this.internals ??= this.attachInternals?.();
    }

    /**
     * Pose ou retire un `:state()` — cumulatif à un attribut/propriété déjà reflété, jamais un
     * remplacement (cf. #246). Tolère `this.internals` absent (donc un no-op silencieux) :
     * happy-dom (Vitest) n'implémente pas `attachInternals()` du tout, contrairement à un vrai
     * navigateur — `this.internals` y reste toujours `undefined`. Cf. les tests
     * `*.browser.test.ts` des composants pour la couverture réelle du mécanisme.
     */
    protected toggleState(name: string, active: boolean): void {
        toggleState(this.internals, name, active);
    }
}
