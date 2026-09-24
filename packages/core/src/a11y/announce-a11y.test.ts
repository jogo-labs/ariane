import { afterEach, describe, expect, it } from 'vitest';
import { announceA11y, clearA11yRegion } from './announce-a11y.js';

describe('announceA11y', () => {
    afterEach(() => {
        document.querySelectorAll('[data-ar-live-region]').forEach((el) => el.remove());
    });

    it('crée une région assertive globale dans le document', async () => {
        announceA11y('Action bloquée.', 'assertive');
        await new Promise((resolve) => setTimeout(resolve, 60));

        const region = document.getElementById('ar-live-region-assertive');
        expect(region).not.toBeNull();
        expect(region?.getAttribute('aria-live')).toBe('assertive');
        expect(region?.textContent).toBe('Action bloquée.');
    });

    it('réutilise la même région pour plusieurs annonces', async () => {
        announceA11y('Premier message.', 'assertive');
        await new Promise((resolve) => setTimeout(resolve, 60));
        announceA11y('Second message.', 'assertive');
        await new Promise((resolve) => setTimeout(resolve, 60));

        const regions = document.querySelectorAll('#ar-live-region-assertive');
        expect(regions).toHaveLength(1);
        expect(regions[0]?.textContent).toBe('Second message.');
    });

    it('ignore les messages vides', async () => {
        announceA11y('   ', 'assertive');
        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(document.getElementById('ar-live-region-assertive')).toBeNull();
    });
});

describe('clearA11yRegion', () => {
    afterEach(() => {
        document.querySelectorAll('[data-ar-live-region]').forEach((el) => el.remove());
    });

    it('vide le contenu de la région assertive', async () => {
        announceA11y('Limite dépassée', 'assertive');
        await new Promise((resolve) => setTimeout(resolve, 60));

        clearA11yRegion('assertive');

        const region = document.getElementById('ar-live-region-assertive');
        expect(region?.textContent).toBe('');
    });

    it('est sans effet si la région nexiste pas encore', () => {
        expect(() => clearA11yRegion('assertive')).not.toThrow();
    });
});
