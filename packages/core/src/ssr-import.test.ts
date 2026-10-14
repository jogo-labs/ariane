// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import côté serveur (Next.js, SSR) : il n'y a ni `window` ni `document`. L'import doit rester
// inoffensif ; il ne promet pas le rendu des composants côté serveur.
describe('import sans DOM (serveur)', () => {
    beforeEach(() => {
        vi.resetModules();
    });
    afterEach(() => {
        delete globalThis.ARIANE_CONFIG;
    });

    it("l'environnement n'a ni window ni document", () => {
        expect(typeof window).toBe('undefined');
        expect(typeof document).toBe('undefined');
    });

    it('le barrel principal est importable', async () => {
        const barrel = await import('./index.js');
        expect(barrel.whenAllDefined).toBeTypeOf('function');
        expect(barrel.registerTranslation).toBeTypeOf('function');
    });

    it('le préfixe posé sur globalThis est honoré côté serveur aussi', async () => {
        globalThis.ARIANE_CONFIG = { prefix: 'srv' };
        await import('./index.js');
        // Le registre global (`customElements`) survit à vi.resetModules() : on vérifie seulement
        // que le tag au préfixe configuré existe, ce que rien d'autre ne définit dans ce fichier.
        expect(customElements.get('srv-alert')).toBeDefined();
    });
});
