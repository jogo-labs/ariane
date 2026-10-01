import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent } from './define-component.js';

// Chaque test utilise des noms de tags uniques : un tag ne peut être défini qu'une fois par page,
// et une classe ne peut être enregistrée que sous un seul nom.
function setPrefix(prefix: string | undefined): void {
    window.ARIANE_CONFIG = prefix === undefined ? {} : { prefix };
}

describe('defineComponent', () => {
    afterEach(() => {
        delete window.ARIANE_CONFIG;
    });

    it('sans configuration, enregistre le tag par défaut', () => {
        class El extends HTMLElement {}
        defineComponent('ar-dc-defaut', El);
        expect(customElements.get('ar-dc-defaut')).toBe(El);
    });

    it('avec ARIANE_CONFIG.prefix, enregistre le tag préfixé et non le tag par défaut', () => {
        setPrefix('x');
        class El extends HTMLElement {}
        defineComponent('ar-dc-prefixe', El);
        expect(customElements.get('x-dc-prefixe')).toBe(El);
        expect(customElements.get('ar-dc-prefixe')).toBeUndefined();
    });

    it('conserve les tirets du nom (ar-table-sort → x-table-sort)', () => {
        setPrefix('x');
        class El extends HTMLElement {}
        defineComponent('ar-dc-nom-compose', El);
        expect(customElements.get('x-dc-nom-compose')).toBe(El);
    });

    it('utilise tel quel un préfixe qui contient un tiret (acme-ui)', () => {
        setPrefix('acme-ui');
        class El extends HTMLElement {}
        defineComponent('ar-dc-prefixe-tiret', El);
        expect(customElements.get('acme-ui-dc-prefixe-tiret')).toBe(El);
    });

    it("sans configuration, le préfixe du tag par défaut est celui d'un fork (ft-)", () => {
        class El extends HTMLElement {}
        defineComponent('ft-dc-fork', El);
        expect(customElements.get('ft-dc-fork')).toBe(El);
    });

    it('est idempotent : un tag déjà défini est conservé, sans erreur', () => {
        class First extends HTMLElement {}
        class Second extends HTMLElement {}
        defineComponent('ar-dc-idempotent', First);
        expect(() => defineComponent('ar-dc-idempotent', Second)).not.toThrow();
        expect(customElements.get('ar-dc-idempotent')).toBe(First);
    });

    it('une configuration sans préfixe équivaut à aucune configuration', () => {
        setPrefix(undefined);
        class El extends HTMLElement {}
        defineComponent('ar-dc-config-vide', El);
        expect(customElements.get('ar-dc-config-vide')).toBe(El);
    });
});
