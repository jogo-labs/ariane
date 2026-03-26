import { afterEach, describe, expect, it, vi } from 'vitest';
import { whenAllDefined } from './when-all-defined.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function appendElement(tag: string): Element {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    return el;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('whenAllDefined', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('résout immédiatement si aucun élément ar-* dans le DOM', async () => {
        const result = await whenAllDefined();
        expect(result).toEqual([]);
    });

    it('appelle customElements.whenDefined pour chaque tag ar-* unique', async () => {
        appendElement('ar-alert');
        appendElement('ar-spinner');
        appendElement('ar-alert'); // doublon — ne doit appeler whenDefined qu'une fois

        const spy = vi
            .spyOn(customElements, 'whenDefined')
            .mockResolvedValue(class {} as CustomElementConstructor);

        await whenAllDefined();

        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith('ar-alert');
        expect(spy).toHaveBeenCalledWith('ar-spinner');
    });

    it("ignore les éléments natifs sans tiret (ex: 'div', 'span')", async () => {
        appendElement('div');
        appendElement('span');

        const spy = vi
            .spyOn(customElements, 'whenDefined')
            .mockResolvedValue(class {} as CustomElementConstructor);

        await whenAllDefined();

        expect(spy).not.toHaveBeenCalled();
    });

    it('ignore les éléments avec un préfixe différent', async () => {
        appendElement('my-button');
        appendElement('ar-alert');

        const spy = vi
            .spyOn(customElements, 'whenDefined')
            .mockResolvedValue(class {} as CustomElementConstructor);

        await whenAllDefined();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith('ar-alert');
        expect(spy).not.toHaveBeenCalledWith('my-button');
    });

    it('accepte un préfixe personnalisé', async () => {
        appendElement('my-button');
        appendElement('ar-alert');

        const spy = vi
            .spyOn(customElements, 'whenDefined')
            .mockResolvedValue(class {} as CustomElementConstructor);

        await whenAllDefined('my-');

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith('my-button');
        expect(spy).not.toHaveBeenCalledWith('ar-alert');
    });
});
