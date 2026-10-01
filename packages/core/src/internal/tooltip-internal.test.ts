import { describe, expect, it } from 'vitest';
import { ArTooltip } from '../components/tooltip/tooltip.js';
import { ArTooltipInternal, defineInternalTooltip } from './tooltip-internal.js';

describe('tooltip-internal', () => {
    // Doit rester le premier test : importer le module ne doit rien enregistrer.
    it("n'enregistre rien à l'import", () => {
        expect(customElements.get('ariane-internal-tooltip')).toBeUndefined();
    });

    it("ArTooltipInternal est une sous-classe distincte d'ArTooltip", () => {
        expect(ArTooltipInternal).not.toBe(ArTooltip);
        expect(ArTooltipInternal.prototype).toBeInstanceOf(ArTooltip);
    });

    it('defineInternalTooltip enregistre ArTooltipInternal sous le tag privé', () => {
        defineInternalTooltip();
        expect(customElements.get('ariane-internal-tooltip')).toBe(ArTooltipInternal);
    });

    it('le tag privé ne commence pas par « ar- » (pas de collision de préfixe)', () => {
        expect('ariane-internal-tooltip'.startsWith('ar-')).toBe(false);
    });

    it('est idempotent : un second appel ne redéfinit rien et ne lève pas', () => {
        defineInternalTooltip();
        expect(() => defineInternalTooltip()).not.toThrow();
        expect(customElements.get('ariane-internal-tooltip')).toBe(ArTooltipInternal);
    });

    it('laisse ArTooltip enregistrable sous le tag du consommateur, après defineInternalTooltip', () => {
        defineInternalTooltip();
        let error = '';
        try {
            customElements.define('test-tooltip-consommateur', ArTooltip);
        } catch (e) {
            error = (e as Error).name;
        }
        expect(error).toBe('');
        expect(customElements.get('test-tooltip-consommateur')).toBe(ArTooltip);
    });
});
