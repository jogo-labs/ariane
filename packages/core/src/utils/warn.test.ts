import { afterEach, describe, expect, it, vi } from 'vitest';
import { warn } from './warn.js';

describe('warn', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('affiche un warning console préfixé par le tag', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        warn('ar-collapse', 'for et slot="trigger" sont tous les deux définis.');

        expect(spy).toHaveBeenCalledOnce();
        expect(spy).toHaveBeenCalledWith(
            '[ar-collapse] for et slot="trigger" sont tous les deux définis.',
        );
    });

    it('logue un message distinct à chaque appel, sans déduplication', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        warn('ar-dialog', 'Message A.');
        warn('ar-dialog', 'Message A.');

        expect(spy).toHaveBeenCalledTimes(2);
    });
});
