// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { configuredPrefix } from './ariane-config.js';

// Environnement Node : ni `window` ni `document`, comme lors d'un import côté serveur (Next.js).
describe('configuredPrefix', () => {
    afterEach(() => {
        delete globalThis.ARIANE_CONFIG;
    });

    it("n'existe pas de window dans cet environnement", () => {
        expect(typeof window).toBe('undefined');
    });

    it('renvoie undefined sans configuration', () => {
        expect(configuredPrefix()).toBeUndefined();
    });

    it('renvoie undefined quand la configuration ne définit pas de préfixe', () => {
        globalThis.ARIANE_CONFIG = {};
        expect(configuredPrefix()).toBeUndefined();
    });

    it('renvoie le préfixe posé sur globalThis', () => {
        globalThis.ARIANE_CONFIG = { prefix: 'acme' };
        expect(configuredPrefix()).toBe('acme');
    });
});
