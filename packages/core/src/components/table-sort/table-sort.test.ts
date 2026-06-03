import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArTableSort } from './table-sort.js';
import { fixture, getPart } from '../../test-utils.js';
import './table-sort.js';

// ─── Aide-mémoire tests Lit ────────────────────────────────────────────────────
//
// fixture(html)          — monte un élément dans le DOM et attend le premier rendu
// waitForUpdate(el)      — attend le prochain cycle de rendu après une mutation
// getPart(el, 'name')    — retourne un part="name" du Shadow DOM (| null)
//                          → utiliser pour les assertions .toBeNull() / .not.toBeNull()
// requirePart(el, 'name')— idem, mais lance une erreur si absent
//                          → utiliser quand on enchaîne .getAttribute, .classList, etc.
//
// ⚠ happy-dom ne sérialise pas les Text nodes dynamiques Lit en textContent.
//   Tester le contenu textuel via la propriété JS (el.myProp) plutôt que textContent.
//
// ⚠ Les propriétés ARIA assignées via .ariaCurrent, .ariaExpanded, etc. (liaisons
//   Lit) ne reflètent pas en attribut HTML dans happy-dom. Tester la propriété
//   JS : (el as unknown as { ariaCurrent: string }).ariaCurrent.
//
// ─── Éléments à tester selon le type de composant ─────────────────────────────
//
// Composant standard (avec Shadow DOM) :
//   - Rendu : shadowRoot non null, parts présents (getPart)
//   - Valeurs par défaut : vérifier chaque propriété à l'état initial
//   - Attributs reflect : el.prop = x → await waitForUpdate → el.getAttribute(...)
//   - Comportement : interactions (clic, événements custom)
//   - Accessibilité : role, aria-*, labels sr-only
//
// Sous-composant (sans Shadow DOM, createRenderRoot → this) :
//   - shadowRoot est null
//   - setRegistry() appelle registerItem / unregisterItem
//   - disconnectedCallback() appelle unregisterItem
//   - updated() appelle notifyItemChanged après le premier rendu seulement
// ──────────────────────────────────────────────────────────────────────────────

describe('ArTableSort', () => {
    let el: ArTableSort;

    afterEach(() => el?.remove());

    // ── Rendu ─────────────────────────────────────────────────────────────────

    describe('rendu', () => {
        beforeEach(async () => {
            el = await fixture('<ar-table-sort></ar-table-sort>');
        });

        it('monte un shadow DOM', () => {
            expect(el.shadowRoot).not.toBeNull();
        });

        it('contient un élément racine avec part="base"', () => {
            expect(getPart(el, 'base')).not.toBeNull();
        });
    });

    // ── Valeurs par défaut ────────────────────────────────────────────────────

    // describe('valeurs par défaut', () => { ... });

    // ── Propriétés ────────────────────────────────────────────────────────────

    // describe('propriétés', () => { ... });
});
