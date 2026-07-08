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

const mockAlertImport = vi.fn().mockResolvedValue({});

vi.mock('./components/alert/alert.js', () => {
    mockAlertImport();
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
        document.body.querySelectorAll('ar-alert, ar-unknown').forEach((el) => el.remove());
        mockAlertImport.mockClear();
    });

    it('charge le module quand un composant connu est ajouté au DOM', async () => {
        appendElement('ar-alert');
        await tick();

        expect(mockAlertImport).toHaveBeenCalledTimes(1);
    });

    it('ne recharge pas le module si ar-alert est ajouté une seconde fois (loaded Set)', async () => {
        // ar-alert est dans loaded depuis le test précédent (module partagé)
        appendElement('ar-alert');
        await tick();

        expect(mockAlertImport).not.toHaveBeenCalled();
    });

    it('ne charge pas de module pour un tag inconnu de COMPONENT_MAP', async () => {
        appendElement('ar-unknown');
        await tick();

        expect(mockAlertImport).not.toHaveBeenCalled();
    });

    it('ne charge pas de module pour un élément HTML natif sans tiret', async () => {
        const el = document.createElement('button');
        document.body.appendChild(el);
        await tick();
        el.remove();

        expect(mockAlertImport).not.toHaveBeenCalled();
    });

    it("ne charge pas de module pour un élément natif avec attribut (ex: <input type='text'>)", async () => {
        const el = document.createElement('input');
        el.setAttribute('type', 'text');
        document.body.appendChild(el);
        await tick();
        el.remove();

        expect(mockAlertImport).not.toHaveBeenCalled();
    });
});

// ─── Préfixe configurable via window.ARIANE_CONFIG ─────────────────────────────

describe('autoloader — préfixe configurable', () => {
    afterEach(() => {
        delete window.ARIANE_CONFIG;
        document.body.innerHTML = '';
        vi.resetModules();
    });

    it('charge un composant sous le tag ar-x par défaut sans config', async () => {
        document.body.innerHTML = '<ar-spinner></ar-spinner>';
        await import('./autoloader.js');
        await customElements.whenDefined('ar-spinner');
        expect(customElements.get('ar-spinner')).toBeDefined();
    });

    it('charge un composant sous le préfixe configuré via window.ARIANE_CONFIG', async () => {
        window.ARIANE_CONFIG = { prefix: 'acme' };
        document.body.innerHTML = '<acme-spinner></acme-spinner>';
        await import('./autoloader.js');
        await customElements.whenDefined('acme-spinner');
        expect(customElements.get('acme-spinner')).toBeDefined();
    });

    it("charge un composant composé (stepper + stepper-item) sous un préfixe personnalisé et l'enfant est bien retrouvé par le parent", async () => {
        window.ARIANE_CONFIG = { prefix: 'acme' };
        document.body.innerHTML =
            '<acme-stepper current-path="/a"><acme-stepper-item path="/a" label="A"></acme-stepper-item></acme-stepper>';
        await import('./autoloader.js');

        await customElements.whenDefined('acme-stepper');
        await customElements.whenDefined('acme-stepper-item');

        expect(customElements.get('acme-stepper')).toBeDefined();
        expect(customElements.get('acme-stepper-item')).toBeDefined();

        const StepperItemClass = customElements.get('acme-stepper-item');
        const item = document.querySelector('acme-stepper-item');
        expect(item).toBeInstanceOf(StepperItemClass);

        const stepper = document.querySelector('acme-stepper') as HTMLElement & {
            updateComplete: Promise<boolean>;
        };
        // Laisse le temps au fallback collectExistingItems() / au contexte de s'enregistrer
        // et au rebuildTree() (queueMicrotask) de reconstruire l'arbre de navigation.
        await stepper.updateComplete;
        await stepper.updateComplete;
        await tick();

        // Preuve que le parent a bien retrouvé son enfant sous le préfixe custom :
        // le <nav part="nav"> n'est rendu que lorsque navigation.tree contient des étapes,
        // ce qui exige que le lookup interne (hardcodé 'ar-stepper-item' avant le fix) ait
        // fonctionné sous le préfixe 'acme'.
        expect(stepper.shadowRoot?.querySelector('[part="nav"]')).not.toBeNull();
    });
});
