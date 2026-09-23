import { LitElement } from 'lit';
import { toggleState } from '../utils/internals-state.js';

/**
 * Base LitElement commune à tous les composants `ar-*`. Attache `ElementInternals` en
 * `connectedCallback()` (avant le premier render, après la définition de l'élément — cf.
 * exigence native `attachInternals()`) et expose `this.internals`/`this.toggleState()` sans
 * indirection, sur le modèle de `WebAwesomeElement`
 * (https://github.com/shoelace-style/webawesome/blob/next/packages/webawesome/src/internal/webawesome-element.ts) —
 * cf. #253 pour le raisonnement complet (abandon d'un `ReactiveController` dédié, moins
 * découvrable : `this._states.internals` n'indique pas, à la lecture, que l'accesseur existe).
 *
 * Appliqué à tous les composants, y compris ceux qui n'exposent aucun `:state()` aujourd'hui :
 * `attachInternals()` non exploité n'a aucun effet de bord (rien n'est activé tant qu'on
 * n'appelle pas ses méthodes), et un seul modèle mental (« tout composant `ar-*` a
 * `this.internals`/`this.toggleState()` ») évite une taxonomie à deux niveaux à re-justifier à
 * chaque nouveau composant.
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
