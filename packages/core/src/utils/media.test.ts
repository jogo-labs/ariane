import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion } from './media.js';

describe('prefersReducedMotion', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('retourne true quand la media query correspond', () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: true,
        } as MediaQueryList);

        expect(prefersReducedMotion()).toBe(true);
    });

    it('retourne false quand la media query ne correspond pas', () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: false,
        } as MediaQueryList);

        expect(prefersReducedMotion()).toBe(false);
    });

    it('interroge la media query prefers-reduced-motion: reduce', () => {
        const spy = vi
            .spyOn(window, 'matchMedia')
            .mockReturnValue({ matches: false } as MediaQueryList);

        prefersReducedMotion();

        expect(spy).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('retourne false si window.matchMedia est indisponible', () => {
        const original = window.matchMedia;
        // @ts-expect-error - simule un environnement sans matchMedia
        delete window.matchMedia;

        expect(prefersReducedMotion()).toBe(false);

        window.matchMedia = original;
    });
});
