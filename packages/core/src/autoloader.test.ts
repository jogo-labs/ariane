/**
 * autoloader.test.ts
 *
 * Teste le comportement de l'autoloader : détection des custom elements dans le DOM,
 * déclenchement des imports dynamiques, et déduplication des chargements.
 *
 * L'autoloader maintient un Set `loaded` persistant dans le module.
 * Les tests sont ordonnés pour refléter cet état cumulatif.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockButtonImport = vi.fn().mockResolvedValue({});

vi.mock('./components/button/button.js', () => {
    mockButtonImport();
    return {};
});

// Import de l'autoloader après le mock — l'observer s'attache à document.body
await import('./autoloader.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function appendElement(tag: string): Element {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    return el;
}

/** Attend que les microtasks + MutationObserver soient résolus. */
const tick = () => new Promise((r) => setTimeout(r, 50));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('autoloader', () => {
    afterEach(() => {
        document.body.querySelectorAll('ar-button, ar-unknown').forEach((el) => el.remove());
        mockButtonImport.mockClear();
    });

    it('charge le module quand un composant connu est ajouté au DOM', async () => {
        appendElement('ar-button');
        await tick();

        expect(mockButtonImport).toHaveBeenCalledTimes(1);
    });

    it('ne recharge pas le module si ar-button est ajouté une seconde fois (loaded Set)', async () => {
        // ar-button est dans loaded depuis le test précédent (module partagé)
        appendElement('ar-button');
        await tick();

        expect(mockButtonImport).not.toHaveBeenCalled();
    });

    it('ne charge pas de module pour un tag inconnu de COMPONENT_MAP', async () => {
        appendElement('ar-unknown');
        await tick();

        expect(mockButtonImport).not.toHaveBeenCalled();
    });

    it('ne charge pas de module pour un élément HTML natif sans tiret', async () => {
        const el = document.createElement('button');
        document.body.appendChild(el);
        await tick();
        el.remove();

        expect(mockButtonImport).not.toHaveBeenCalled();
    });

    it("ne charge pas de module pour un élément natif avec attribut (ex: <input type='text'>)", async () => {
        const el = document.createElement('input');
        el.setAttribute('type', 'text');
        document.body.appendChild(el);
        await tick();
        el.remove();

        expect(mockButtonImport).not.toHaveBeenCalled();
    });
});
