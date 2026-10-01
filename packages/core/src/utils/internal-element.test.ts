import { describe, expect, it } from 'vitest';
import { defineInternalElement } from './internal-element.js';

describe('defineInternalElement', () => {
    it('enregistre une sous-classe de la base sous le tag donné', () => {
        class Base extends HTMLElement {}
        defineInternalElement('test-internal-sous-classe', Base);

        const ctor = customElements.get('test-internal-sous-classe');
        expect(ctor).toBeDefined();
        expect(ctor).not.toBe(Base);
        expect(ctor!.prototype).toBeInstanceOf(Base);
    });

    it('crée des instances qui sont des instanceof de la base', () => {
        class Base extends HTMLElement {}
        defineInternalElement('test-internal-instance', Base);

        const el = document.createElement('test-internal-instance');
        expect(el).toBeInstanceOf(Base);
    });

    it('est idempotent : un second appel ne redéfinit rien et ne lève pas', () => {
        class Base extends HTMLElement {}
        defineInternalElement('test-internal-idempotent', Base);
        const first = customElements.get('test-internal-idempotent');

        expect(() => defineInternalElement('test-internal-idempotent', Base)).not.toThrow();
        expect(customElements.get('test-internal-idempotent')).toBe(first);
    });

    it('laisse la classe de base enregistrable sous un autre nom, avant comme après', () => {
        class Base extends HTMLElement {}
        defineInternalElement('test-internal-base-libre', Base);

        expect(() => customElements.define('test-consommateur-base-libre', Base)).not.toThrow();
        expect(customElements.get('test-consommateur-base-libre')).toBe(Base);
    });

    it("n'écrase pas un élément déjà défini sous ce tag", () => {
        class Existing extends HTMLElement {}
        class Base extends HTMLElement {}
        customElements.define('test-internal-deja-defini', Existing);

        defineInternalElement('test-internal-deja-defini', Base);

        expect(customElements.get('test-internal-deja-defini')).toBe(Existing);
    });
});
